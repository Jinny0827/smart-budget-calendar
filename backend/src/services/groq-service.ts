import dotenv from 'dotenv';
import crypto from 'crypto';
import Expense from '../models/Expense';
import Schedule from '../models/Schedule';
import InsightCache from '../models/InsightCache';
import mongoose from 'mongoose';

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

dotenv.config();

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const CACHE_TTL_MS = 60 * 60 * 1000;

class GroqService {

    // ─────────────────────────────────────────
    // 캐시 확인 후 분석 실행
    // ─────────────────────────────────────────
    async analyzeWithCache(userId: string): Promise<IInsightResult[]> {
        const userObjectId = new mongoose.Types.ObjectId(userId);
        const currentHash = await this.buildDataHash(userObjectId);
        const cache = await InsightCache.findOne({ userId });

        if (cache) {
            const cacheAge = Date.now() - cache.analyzedAt.getTime();
            const isExpired = cacheAge > CACHE_TTL_MS;
            const isDataChanged = cache.dataHash !== currentHash;

            if (!isExpired && !isDataChanged) {
                console.log('Groq 인사이트 캐시 반환');
                return cache.insights as IInsightResult[];
            }
        }

        console.log('Groq API 호출 (Llama 3.1)');
        const insights = await this.runAnalysis(userObjectId);

        await InsightCache.findOneAndUpdate(
            { userId },
            { userId, insights, analyzedAt: new Date(), dataHash: currentHash },
            { upsert: true, new: true }
        );

        return insights;
    }

    // ─────────────────────────────────────────
    // 캐시 강제 무효화 (컨트롤러에서 사용)
    // ─────────────────────────────────────────
    async invalidateCache(userId: string): Promise<void> {
        await InsightCache.findOneAndUpdate(
            { userId },
            { dataHash: 'invalidated' }
        );
    }

    private async buildDataHash(userObjectId: mongoose.Types.ObjectId): Promise<string> {
        const [expenses, schedules] = await Promise.all([
            Expense.find({ userId: userObjectId }).select('amount date category').lean(),
            Schedule.find({ userId: userObjectId }).select('date category title').lean(),
        ]);
        const raw = JSON.stringify({ expenses, schedules });
        return crypto.createHash('md5').update(raw).digest('hex');
    }

    private async runAnalysis(userObjectId: mongoose.Types.ObjectId): Promise<IInsightResult[]> {
        const prompt = await this.buildPrompt(userObjectId);
        try {
            const responseText = await this.callGroqAPI(prompt);
            return this.parseResponse(responseText);
        } catch (error) {
            console.error('Groq 분석 오류:', error);
            throw error;
        }
    }

    private async buildPrompt(userObjectId: mongoose.Types.ObjectId): Promise<string> {
        const now = new Date();
        const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

        const [thisMonthAll, lastMonthAll, upcomingSchedules] = await Promise.all([
            Expense.find({ userId: userObjectId, date: { $gte: thisMonthStart } }).lean(),
            Expense.find({ userId: userObjectId, date: { $gte: lastMonthStart, $lte: lastMonthEnd } }).lean(),
            Schedule.find({ userId: userObjectId, date: { $gte: now, $lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) } }).lean()
        ]);

        const getSummary = (records: any[], type: 'income' | 'expense') => {
            const filtered = records.filter(e => e.type === type);
            const map: Record<string, number> = {};
            filtered.forEach(e => map[e.category] = (map[e.category] || 0) + e.amount);
            return { total: filtered.reduce((s, e) => s + e.amount, 0), map };
        };

        const thisMonthExpense = getSummary(thisMonthAll, 'expense');
        const thisMonthIncome = getSummary(thisMonthAll, 'income');
        const lastMonthExpense = getSummary(lastMonthAll, 'expense');
        const lastMonthIncome = getSummary(lastMonthAll, 'income');

        const thisMonthNet = thisMonthIncome.total - thisMonthExpense.total;
        const lastMonthNet = lastMonthIncome.total - lastMonthExpense.total;

        return `당신은 개인 재정 관리 전문가입니다. 아래 데이터를 분석하여 JSON 배열로만 응답하세요.

        ## 이번 달 수입: ${thisMonthIncome.total.toLocaleString()}원 ${JSON.stringify(thisMonthIncome.map)}
        ## 이번 달 지출: ${thisMonthExpense.total.toLocaleString()}원 ${JSON.stringify(thisMonthExpense.map)}
        ## 이번 달 순수입(수입-지출): ${thisMonthNet.toLocaleString()}원

        ## 지난 달 수입: ${lastMonthIncome.total.toLocaleString()}원 ${JSON.stringify(lastMonthIncome.map)}
        ## 지난 달 지출: ${lastMonthExpense.total.toLocaleString()}원 ${JSON.stringify(lastMonthExpense.map)}
        ## 지난 달 순수입(수입-지출): ${lastMonthNet.toLocaleString()}원

        ## 예정 일정: ${upcomingSchedules.map(s => `${s.title}(${s.category}):${new Date(s.date).toLocaleDateString()}`).join(', ')}

        ## 응답 형식 (반드시 이 필드들을 포함한 JSON 배열이어야 함):
        [
          {
            "type": "anomaly_alert" | "budget_suggestion" | "pattern_insight" | "schedule_recommendation",
            "content": "한국어 인사이트 내용",
            "priority": "high" | "medium" | "low",
            "data": { "category": "카테고리명", "amount": 0, "changeRate": 0 }
          }
        ]

        ## 분석 기준:
        - 지출이 수입을 초과하면 경고 (anomaly_alert, high priority)
        - 전월 대비 지출 30% 이상 증가 시 경고 (anomaly_alert)
        - 순수입이 플러스면 저축 칭찬 및 조언 (pattern_insight)
        - 수입 대비 지출 비율(소비율)이 80% 초과 시 절약 권고 (budget_suggestion)
        - 예정 일정 대비 예산 조언 (schedule_recommendation)
        - 절약 중인 카테고리 칭찬 (pattern_insight)
        - 데이터가 적어도 반드시 최소 3개 이상 생성할 것
        - 데이터가 없는 항목은 일반적인 재정 조언으로 채울 것
        `;
    }

    private async callGroqAPI(prompt: string): Promise<string> {
        if (!GROQ_API_KEY) throw new Error("GROQ_API_KEY가 없습니다.");

        const response = await fetch(GROQ_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [
                    { role: "system", content: "You are a professional financial assistant. Respond only with a JSON array." },
                    { role: "user", content: prompt }
                ],
                temperature: 0.2,
                response_format: { type: "json_object" }
            }),
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`Groq API Error: ${response.status} - ${err}`);
        }

        const data = (await response.json()) as {
            choices: Array<{ message: { content: string } }>;
        };

        return data.choices[0]?.message?.content || '[]';
    }

    private parseResponse(text: string): IInsightResult[] {
        try {
            console.log('Groq 원본 응답:', text);
            const parsed = JSON.parse(text);

            if (Array.isArray(parsed)) return parsed;

            const possibleKeys = ['insights', 'data', 'results', 'items'];
            for (const key of possibleKeys) {
                if (Array.isArray(parsed[key])) {
                    return parsed[key];
                }
            }

            if (parsed && typeof parsed === 'object' && parsed.type && parsed.content) {
                return [parsed as IInsightResult];
            }

            return [];
        } catch (error) {
            console.error('JSON 파싱 실패:', error);
            return [];
        }
    }
}

export default new GroqService();