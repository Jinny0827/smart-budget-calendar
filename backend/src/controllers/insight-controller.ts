import { Request, Response } from 'express';
import aiService from "../services/ai-service";
import groqService from "../services/groq-service";
import Expense  from '../models/Expense';
import Schedule from '../models/Schedule';
import UserStock from '../models/UserStock';
import UserFinanceMeta from '../models/UserFinanceMeta';
import mongoose from 'mongoose';
import { getBatchStockPrices, getExchangeRate } from '../services/finance';
import { generateDashboardInsight } from '../services/finance/groqFinance';

// AI 인사이트 목록 조회 (Gemini 캐시 우선, 실패 시 룰 기반 폴백)
export const getInsights = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).userId;

        let insights = await groqService.analyzeWithCache(userId);

        if (!insights || insights.length === 0) {
            insights = await aiService.runFullAnalysis(userId);
        }

        res.status(200).json({
            success: true,
            data: { insights }
        })
    } catch (error) {
        console.error('인사이트 조회 에러:', error);
        res.status(500).json({
            success: false,
            message: '서버 에러가 발생했습니다'
        });
    }
}

// 수동 분석 트리거
export const analyzeInsights = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).userId;

        // 캐시 무효화 → 강제 재분석
        await groqService.invalidateCache(userId);
        let insights = await groqService.analyzeWithCache(userId);

        if (!insights || insights.length === 0) {
            insights = await aiService.runFullAnalysis(userId);
        }

        res.status(200).json({
            success: true,
            message: `분석 완료: ${insights.length}개의 인사이트 생성`,
            data: { insights }
        });
    } catch (error) {
        console.error('분석 트리거 에러:', error);
        res.status(500).json({
            success: false,
            message: '서버 에러가 발생했습니다'
        });
    }
}

// 특정 일정에 대한 예산 추천
export const suggestBudget = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).userId;
        const { scheduleId } = req.params;

        const insight = await aiService.suggestBudget(scheduleId, userId);

        if (!insight) {
            res.status(200).json({
                success: true,
                message: '예산 추천을 위한 데이터가 부족합니다',
                data: { insight: null }
            });
            return;
        }

        res.status(200).json({
            success: true,
            data: { insight }
        });

    } catch (error) {
        console.error('예산 추천 에러:', error);
        res.status(500).json({
            success: false,
            message: '서버 에러가 발생했습니다'
        });
    }
}

export const getDashboardInsight = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).userId;
        const force = req.query.force === 'true';
        const uid = new mongoose.Types.ObjectId(userId);
        
        // 캐시 확인 (1시간)
        const meta = await UserFinanceMeta.findOne({ userId }).lean() as any;
        if(!force && meta?.dashboardInsight?.generatedAt) {
            const age = Date.now() - new Date(meta.dashboardInsight.generatedAt).getTime();
            if (age < 60 * 60 * 1000) {
                res.json(meta.dashboardInsight)
                return;
            }
        }

        // 데이터 수집
        const now            = new Date();
        const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd   = new Date(now.getFullYear(), now.getMonth(), 0);
        const in30days       = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

        const [thisMonthAll, lastMonthAll, upcomingSchedules, portfolioStocks] = await Promise.all([
            Expense.find({ userId: uid, date: { $gte: thisMonthStart } }).lean(),
            Expense.find({ userId: uid, date: { $gte: lastMonthStart, $lte: lastMonthEnd } }).lean(),
            Schedule.find({ userId: uid, date: { $gte: now, $lte: in30days } }).lean(),
            UserStock.find({ userId: uid, type: 'portfolio' }).lean(),
        ]);

        const getSummary = (records: any[])=> {
            const expenses = records.filter(e => e.type !== 'income');
            const incomes = records.filter(e => e.type === 'income');
            const byCategory: Record<string, number> = {};
            expenses.forEach(e => { byCategory[e.category] = (byCategory[e.category] || 0) + e.amount;});

            return {
                income : incomes.reduce((s, e) => s + e.amount, 0),
                expense: expenses.reduce((s,e) => s + e.amount, 0),
                byCategory,
            }
        }

        const thisMonth = getSummary(thisMonthAll);
        const lastMonth = getSummary(lastMonthAll);
        
        // 포트폴리오 현재가 조회
        let portfolioWithPrice = null;
        if (portfolioStocks.length) {
            const symbols = portfolioStocks.map((s:any) => s.stock_code ?? s.ticker);
            const [prices, fx] = await Promise.all([
                getBatchStockPrices(symbols),
                getExchangeRate().catch(() => null)
            ]);
            const usdKrw = fx?.usdKrw;

            portfolioWithPrice = portfolioStocks.map((s:any) => ({
                corpName:     s.corpName,
                quantity:     s.quantity ?? 0,
                avgPrice:     s.avgPrice ?? 0,
                currentPrice: prices[s.stock_code ?? s.ticker]?.current_price,
                currency:     s.currency ?? 'KRW',
            }))

            
            // 인사이트 생성
            const insight = await generateDashboardInsight({
                thisMonthIncome:      thisMonth.income,
                thisMonthExpense:     thisMonth.expense,
                thisMonthByCategory:  thisMonth.byCategory,
                lastMonthIncome:      lastMonth.income,
                lastMonthExpense:     lastMonth.expense,
                lastMonthByCategory:  lastMonth.byCategory,
                upcomingSchedules:    upcomingSchedules.map((s: any) => ({
                    title:    s.title,
                    category: s.category,
                    date:     new Date(s.date).toLocaleDateString('ko-KR'),
                })),
                portfolio:  portfolioWithPrice,
                usdKrw,
            });

            const result = {...insight, generatedAt: new Date() };
            await UserFinanceMeta.findOneAndUpdate(
                { userId },
                { dashboardInsight: result },
                { upsert: true }
            );

            res.json(result);
            return;
        }

        // 포트 폴리오 없는 경우
        const insight = await generateDashboardInsight({
            thisMonthIncome:      thisMonth.income,
            thisMonthExpense:     thisMonth.expense,
            thisMonthByCategory:  thisMonth.byCategory,
            lastMonthIncome:      lastMonth.income,
            lastMonthExpense:     lastMonth.expense,
            lastMonthByCategory:  lastMonth.byCategory,
            upcomingSchedules:    upcomingSchedules.map((s: any) => ({
                title:    s.title,
                category: s.category,
                date:     new Date(s.date).toLocaleDateString('ko-KR'),
            })),
            portfolio: null,
        });

        const result = { ...insight, generatedAt: new Date() };
        await UserFinanceMeta.findOneAndUpdate(
            { userId },
            { dashboardInsight: result },
            { upsert: true }
        );

        res.json(result);

    } catch (error) {
        console.error('대시보드 인사이트 에러:', error);
        res.status(500).json({ message: '서버 에러' });
    }
}
