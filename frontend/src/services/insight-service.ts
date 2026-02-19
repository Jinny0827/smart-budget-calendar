import type {ApiResponse, InsightResult} from "../types";
import api from "./api.ts";

// AI 인사이트 목록 조회
export const getInsights = async (): Promise<InsightResult[]> => {
    const response = await api.get<ApiResponse<{ insights: InsightResult[] }>>('/insights');
    return response.data.data!.insights;
}

// 수동 분석 트리거
export const analyzeInsights = async (): Promise<InsightResult[]> => {
    const response = await api.post<ApiResponse<{ insights: InsightResult[] }>>('/insights/analyze');
    return response.data.data!.insights;
};

// 특정 일정 예산 추천
export const suggestBudget = async (scheduleId: string): Promise<InsightResult | null> => {
    const response = await api.get<ApiResponse<{ insight: InsightResult | null }>>(
        `/insights/budget/${scheduleId}`
    );
    return response.data.data!.insight;
};