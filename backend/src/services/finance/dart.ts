import axios from 'axios';
import AdmZip from 'adm-zip';
import { parseStringPromise } from 'xml2js';
import StockCache from '../../models/StockCache';


const DART_API_KEY = process.env.DART_API_KEY!;
const DART_BASE_URL = 'https://opendart.fss.or.kr/api';
const CORP_LIST_TTL = 24 * 60 * 60 * 1000; // 24시간


// 기업 목록 로드
export async function loadCorpList(): Promise<Record<string, { corp_code: string; stock_code: string }>> {
    const cached = await StockCache.findOne({ key: 'dart:corp_list', expiresAt: { $gt: new Date() } }).lean() as any;
    if (cached) return cached.data as any;

    if (!DART_API_KEY) throw new Error('DART_API_KEY가 설정되지 않았습니다');

    const res = await axios.get(`${DART_BASE_URL}/corpCode.xml`, {
        params: { crtfc_key: DART_API_KEY },
        responseType: 'arraybuffer',
    });

    const buf = Buffer.from(res.data as ArrayBuffer);
    if (buf.length < 100) throw new Error(`DART API 응답 오류: ${buf.toString()}`);

    const zip = new AdmZip(buf);
    const xml = zip.readAsText('CORPCODE.xml');
    const parsed = await parseStringPromise(xml);

    const corpDict: Record<string, { corp_code: string; stock_code: string }> = {};
    for (const corp of parsed.result.list) {
        const name = corp.corp_name?.[0]?.trim() ?? '';
        const code = corp.corp_code?.[0]?.trim() ?? '';
        const stock = corp.stock_code?.[0]?.trim() ?? '';

        corpDict[name] = { corp_code: code, stock_code: stock };
        if (stock) corpDict[stock] = { corp_code: code, stock_code: stock };
    }

    await StockCache.findOneAndUpdate(
        { key: 'dart:corp_list' },
        { key: 'dart:corp_list', data: corpDict, expiresAt: new Date(Date.now() + CORP_LIST_TTL) },
        { upsert: true }
    );

    return corpDict;
}

export async function getCorpCode(query: string): Promise<string | null> {
    const list = await loadCorpList();
    return list[query]?.corp_code ?? null;
}

export async function getStockCode(query: string): Promise<string | null> {
    const list = await loadCorpList();
    return list[query]?.stock_code ?? null;
}


// 기업 기본 정보
export async function getCompanyInfo(query: string) {
    const corpCode = await getCorpCode(query);
    if (!corpCode) return null;

    const { data } = await axios.get(`${DART_BASE_URL}/company.json`, {
        params: { crtfc_key: DART_API_KEY, corp_code: corpCode },
    });

    if (data.status !== '000') return null;

    return {
        corp_name:   data.corp_name,
        corp_code:   data.corp_code,
        stock_code:  data.stock_code,
        ceo_nm:      data.ceo_nm,
        induty_code: data.induty_code,
        est_dt:      data.est_dt,
        listing_dt:  data.listing_dt,
        corp_cls:    data.corp_cls,  // 'Y'=KOSPI, 'K'=KOSDAQ, 'N'=KONEX
    };
}


// 재무 재표 (단년)
function formatAmount(amountStr: string) {
    try {
        const amount = parseInt(amountStr.replace(/,/g, ''), 10);
        const 억 = Math.floor(amount / 100_000_000);
        return { raw: amount, 억원: 억, 표시: `${억.toLocaleString()}억원` };
    } catch {
        return { raw: 0, 억원: 0, 표시: 'N/A' };
    }
}


export async function getFinancialStatements(corpCode: string, year: string) {
    const { data } = await axios.get(`${DART_BASE_URL}/fnlttSinglAcntAll.json`, {
        params: {
            crtfc_key: DART_API_KEY,
            corp_code: corpCode,
            bsns_year: year,
            reprt_code: '11011',
            fs_div: 'CFS',
        },
    });

    if (data.status !== '000') return null;

    const result: any = { income_statement: {}, balance_sheet: {}, cash_flow: {} };

    for (const item of data.list ?? []) {
        const accountId = item.account_id?.trim() ?? '';
        const amount    = item.thstrm_amount?.trim() ?? '';
        const sjDiv     = item.sj_div ?? '';
        if (!amount) continue;

        if (['IS', 'CIS'].includes(sjDiv)) {
            if (accountId === 'ifrs-full_Revenue'                                        && !result.income_statement.revenue)
                result.income_statement.revenue          = formatAmount(amount);
            if (accountId === 'dart_OperatingIncomeLoss'                                 && !result.income_statement.operating_profit)
                result.income_statement.operating_profit = formatAmount(amount);
            if (accountId === 'ifrs-full_ProfitLossAttributableToOwnersOfParent'         && !result.income_statement.net_income)
                result.income_statement.net_income       = formatAmount(amount);
        } else if (sjDiv === 'BS') {
            if (accountId === 'ifrs-full_Assets')             result.balance_sheet.total_assets         = formatAmount(amount);
            if (accountId === 'ifrs-full_Liabilities')        result.balance_sheet.total_liabilities    = formatAmount(amount);
            if (accountId === 'ifrs-full_Equity')             result.balance_sheet.total_equity         = formatAmount(amount);
            if (accountId === 'ifrs-full_CurrentAssets')      result.balance_sheet.current_assets       = formatAmount(amount);
            if (accountId === 'ifrs-full_CurrentLiabilities') result.balance_sheet.current_liabilities  = formatAmount(amount);
        } else if (sjDiv === 'CF') {
            if (accountId === 'ifrs-full_CashFlowsFromUsedInOperatingActivities')  result.cash_flow.operating_cf = formatAmount(amount);
            if (accountId === 'ifrs-full_CashFlowsFromUsedInInvestingActivities')  result.cash_flow.investing_cf = formatAmount(amount);
            if (accountId === 'ifrs-full_CashFlowsFromUsedInFinancingActivities')  result.cash_flow.financing_cf = formatAmount(amount);
        }
    }

    return result;
}


