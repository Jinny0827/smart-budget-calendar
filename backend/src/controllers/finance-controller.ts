import { Request, Response } from 'express';
import { analyzeCompany, autocomplete, getStockPrice, getUsStockPrice, generatePortfolioInsight, getBatchStockPrices, getExchangeRate } from '../services/finance/index';
import UserStock from '../models/UserStock';
import UserFinanceMeta from '../models/UserFinanceMeta';


// 기업 분석
export const analyze = async (req: Request, res: Response): Promise<void> => {
    const { query, market = 'kr', year = String(new Date().getFullYear() - 1), force } = req.query as Record<string, string>;
    if (!query) {
        res.status(400).json({ error: 'query 파라미터가 필요합니다' });
        return;
    }

    try {
        // 검색 히스토리 저장 (로그인 유저만)
        const userId = (req as any).userId;
        if (userId) {
            await UserFinanceMeta.findOneAndUpdate(
                { userId },
                {
                    $push: {
                        searchHistory: {
                            $each: [{ query, market, searchedAt: new Date() }],
                            $slice: -10,
                            $sort: { searchedAt: 1 },
                        },
                    },
                },
                { upsert: true }
            ).catch(() => {}); // 히스토리 저장 실패해도 분석은 계속
        }

        const data = await analyzeCompany(query, market, year, force === 'true');
        res.json(data);
    } catch (e: any) {
        const message = e.message ?? '분석 중 오류가 발생했습니다';
        res.status(404).json({ error: message });
    }
}

// 주가 조회
export const stock = async (req: Request, res: Response): Promise<void> => {
    const { query, market = 'kr' } = req.query as Record<string, string>;
    if (!query) { res.status(400).json({ error: 'query 파라미터가 필요합니다' }); return; }

    const data = market === 'us' ? await getUsStockPrice(query) : await getStockPrice(query);
    if (!data) { res.status(404).json({ error: '주가 데이터를 가져올 수 없습니다' }); return; }
    res.json(data);
};


// 자동 완성
export const autoComplete = async (req: Request, res: Response): Promise<void> => {
    const { query = '', market = 'kr' } = req.query as Record<string, string>;
    const data = await autocomplete(query, market);
    res.json(data);
};

// 관심/보유 종목 목록
export const getStocks = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).userId;
        const { type } = req.query as Record<string, string>;

        const filter: any = { userId };
        if (type === 'watchlist' || type === 'portfolio') filter.type = type;

        const list = await UserStock.find(filter).sort({ addedAt: -1 });
        res.json(list);
    } catch (e: any) {
        res.status(500).json({ error: e.message ?? '목록 조회 실패' });
    }
};

// 종목 추가
export const addStock = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).userId;
        const { corpName, ticker, symbol, corp_code, market, type, quantity, avgPrice, currency } = req.body;

        if (type === 'portfolio' && (quantity == null || avgPrice == null)) {
            res.status(400).json({ error: '보유 종목은 quantity, avgPrice가 필요합니다' });
            return;
        }

        // symbol("005930.KS" or "TSLA")에서 stock_code, suffix 분리
        let stock_code: string;
        let suffix: string | undefined;

        if (market === 'kr' && symbol?.includes('.')) {
            const dotIndex = symbol.lastIndexOf('.');
            stock_code = symbol.slice(0, dotIndex);
            suffix     = symbol.slice(dotIndex);
        } else {
            stock_code = symbol ?? ticker;
            suffix     = undefined;
        }

        const item = await UserStock.findOneAndUpdate(
            { userId, ticker, market },
            { userId, corpName, ticker, stock_code, suffix, corp_code, market, type, quantity, avgPrice, currency, updatedAt: new Date() },
            { upsert: true, new: true }
        );
        res.status(201).json(item);
    } catch (e: any) {
        res.status(500).json({ error: e.message ?? '종목 추가 실패' });
    }
};

// 종목 수정
export const updateStock = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).userId;
        const { id }  = req.params;

        const item = await UserStock.findOneAndUpdate(
            { _id: id, userId },
            { ...req.body, updatedAt: new Date() },
            { new: true }
        );
        if (!item) { res.status(404).json({ error: '종목을 찾을 수 없습니다' }); return; }
        res.json(item);
    } catch (e: any) {
        res.status(500).json({ error: e.message ?? '종목 수정 실패' });
    }
};

// 종목 삭제
export const removeStock = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).userId;
        const { id }  = req.params;

        await UserStock.findOneAndDelete({ _id: id, userId });
        res.json({ success: true });
    } catch (e: any) {
        res.status(500).json({ error: e.message ?? '종목 삭제 실패' });
    }
};

// 검색 히스토리
export const getSearchHistory = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).userId;
        const meta   = await UserFinanceMeta.findOne({ userId });
        res.json(meta?.searchHistory ?? []);
    } catch (e: any) {
        res.status(500).json({ error: e.message ?? '히스토리 조회 실패' });
    }
};

// 환율 조회
export const exchangeRate = async (_req: Request, res: Response): Promise<void> => {
    try {
        const data = await getExchangeRate();
        if (!data) { res.status(503).json({ error: '환율 조회 실패' }); return; }
        res.json(data);
    } catch (e: any) {
        res.status(500).json({ error: e.message ?? '환율 조회 실패' });
    }
};

export const getBatchPrices = async (req: Request, res: Response): Promise<void> => {
    try {
        const { symbols } = req.query as { symbols: string };

        if (!symbols) {
            res.status(400).json({ error: 'symbols 파라미터가 필요합니다' });
            return;
        }

        const symbolList = symbols.split(',').map(s => s.trim()).filter(Boolean);
        const data = await getBatchStockPrices(symbolList);
        res.json(data);
    } catch (e: any) {
        res.status(500).json({ error: e.message ?? '주가 조회 실패' });
    }
}

// 유저 포트폴리오 종합 인사이트
export const getPortfolioInsight = async (req: Request, res: Response): Promise<void> => {
    const userId = (req as any).userId;

    const holdings = await UserStock.find({ userId, type: 'portfolio' });
    if (!holdings.length) {
        res.status(400).json({ error: '보유 종목이 없습니다' });
        return;
    }

    const currentTickers = holdings.map(h => h.ticker).sort().join(',');
    const meta           = await UserFinanceMeta.findOne({ userId });
    const savedInsight   = meta?.portfolioInsight;

    // 종목 변경 없고 1시간 이내면 캐시 반환
    if (
        savedInsight &&
        savedInsight.basedOn.sort().join(',') === currentTickers &&
        new Date().getTime() - new Date(savedInsight.generatedAt).getTime() < 60 * 60 * 1000
    ) {
        res.json(savedInsight);
        return;
    }

    // 현재 주가 조회 후 인사이트 생성
    const holdingsWithPrice = await Promise.all(
        holdings.map(async h => {
            const priceData = h.market === 'us'
                ? await getUsStockPrice(h.ticker)
                : h.stock_code ? await getStockPrice(h.stock_code) : null;
            return {
                corpName:     h.corpName,
                ticker:       h.ticker,
                market:       h.market,
                quantity:     h.quantity ?? 0,
                avgPrice:     h.avgPrice ?? 0,
                currentPrice: priceData?.current_price,
                currency:     h.currency ?? 'KRW',
            };
        })
    );

    const insight = await generatePortfolioInsight(holdingsWithPrice);

    // DB 저장
    await UserFinanceMeta.findOneAndUpdate(
        { userId },
        {
            portfolioInsight: {
                ...insight,
                basedOn:     holdings.map(h => h.ticker),
                generatedAt: new Date(),
            },
        },
        { upsert: true }
    );

    res.json(insight);
};