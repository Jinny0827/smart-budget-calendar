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

        // regularMarketPrice: 실시간(지연) 현재가 / 15분봉 마지막 close는 오래된 값일 수 있음
        const current   = meta.regularMarketPrice ?? closeList[closeList.length - 1];
        const prevClose = meta.regularMarketPreviousClose ?? meta.previousClose ?? closeList[0];
        const changePct = meta.regularMarketChangePercent != null
            ? Math.round(meta.regularMarketChangePercent * 100) / 100
            : Math.round((current - prevClose) / prevClose * 10000) / 100;

        const half     = Math.floor(volList.length / 2);
        const volFirst = volList.slice(0, half).reduce((a: number, b: number) => a + b, 0) / (half || 1);
        const volLast  = volList.slice(half).reduce((a: number, b: number) => a + b, 0) / (volList.length - half || 1);

        return {
            current_price:   Math.round(current * 100) / 100,
            prev_close:      Math.round(prevClose * 100) / 100,
            change_pct:      changePct,
            high_5d:         Math.max(...highList),
            low_5d:          Math.min(...lowList),
            trend_5d:        current > closeList[0] * 1.02 ? '상승' : current < closeList[0] * 0.98 ? '하락' : '횡보',
            volume_trend:    volLast > volFirst * 1.1 ? '증가' : volLast < volFirst * 0.9 ? '감소' : '보합',
            market_cap_억원: meta.marketCap ? Math.floor(meta.marketCap / 100_000_000) : null,
            week52_high:     meta.fiftyTwoWeekHigh ?? null,
            week52_low:      meta.fiftyTwoWeekLow  ?? null,
        };
    } catch {
        return null;
    }
}

// Yahoo Finance 거래소 코드
const KR_EXCHANGE: Record<string, string[]> = {
    '.KS': ['KSC', 'KSE'],
    '.KQ': ['KOQ'],
};

// exchange: DART corp_cls 기반 힌트 ('KS' | 'KQ') — 전달 시 해당 거래소만 시도
export async function getStockPrice(stockCode: string, exchange?: 'KS' | 'KQ') {
    const suffixes: string[] = exchange ? [`.${exchange}`] : ['.KS', '.KQ'];

    for (const suffix of suffixes) {
        const symbol = `${stockCode}${suffix}`;
        const data = await fetchYfChart(symbol);
        if (!data?.indicators) continue;

        // exchange 힌트 없을 때만 거래소 코드 검증 (혼입 방지)
        if (!exchange) {
            const exCode = data.meta?.exchange ?? '';
            if (exCode && !KR_EXCHANGE[suffix].includes(exCode)) continue;
        }

        const result = parseStockData(data);
        if (result) {
            (result as any).symbol = symbol;
            (result as any).suffix = suffix;
            return result;
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

// v7 quote API는 crumb/쿠키 이슈로 빈값 반환이 잦음
// → 이미 안정적으로 동작하는 v8 chart API(fetchYfChart)를 병렬 호출로 대체
export async function getBatchStockPrices(symbols: string[]): Promise<Record<string, any>> {
    if (!symbols.length) return {};

    const settled = await Promise.allSettled(
        symbols.map(async (symbol) => {
            const data = await fetchYfChart(symbol);
            if (!data?.indicators) return null;
            const parsed = parseStockData(data);
            if (!parsed) return null;
            return { symbol, ...parsed };
        })
    );

    const result: Record<string, any> = {};
    symbols.forEach((symbol, i) => {
        const r = settled[i];
        if (r.status === 'fulfilled' && r.value) {
            result[symbol] = r.value;
        }
    });
    return result;
}