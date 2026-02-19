import { Request, Response } from 'express';
import aiService from "../services/ai-service";
import groqService from "../services/groq-service";

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
