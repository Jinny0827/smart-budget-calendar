import axios from 'axios';
import StockCache from '../../models/StockCache';
import { getTicker } from './ticker';

const SEC_HEADERS = { 'User-Agent': 'smart-budget foryou930827@gmail.com' };
const CIK_LIST_TTL = 24 * 60 * 60 * 1000;

const INCOME_CONCEPTS: Record<string, string[]> = {
    revenue:          ['Revenues', 'RevenueFromContractWithCustomerExcludingAssessedTax', 'SalesRevenueNet'],
    operating_profit: ['OperatingIncomeLoss'],
    net_income:       ['NetIncomeLoss', 'NetIncomeLossAvailableToCommonStockholdersBasic'],
};
const BALANCE_CONCEPTS: Record<string, string[]> = {
    total_assets:        ['Assets'],
    total_liabilities:   ['Liabilities'],
    total_equity:        ['StockholdersEquity', 'StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest'],
    current_assets:      ['AssetsCurrent'],
    current_liabilities: ['LiabilitiesCurrent'],
};
const CASHFLOW_CONCEPTS: Record<string, string[]> = {
    operating_cf: ['NetCashProvidedByUsedInOperatingActivities'],
    investing_cf: ['NetCashProvidedByUsedInInvestingActivities'],
    financing_cf: ['NetCashProvidedByUsedInFinancingActivities'],
};

// ── CIK 맵 ───────────────────────────────────────────────
export async function loadCikMap(): Promise<Record<string, string>> {
    const cached = await StockCache.findOne({ key: 'sec:cik_map', expiresAt: { $gt: new Date() } }).lean() as any;
    if (cached) return cached.data as any;

    try {
        const { data: raw } = await axios.get('https://www.sec.gov/files/company_tickers.json', {
            headers: SEC_HEADERS, timeout: 15000,
        });

        const cikMap: Record<string, string> = {};
        for (const item of Object.values(raw) as any[]) {
            const cik = String(item.cik_str).padStart(10, '0');
            cikMap[item.ticker.toUpperCase()] = cik;
            cikMap[item.title.toUpperCase()]  = cik;
        }

        await StockCache.findOneAndUpdate(
            { key: 'sec:cik_map' },
            { key: 'sec:cik_map', data: cikMap, expiresAt: new Date(Date.now() + CIK_LIST_TTL) },
            { upsert: true }
        );

        return cikMap;
    } catch {
        return {};
    }
}

export async function getCik(query: string): Promise<string | null> {
    try {
        const map = await loadCikMap();
        const key = query.toUpperCase();
        if (map[key]) return map[key];

        const ticker = await getTicker(query);
        if (ticker && map[ticker.toUpperCase()]) return map[ticker.toUpperCase()];

        return null;
    } catch {
        return null;
    }
}

// ── 기업 정보 ─────────────────────────────────────────────
export async function getUsCompanyInfo(cik: string) {
    try {
        const { data } = await axios.get(`https://data.sec.gov/submissions/CIK${cik}.json`, {
            headers: SEC_HEADERS, timeout: 15000,
        });

        return {
            corp_name:       data.name ?? 'Unknown',
            cik,
            ticker:          data.tickers?.[0] ?? null,
            exchange:        data.exchanges?.[0] ?? null,
            sic:             data.sic ?? null,
            sic_description: data.sicDescription ?? null,
            state:           data.stateOfIncorporation ?? null,
            fiscal_year_end: data.fiscalYearEnd ?? null,
            market:          'US',
            entity_type:     data.entityType ?? null,   // 'operating company' | 'investment company' 등
        };
    } catch {
        return { corp_name: 'Unknown', cik, market: 'US' };
    }
}

// ── 재무제표 ──────────────────────────────────────────────
function formatUsd(val: number) {
    const million = Math.floor(val / 1_000_000);
    return { raw: val, 백만달러: million, 표시: `$${million.toLocaleString()}M` };
}

