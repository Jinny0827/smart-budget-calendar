import {
    getCompanyInfo,
    getFinancialStatementsMulti,
    getDisclosures,
    getMajorShareholders,
    getDividendInfo,
    getSectorNews,
    getCorpCode,
    getStockCode,
    loadCorpList
} from './dart';
import {getCik, getUsCompanyInfo, getUsFinancialStatementsMulti, getUsDisclosures, loadCikMap} from './sec';
import { getStockPrice, getUsStockPrice } from './stock';
import { generateStockInsight } from './groqFinance';
import StockCache from '../../models/StockCache';

const ANALYZE_TTL = 60 * 60 * 1000; // 1시간

export async function analyzeCompany(query: string, market: string, year: string) {
    const cacheKey = `analyze:${query}:${market}:${year}`;

    const cached = await StockCache.findOne({ key: cacheKey, expiresAt: { $gt: new Date() } }).lean() as any;
    if (cached) return cached.data;

    let result: any;

    if (market === 'us') {
        const cik = await getCik(query);
        if (!cik) throw new Error('미국 상장 기업을 찾을 수 없습니다');

        const [companyInfo, financial, disclosures, stockData] = await Promise.all([
            getUsCompanyInfo(cik),
            getUsFinancialStatementsMulti(cik, year),
            getUsDisclosures(cik),
            getUsStockPrice(query),
        ]) as any[];
        const sectorNews: any[] = [];

        const insight = await generateStockInsight(companyInfo, financial, disclosures as any[], sectorNews, stockData);
        result = {
            company_info: companyInfo,
            financial,
            disclosures,
            stock_data:  stockData,
            insight,
        };

    } else {
        const corpCode  = await getCorpCode(query);
        const stockCode = await getStockCode(query);
        if (!corpCode) throw new Error('기업을 찾을 수 없습니다');

        const [companyInfo, financial, disclosures, shareholders, dividend] = await Promise.all([
            getCompanyInfo(query),
            getFinancialStatementsMulti(corpCode, year),
            getDisclosures(corpCode),
            getMajorShareholders(corpCode),
            getDividendInfo(corpCode),
        ]) as any[];
        const stockData = stockCode ? await getStockPrice(stockCode) : null;

        const sectorNews = await getSectorNews((companyInfo as any)?.induty_code ?? '', (companyInfo as any)?.corp_name ?? query);
        const insight    = await generateStockInsight(companyInfo, financial, disclosures as any[], sectorNews, stockData);
        result = {
            company_info: companyInfo,
            financial,
            disclosures,
            shareholders,
            dividend,
            stock_data:  stockData,
            sector_news: sectorNews,
            insight,
        };
    }

    await StockCache.findOneAndUpdate(
        { key: cacheKey },
        { key: cacheKey, data: result, expiresAt: new Date(Date.now() + ANALYZE_TTL) },
        { upsert: true }
    );

    return result;
}

export async function autocomplete(query: string, market: string) {
    if (market === 'us') {
        const map = await loadCikMap();
        const q   = query.toUpperCase();
        const tickerMatch = Object.keys(map).filter(k => k.startsWith(q) && k.length <= 5);
        const nameMatch   = Object.keys(map).filter(k => k.includes(q) && k.length > 5 && !tickerMatch.includes(k));
        return [...tickerMatch, ...nameMatch].slice(0, 10);
    } else {
        const list = await loadCorpList();
        const starts   = Object.keys(list).filter(k => k.startsWith(query));
        const contains = Object.keys(list).filter(k => k.includes(query) && !k.startsWith(query));
        return [...starts, ...contains].slice(0, 10);
    }
}

export { getStockPrice, getUsStockPrice } from './stock';
export { generatePortfolioInsight } from './groqFinance';
export { loadCikMap } from './sec';
export { loadCorpList } from './dart';
