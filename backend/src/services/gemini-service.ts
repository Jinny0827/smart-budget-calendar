import dotenv from 'dotenv';
import crypto from 'crypto';
import Expense from '../models/Expense';
import Schedule from '../models/Schedule';
import InsightCache from '../models/InsightCache';
import mongoose from 'mongoose';

//Gemini API 응답에서 파싱할 인사이트 타입
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

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// gemini-service.ts
const MODEL_NAME = "gemini-2.0-flash"; // 1.5 대신 2.0으로 시도
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${GEMINI_API_KEY}`;
// 요청 시간 간격 : 1시간
const CACHE_TTL_MS = 60 * 60 * 1000;

class GeminiService {

    // ─────────────────────────────────────────
    // 캐시 확인 후 분석 실행 (메인 진입점)
    // ─────────────────────────────────────────
    async analyzeWithCache(userId: string): Promise<IInsightResult[]> {
        const userObjectId = new mongoose.Types.ObjectId(userId);
        
        // 현재 데이터 해시 계산
        const currentHash = await this.buildDataHash(userObjectId);

        // 캐시 조회
        const cache = await InsightCache.findOne({ userId });

        if (cache) {
            const cacheAge = Date.now() - cache.analyzedAt.getTime();
            const isExpired = cacheAge > CACHE_TTL_MS;
            const isDataChanged = cache.dataHash !== currentHash;

            // 1시간 이내이고 데이터 변경 없으면 캐시 반환
            if (!isExpired && !isDataChanged) {
                console.log('인사이트 캐시 반환');
                return cache.insights as IInsightResult[];
            }
        }

        // 캐시 만료 or 데이터 변경 -> gemini 호출
        console.log('Gemini API 호출');
        const insights = await this.runGeminiAnalysis(userObjectId);

        // 캐시 갱신
        await InsightCache.findOneAndUpdate(
            { userId },
            { userId, insights, analyzedAt: new Date(), dataHash: currentHash },
            { upsert: true, new: true }
        )

        return insights;
    }

    // ─────────────────────────────────────────
    // 캐시 강제 무효화 (지출/일정 추가/수정 시 호출)
    // ─────────────────────────────────────────
    async invalidateCache(userId: string): Promise<void> {
        await InsightCache.findOneAndUpdate(
            { userId },
            // 해시를 강제로 다르게 만들어 다음 조회 시 재분석
            { dataHash: 'invalidated' }
        );
    }

    // ─────────────────────────────────────────
    // 데이터 해시 생성 (지출+일정 기반)
    // ─────────────────────────────────────────
    private async buildDataHash(userObjectId: mongoose.Types.ObjectId): Promise<string> {
        const [expenses, schedules] = await Promise.all([
            Expense.find({ userId: userObjectId }).select('amount date category').lean(),
            Schedule.find({ userId: userObjectId }).select('date category title').lean(),
        ])

        const raw = JSON.stringify({ expenses, schedules });
        return crypto.createHash('md5').update(raw).digest('hex');
    }

    // ─────────────────────────────────────────
    // Gemini API 호출 및 분석 실행
    // ─────────────────────────────────────────
    private async runGeminiAnalysis(
        userObjectId: mongoose.Types.ObjectId
    ): Promise<IInsightResult[]> {
        const prompt = await this.buildPrompt(userObjectId);

        try {
            const responseText = await this.callGeminiAPI(prompt);
            return this.parseGeminiResponse(responseText);
        } catch (error) {
            console.error('Gemini API 오류, 룰 기반으로 폴백:', error);
            // Gemini 실패 시 빈 배열 반환 (룰 기반 ai-service로 대체 가능)
            return [];
        }
    }

    // ─────────────────────────────────────────
    // 프롬프트 생성
    // ─────────────────────────────────────────
    private async buildPrompt(userObjectId: mongoose.Types.ObjectId): Promise<string> {
        const now = new Date();
        const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

        // 이번달 지출
        const thisMonthExpenses = await Expense.find({
            userId: userObjectId,
            date: { $gte: thisMonthStart },
        }).lean();

        // 지난 달 지출
        const lastMonthExpenses = await Expense.find({
            userId: userObjectId,
            date: { $gte: lastMonthStart, $lte: lastMonthEnd },
        }).lean();

        // 예정 일정 (오늘 이후 30일)
        const upcomingSchedules = await Schedule.find({
            userId: userObjectId,
            date: { $gte: now, $lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) },
        }).lean();

        // 카테고리별 이번 달 합계
        const categoryMap: Record<string, number> = {};
        for (const e of thisMonthExpenses) {
            categoryMap[e.category] = (categoryMap[e.category] || 0) + e.amount;
        }

        // 카테고리별 지난 달 합계
        const lastCategoryMap: Record<string, number> = {};
        for (const e of lastMonthExpenses) {
            lastCategoryMap[e.category] = (lastCategoryMap[e.category] || 0) + e.amount;
        }

        const thisMonthTotal = thisMonthExpenses.reduce((s, e) => s + e.amount, 0);
        const lastMonthTotal = lastMonthExpenses.reduce((s, e) => s + e.amount, 0);

        return `
                당신은 개인 재정 관리 AI 어시스턴트입니다. 아래 사용자의 가계부 데이터를 분석하고 인사이트를 JSON 배열로만 응답하세요.
                
                ## 이번 달 지출 현황
                - 총 지출: ${thisMonthTotal.toLocaleString()}원 (${thisMonthExpenses.length}건)
                - 카테고리별: ${JSON.stringify(categoryMap, null, 2)}
                
                ## 지난 달 지출 현황
                - 총 지출: ${lastMonthTotal.toLocaleString()}원 (${lastMonthExpenses.length}건)
                - 카테고리별: ${JSON.stringify(lastCategoryMap, null, 2)}
                
                ## 앞으로 30일 예정 일정
                ${upcomingSchedules.map(s => `- ${s.title} (${s.category}) : ${new Date(s.date).toLocaleDateString('ko-KR')}`).join('\n') || '없음'}
                
                ## 응답 형식 (JSON 배열, 다른 텍스트 없이)
                [
                  {
                    "type": "anomaly_alert" | "budget_suggestion" | "pattern_insight" | "schedule_recommendation",
                    "content": "한국어로 된 인사이트 내용 (구체적인 금액 포함)",
                    "priority": "high" | "medium" | "low",
                    "data": {
                      "category": "카테고리명 (해당시)",
                      "amount": 금액숫자 (해당시),
                      "changeRate": 변화율숫자 (해당시),
                      "averageAmount": 평균금액 (해당시)
                    }
                  }
                ]
                
                ## 분석 기준
                - 전월 대비 30% 이상 증가한 카테고리는 반드시 포함
                - 예정 일정에 대한 예산 준비 조언 포함
                - 절약 중인 카테고리도 긍정적으로 언급
                - 최대 5개 인사이트 생성
                `;
    }

    // ─────────────────────────────────────────
    // Gemini API HTTP 호출
    // ─────────────────────────────────────────
    private async callGeminiAPI(prompt: string): Promise<string> {
        const response = await fetch(GEMINI_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: prompt }]
                }],
                generationConfig: {
                    temperature: 0.1,
                    maxOutputTokens: 1024,
                    // JSON 모드를 활성화하고 싶다면 아래 주석 해제 (단, 모델에 따라 지원 여부 확인 필요)
                    // responseMimeType: "application/json"
                },
            }),
        });

        if (!response.ok) {
            const errorBody = await response.json();
            console.error('Gemini 에러 상세:', JSON.stringify(errorBody, null, 2));
            throw new Error(`Gemini API 오류: ${response.status} ${response.statusText}`);
        }

        const data = await response.json() as {
            candidates?: Array<{
                content?: {
                    parts?: Array<{ text?: string }>
                }
            }>
        };

        return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    }

    // ─────────────────────────────────────────
    // Gemini 응답 파싱 (JSON 추출)
    // ─────────────────────────────────────────
    private parseGeminiResponse(text: string): IInsightResult[] {
        try {
            // ```json ... ``` 마크다운 제거
            const cleaned = text.replace(/```json|```/g, '').trim();
            const parsed = JSON.parse(cleaned);

            if (!Array.isArray(parsed)) return [];

            // 타입 검증
            return parsed.filter(
                (item): item is IInsightResult =>
                    item.type && item.content && item.priority
            );
        } catch (error) {
            console.error('Gemini 응답 파싱 실패:', error);
            return [];
        }
    }
}

export default new GeminiService();