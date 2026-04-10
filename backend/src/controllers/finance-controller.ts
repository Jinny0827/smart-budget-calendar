import { Request, Response } from 'express';
import { analyzeCompany, autocomplete, getStockPrice, getUsStockPrice, generatePortfolioInsight } from '../services/finance/index';
import UserStock from '../models/UserStock';
import UserFinanceMeta from '../models/UserFinanceMeta';


// 기업 분석
export const analyze = async (req: Request, res: Response): Promise<void> => {
    const {query, market = 'kr', year = String(new Date().getFullYear() - 1)} = req.query as Record<string, string>;
    if (!query) {
        res.status(400).json({error: 'query 파라미터가 필요합니다'});
        return;
    }


    // 검색 히스토리 저장
    const userId = (req as any).user?.id;
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
        );
    }

    const data = await analyzeCompany(query, market, year);
    res.json(data);
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
    const userId = (req as any).user.id;
    const { type } = req.query as Record<string, string>;

    const filter: any = { userId };
    if (type === 'watchlist' || type === 'portfolio') filter.type = type;

    const list = await UserStock.find(filter).sort({ addedAt: -1 });
    res.json(list);
};


// 종목 추가
export const addStock = async (req: Request, res: Response): Promise<void> => {
    const userId = (req as any).user.id;
    const { corpName, ticker, stock_code, corp_code, market, type, quantity, avgPrice, currency } = req.body;

    if (type === 'portfolio' && (quantity == null || avgPrice == null)) {
        res.status(400).json({ error: '보유 종목은 quantity, avgPrice가 필요합니다' });
        return;
    }

    const item = await UserStock.findOneAndUpdate(
        { userId, ticker, market },
        { userId, corpName, ticker, stock_code, corp_code, market, type, quantity, avgPrice, currency, updatedAt: new Date() },
        { upsert: true, new: true }
    );
    res.status(201).json(item);
};

// 종목 수정ㄹ
export const updateStock = async (req: Request, res: Response): Promise<void> => {
    const userId = (req as any).user.id;
    const { id }  = req.params;

    const item = await UserStock.findOneAndUpdate(
        { _id: id, userId },
        { ...req.body, updatedAt: new Date() },
        { new: true }
    );
    if (!item) { res.status(404).json({ error: '종목을 찾을 수 없습니다' }); return; }
    res.json(item);
};

// 종목 삭제
export const removeStock = async (req: Request, res: Response): Promise<void> => {
    const userId = (req as any).user.id;
    const { id }  = req.params;

    await UserStock.findOneAndDelete({ _id: id, userId });
    res.json({ success: true });
};

// 검색 히스토리
export const getSearchHistory = async (req: Request, res: Response): Promise<void> => {
    const userId = (req as any).user.id;
    const meta   = await UserFinanceMeta.findOne({ userId });
    res.json(meta?.searchHistory ?? []);
};

// 유저 포트폴리오 종합 인사이트
export const getPortfolioInsight = async (req: Request, res: Response): Promise<void> => {
    const userId = (req as any).user.id;

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