


// 이상 탐지, 예산 추천, 전월 비교, 미계획 고액 지출 4가지 분석 룰 기반으로 구현

// 인사이트 타입 정의
import mongoose from "mongoose";
import Expense from "../models/Expense";
import Schedule from "../models/Schedule";

export interface IInsightResult {
    type: 'anomaly_alert' | 'budget_suggestion' | 'pattern_insight' | 'schedule_recommendation';
    content: string;
    priority: 'high' | 'medium' | 'low';
    data: {
        category?: string;
        amount?: number;
        scheduleId?: string;
        suggestedBudget?: number;
        averageAmount?: number;
        changeRate?: number;
    };
}

export class AIService {

    // ─────────────────────────────────────────
    // 1. 이상 지출 탐지 (표준편차 기반)
    // ─────────────────────────────────────────
    async detectAnomalies(userId: string): Promise<IInsightResult[]> {
        const insights : IInsightResult[] = [];
        const userObjectId = new mongoose.Types.ObjectId(userId);

        // 최근 6개월간 지출 데이터 조회
        const sixMonthAgo = new Date();
        sixMonthAgo.setDate(sixMonthAgo.getMonth() - 6);

        const expenses = await Expense.find({
            userId: userObjectId,
            date: { $gte: sixMonthAgo}
        });

        // 데이터 부족시 스킵
        if(expenses.length < 5) return insights;

        // 카테고리별 평균 및 표준편차 계산
        const categoryMap = new Map<string, number[]>();
        for (const expense of expenses) {
            if (!categoryMap.has(expense.category)) {
                categoryMap.set(expense.category, []);
            }
            categoryMap.get(expense.category)!.push(expense.amount);
        }

        for (const [category, amounts] of categoryMap.entries()) {
            if(amounts.length < 3) continue;

            const mean = amounts.reduce((a,b) => a + b, 0) / amounts.length;
            const variance = amounts.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / amounts.length;
            const stdDev = Math.sqrt(variance);

            // 최근 30일 해당 카테고리 지출
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            const recentAmounts = amounts.slice(-3);
            const recentAvg = recentAmounts.reduce((a,b) => a + b, 0) / recentAmounts.length;

            // 평균 + 2 표준 편차 초과 시 이상치로 판단
            if (recentAvg > mean + 2 * stdDev && stdDev > 0) {
                const changeRate = Math.round((recentAvg - mean) / mean * 100);
                insights.push({
                    type: 'anomaly_alert',
                    content: `${category} 지출이 평소보다 ${changeRate}% 증가했습니다`,
                    priority: changeRate > 100 ? 'high' : 'medium',
                    data: {
                        category,
                        amount: Math.round(recentAvg),
                        averageAmount: Math.round(mean),
                        changeRate
                    }
                });
            }
        }

        return insights;
    }

    // ─────────────────────────────────────────
    // 2. 일정 기반 예산 추천
    // ─────────────────────────────────────────
    async suggestBudget(scheduleId: string, userId: string): Promise<IInsightResult | null> {
        const userObjectId = new mongoose.Types.ObjectId(userId);
        const schedule = await Schedule.findOne({_id: scheduleId, userId: userObjectId});
        if(!schedule) { return null; }

        // 같은 카테고리의 과거 지출 평균 계산
        const pastExpenses = await Expense.find({
            userId: userObjectId,
            category: schedule.category,
            // 일정에 연동된 지출만
            scheduleId: { $exists: true }
        })

        if(pastExpenses.length === 0) {
            // 일정 연동 지출이 없으면 카테고리 전체 평균으로 대체
            const allCategoryExpenses = await Expense.find({
                userId: userObjectId,
                category: schedule.category
            });

            if(allCategoryExpenses.length === 0)  { return null; }

            const avg = allCategoryExpenses.reduce((sum, e) => sum + e.amount, 0) / allCategoryExpenses.length;
            return {
                type: 'budget_suggestion',
                content: `${schedule.title} 예상 예산: ${Math.round(avg).toLocaleString()}원 (${schedule.category} 평균 기준)`,
                priority: 'low',
                data: {
                    scheduleId,
                    category: schedule.category,
                    suggestedBudget: Math.round(avg),
                    averageAmount: Math.round(avg)
                }
            }
        }

        const avg = pastExpenses.reduce((sum, e) => sum + e.amount, 0) / pastExpenses.length;
        return {
            type: 'budget_suggestion',
            content: `${schedule.title} 예상 예산: ${Math.round(avg).toLocaleString()}원 (과거 ${pastExpenses.length}회 평균)`,
            priority: 'medium',
            data: {
                scheduleId,
                category: schedule.category,
                suggestedBudget: Math.round(avg),
                averageAmount: Math.round(avg)
            }
        };
    };