export async function getFinancialStatementsMulti(corpCode: string, baseYear: string) {
    const result: Record<string, any> = {};
    for (let i = 2; i >= 0; i--) {
        const year = String(parseInt(baseYear) - i);
        const data = await getFinancialStatements(corpCode, year);
        if (data) result[year] = data;
    }
    return result;
}


// 공시

export async function getDisclosures(corpCode: string) {
    const today       = new Date();
    const oneYearAgo  = new Date(today);
    oneYearAgo.setFullYear(today.getFullYear() - 1);
    const fmt = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, '');

    const targets = [
        { code: 'B001', keywords: ['유상증자', '무상증자', '자기주식', '합병', '분할', '주식소각'] },
        { code: 'D001', keywords: ['주식등의대량보유'] },
        { code: 'I',    keywords: ['배당', '실적', '계약', '수주', '공급'] },
    ];

    const result: any[] = [];
    const seen = new Set<string>();

    for (const target of targets) {
        const params: any = {
            crtfc_key:  DART_API_KEY,
            corp_code:  corpCode,
            bgn_de:     fmt(oneYearAgo),
            end_de:     fmt(today),
            page_count: 100,
        };
        if (['B001', 'D001'].includes(target.code)) params.pblntf_detail_ty = target.code;
        else params.pblntf_ty = target.code;

        const { data } = await axios.get(`${DART_BASE_URL}/list.json`, { params });
        if (data.status !== '000') continue;

        for (const item of data.list ?? []) {
            const title   = item.report_nm?.trim() ?? '';
            const rcept   = item.rcept_no;
            if (!target.keywords.some(k => title.includes(k)) || seen.has(rcept)) continue;
            seen.add(rcept);
            result.push({ date: item.rcept_dt, title, rcept_no: rcept });
        }
    }

    return result.sort((a, b) => b.date.localeCompare(a.date));
}


// 주요 주주
export async function getMajorShareholders(corpCode: string) {
    const year = new Date().getFullYear();
    for (const bsns_year of [String(year), String(year - 1)]) {
        const { data } = await axios.get(`${DART_BASE_URL}/hyslrSttus.json`, {
            params: { crtfc_key: DART_API_KEY, corp_code: corpCode, bsns_year, reprt_code: '11011' },
        });
        if (data.status !== '000') continue;
        return {
            shareholders: data.list.map((item: any) => ({
                name:     item.nm,
                relation: item.relate,
                shares:   item.trmend_posesn_stock_co,
                ratio:    item.trmend_posesn_stock_qota_rt,
            })),
        };
    }
    return { shareholders: [] };
}

// 배당
export async function getDividendInfo(corpCode: string) {
    const currentYear = new Date().getFullYear();
    const result: any[] = [];

    for (let y = currentYear - 1; y >= currentYear - 3; y--) {
        const { data } = await axios.get(`${DART_BASE_URL}/alotMatter.json`, {
            params: { crtfc_key: DART_API_KEY, corp_code: corpCode, bsns_year: String(y), reprt_code: '11011' },
        });
        if (data.status !== '000') continue;

        const yearData: any = { year: String(y) };
        for (const item of data.list ?? []) {
            const se = item.se ?? '';
            if (se.includes('주당 현금배당금') && se.includes('보통주')) yearData.dividend_per_share = item.thstrm;
            if (se.includes('현금배당금총액'))  yearData.total_dividend  = item.thstrm;
            if (se.includes('현금배당성향'))    yearData.dividend_ratio  = item.thstrm;
            if (se.includes('현금배당수익률') && se.includes('보통주')) yearData.dividend_yield = item.thstrm;
        }
        if (Object.keys(yearData).length > 1) result.push(yearData);
    }
    return result;
}

// 섹터 뉴스
const SECTOR_MAP: Record<string, string> = {
    '264': '반도체', '265': '디스플레이', '263': '전자부품',
    '261': 'IT', '271': '통신', '281': '자동차', '201': '화학',
    '301': '바이오', '101': '철강', '151': '건설', '401': '금융',
};

export async function getSectorNews(indutyCode: string, corpName: string) {
    const cacheKey = `dart:news:${indutyCode}`;
    const cached = await StockCache.findOne({ key: cacheKey, expiresAt: { $gt: new Date() } }).lean() as any;
    if (cached) return cached.data;

    const sector = SECTOR_MAP[indutyCode] ?? corpName;
    const clientId     = process.env.NAVER_CLIENT_ID;
    const clientSecret = process.env.NAVER_CLIENT_SECRET;
    if (!clientId || !clientSecret) return [];

    const { data } = await axios.get('https://openapi.naver.com/v1/search/news.json', {
        headers: { 'X-Naver-Client-Id': clientId, 'X-Naver-Client-Secret': clientSecret },
        params:  { query: `${sector} 주식 시장`, display: 5, sort: 'date' },
    });

    const newsList = (data.items ?? []).map((item: any) => ({
        title:       item.title.replace(/<\/?b>|&quot;/g, ''),
        pubDate:     item.pubDate,
        description: item.description.replace(/<\/?b>|&quot;/g, ''),
    }));

    await StockCache.findOneAndUpdate(
        { key: cacheKey },
        { key: cacheKey, data: newsList, expiresAt: new Date(Date.now() + 60 * 60 * 1000) },
        { upsert: true }
    );

    return newsList;
}