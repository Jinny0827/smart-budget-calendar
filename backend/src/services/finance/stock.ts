import axios from 'axios';
import { getTicker } from './ticker';

async function fetchYfChart(symbol: string) {
    try {
        const { data } = await axios.get(
            `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=5d&interval=15m`,
            { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 10000 }
        );
        return data.chart?.result?.[0] ?? null;
    } catch {
        return null;
    }
}

function parseStockData(data: any) {
    try {
        const meta       = data.meta;
        const quote      = data.indicators.quote[0];
        const closeList  = (quote.close  as number[]).filter(Boolean);
        const highList   = (quote.high   as number[]).filter(Boolean);
        const lowList    = (quote.low    as number[]).filter(Boolean);
        const volList    = (quote.volume as number[]).filter(Boolean);
        if (!closeList.length) return null;

        const current   = closeList[closeList.length - 1];
        const prevClose = meta.previousClose ?? closeList[0];
        const half      = Math.floor(volList.length / 2);
        const volFirst  = volList.slice(0, half).reduce((a, b) => a + b, 0) / (half || 1);
        const volLast   = volList.slice(half).reduce((a, b) => a + b, 0) / (volList.length - half || 1);

        return {
            current_price:    Math.round(current * 100) / 100,
            prev_close:       Math.round(prevClose * 100) / 100,
            change_pct:       Math.round((current - prevClose) / prevClose * 10000) / 100,
            high_5d:          Math.max(...highList),
            low_5d:           Math.min(...lowList),
            trend_5d:         current > closeList[0] * 1.02 ? '상승' : current < closeList[0] * 0.98 ? '하락' : '횡보',
            volume_trend:     volLast > volFirst * 1.1 ? '증가' : volLast < volFirst * 0.9 ? '감소' : '보합',
            market_cap_억원:  meta.marketCap ? Math.floor(meta.marketCap / 100_000_000) : null,
            week52_high:      meta.fiftyTwoWeekHigh ?? null,
            week52_low:       meta.fiftyTwoWeekLow  ?? null,
        };
    } catch {
        return null;
    }
}

export async function getStockPrice(stockCode: string) {
    for (const suffix of ['.KS', '.KQ']) {
        const data = await fetchYfChart(`${stockCode}${suffix}`);
        if (data?.indicators) {
            const result = parseStockData(data);
            if (result) return result;
        }
    }
    return null;
}

export async function getUsStockPrice(query: string) {
    const ticker = await getTicker(query);
    if (!ticker) return null;

    const data = await fetchYfChart(ticker);
    if (!data?.timestamp) return null;

    const result = parseStockData(data);
    if (result) (result as any).ticker = ticker;
    return result;
}