    // ─────────────────────────────────────────
    // 3. 소비 패턴 분석 (이번 달 vs 지난 달 비교)
    // ─────────────────────────────────────────
    async analyzeSpendingPattern(userId: string): Promise<IInsightResult[]> {
        const insights: IInsightResult[] = [];
        const userObjectId = new mongoose.Types.ObjectId(userId);

        const now = new Date();
        const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

        // 이번 달 카테고리별 합계
        const thisMonthStats = await Expense.aggregate([
            { $match: { userId: userObjectId, date: { $gte: thisMonthStart } } },
            { $group: { _id: '$category', total: { $sum: '$amount' } } }
        ]);

        // 지난 달 카테고리별 합계
        const lastMonthStats = await Expense.aggregate([
            { $match: { userId: userObjectId, date: { $gte: lastMonthStart, $lte: lastMonthEnd } } },
            { $group: { _id: '$category', total: { $sum: '$amount' } } }
        ])


        const lastMonthMap = new Map(lastMonthStats.map(s => [s._id, s.total]));

        for (const curr of thisMonthStats) {
            const lastTotal = lastMonthMap.get(curr._id);
            if(!lastTotal || lastTotal == 0) {
                continue;
            }

            const changeRate = Math.round((curr.total - lastTotal) / lastTotal * 100);

            // 비율이 30퍼센트가 넘으면
            if(changeRate >= 30) {
                insights.push({
                    type: 'pattern_insight',
                    content: `${curr._id} 지출이 지난달 대비 ${changeRate}% 증가했습니다`,
                    priority: changeRate >= 60 ? 'high' : 'medium',
                    data: {
                        category: curr._id,
                        amount: curr.total,
                        averageAmount: lastTotal,
                        changeRate
                    }
                });
                // -30퍼센트가 넘으면
            } else if (changeRate <= -30) {
                insights.push({
                    type: 'pattern_insight',
                    content: `${curr._id} 지출이 지난달 대비 ${Math.abs(changeRate)}% 감소했습니다 👍`,
                    priority: 'low',
                    data: {
                        category: curr._id,
                        amount: curr.total,
                        averageAmount: lastTotal,
                        changeRate
                    }
                });
            }
        }

        return insights;
    }

    // ─────────────────────────────────────────
    // 4. 일정 없는 고액 지출 알림
    // ─────────────────────────────────────────
    async detectUnplannedExpenses(userId: string): Promise<IInsightResult[]> {
        const insights: IInsightResult[] = [];
        const userObjectId = new mongoose.Types.ObjectId(userId);
        
        // 최근 30일 내 일정 미연동 지출 조회
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const unplannedExpenses = await Expense.find({
            userId: userObjectId,
            scheduleId: { $exists: false },
            date: { $gte: thirtyDaysAgo }
        }).sort({ amount: -1 });

        if(unplannedExpenses.length === 0 ) { return insights; }

        // 전체 지출 평균 계산 (임계값 기준)
        const allExpenses = await Expense.find({ userId: userObjectId });
        if(allExpenses.length < 3) { return insights }

        const avgAmount = allExpenses.reduce((sum, e) => sum + e.amount, 0) / allExpenses.length;
        // 평균의 3배 이상이면 고액으로 판단.
        const threshold = avgAmount * 3;

        for (const expense of unplannedExpenses.slice(0, 3)) {
            if(expense.amount >= threshold) {
                insights.push({
                    type: 'anomaly_alert',
                    content: `미계획 고액 지출 발생: ${expense.description} (${expense.amount.toLocaleString()}원)`,
                    priority: 'high',
                    data: {
                        category: expense.category,
                        amount: expense.amount,
                        averageAmount: Math.round(avgAmount)
                    }
                });
            }
        }

        return insights;
    }

    // ─────────────────────────────────────────
    // 전체 분석 실행 (모든 인사이트 통합)
    // ─────────────────────────────────────────
    async runFullAnalysis(userId: string): Promise<IInsightResult[]> {
        const [anomalies, patterns, unplanned] = await Promise.all([
            this.detectAnomalies(userId),
            this.analyzeSpendingPattern(userId),
            this.detectUnplannedExpenses(userId)
        ]);

        // 우선순위 순서로 정렬 (high -> medium -> low)
        const priorityOrder = { high: 0, medium: 1, low: 2};
        const all = [...anomalies, ...patterns, ...unplanned];
        all.sort((a,b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

        return all;
    }
}

export default new AIService();
