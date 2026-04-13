import axios from 'axios';
import StockCache from '../../models/StockCache';

const GROQ_API_KEY = process.env.GROQ_API_KEY!;
const GROQ_URL     = 'https://api.groq.com/openai/v1/chat/completions';
const CACHE_TTL    = 30 * 24 * 60 * 60 * 1000; // 30일

async function groqSingle(query: string): Promise<string | null> {
    try {
        const res = await axios.post(GROQ_URL, {
            model: 'llama-3.3-70b-versatile',
            messages: [{ role: 'user', content: `"${query}"의 미국 주식 티커를 JSON으로 반환해. 없으면 null. {"ticker": "AAPL"}` }],
            temperature: 0,
            response_format: { type: 'json_object' },
        }, { headers: { Authorization: `Bearer ${GROQ_API_KEY}` }, timeout: 15000 });

        return res.data.choices[0].message.content
            ? JSON.parse(res.data.choices[0].message.content).ticker ?? null
            : null;
    } catch {
        return null;
    }
}

async function fetchYfSearch(query: string): Promise<string | null> {
    try {
        const { data } = await axios.get(`https://query2.finance.yahoo.com/v1/finance/search?q=${query}`, {
            headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 10000,
        });
        // 거래소 코드 검사 로직을 제거하여 ETF 검색 안정성 확보
        const result = (data.quotes ?? []).find(
            (q: any) => (q.quoteType === 'EQUITY' || q.quoteType === 'ETF')
        );
        return result?.symbol ?? null;
    } catch {
        return null;
    }
}

export async function getTicker(query: string): Promise<string | null> {
    const cacheKey = `ticker:${query}`;
    const cached   = await StockCache.findOne({ key: cacheKey, expiresAt: { $gt: new Date() } }).lean() as any;
    if (cached) return (cached.data as any).ticker;

    const ticker = await groqSingle(query) ?? await fetchYfSearch(query);
    if (ticker) {
        await StockCache.findOneAndUpdate(
            { key: cacheKey },
            { key: cacheKey, data: { ticker }, expiresAt: new Date(Date.now() + CACHE_TTL) },
            { upsert: true }
        );
    }
    return ticker;
}