function findValue(factsGaap: any, concepts: string[], year: string) {
    for (const concept of concepts) {
        const entries = factsGaap?.[concept]?.units?.USD ?? [];
        for (const entry of entries) {
            if (entry.form === '10-K' && entry.fp === 'FY' && entry.end?.startsWith(year)) {
                return formatUsd(entry.val);
            }
        }
    }
    return null;
}

// ETF·투자회사는 XBRL companyfacts가 없어 404 반환 → {} 리턴으로 정상 처리
export async function getUsFinancialStatementsMulti(cik: string, baseYear: string) {
    const cacheKey = `sec:facts:${cik}`;
    let factsGaap: any;

    const cached = await StockCache.findOne({ key: cacheKey, expiresAt: { $gt: new Date() } }).lean() as any;
    if (cached) {
        factsGaap = cached.data;
    } else {
        try {
            const { data } = await axios.get(`https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`, {
                headers: SEC_HEADERS, timeout: 30000,
            });
            factsGaap = data.facts?.['us-gaap'] ?? {};
            await StockCache.findOneAndUpdate(
                { key: cacheKey },
                { key: cacheKey, data: factsGaap, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) },
                { upsert: true }
            );
        } catch {
            // ETF나 투자회사처럼 XBRL 재무제표가 없는 경우 → 빈 객체 반환
            return {};
        }
    }

    const result: Record<string, any> = {};
    for (let i = 2; i >= 0; i--) {
        const year = String(parseInt(baseYear) - i);
        const yr: any = { income_statement: {}, balance_sheet: {}, cash_flow: {} };

        for (const [field, concepts] of Object.entries(INCOME_CONCEPTS)) {
            const val = findValue(factsGaap, concepts, year);
            if (val) yr.income_statement[field] = val;
        }
        for (const [field, concepts] of Object.entries(BALANCE_CONCEPTS)) {
            const val = findValue(factsGaap, concepts, year);
            if (val) yr.balance_sheet[field] = val;
        }
        for (const [field, concepts] of Object.entries(CASHFLOW_CONCEPTS)) {
            const val = findValue(factsGaap, concepts, year);
            if (val) yr.cash_flow[field] = val;
        }

        if (Object.values(yr).some((v: any) => Object.keys(v).length > 0)) result[year] = yr;
    }
    return result;
}

// ── 공시 ─────────────────────────────────────────────────
const ITEM_MAP: Record<string, string> = {
    '2.02': '실적 발표', '5.02': '임원 선임/해임', '2.01': '자산 취득/처분',
    '1.01': '중요 계약 체결', '5.01': '지배주주 변경', '3.02': '유가증권 미등록 판매',
};
const FORM_MAP: Record<string, string> = {
    '10-K': '연간보고서 (10-K)', '10-Q': '분기보고서 (10-Q)',
    'SC 13G': '대량보유 보고 (SC 13G)', 'SC 13D': '대량보유 보고 (SC 13D)',
};

export async function getUsDisclosures(cik: string) {
    try {
        const { data } = await axios.get(`https://data.sec.gov/submissions/CIK${cik}.json`, {
            headers: SEC_HEADERS, timeout: 15000,
        });

        const recent      = data.filings?.recent ?? {};
        const forms       = recent.form ?? [];
        const dates       = recent.filingDate ?? [];
        const accns       = recent.accessionNumber ?? [];
        const items       = recent.items ?? [];
        const targetForms = new Set(['10-K', '10-Q', '8-K', 'SC 13G', 'SC 13D', 'SC 13G/A', 'SC 13D/A', 'N-CEN', 'N-PORT']);
        const oneYearAgo  = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

        const result: any[] = [];
        for (let i = 0; i < forms.length; i++) {
            if (!targetForms.has(forms[i])) continue;
            if (new Date(dates[i]) < oneYearAgo) continue;

            const form  = forms[i];
            const item  = items[i] ?? '';
            const title = form === '8-K' && item
                ? `수시공시 (8-K) - ${ITEM_MAP[item] ?? `항목 ${item}`}`
                : FORM_MAP[form] ?? form;

            result.push({ date: dates[i].replace(/-/g, ''), title, form, rcept_no: accns[i] });
        }
        return result;
    } catch {
        return [];
    }
}
