// API 공통 응답 타입
export interface ApiResponse<T> {
    success: boolean;
    message?: string;
    data?: T;
}

// 사용자
export interface User {
    id: string;
    email: string;
    name: string;
}

// 인증 응답
export interface AuthResponse {
    token: string;
    user: User;
}

// 일정
export interface Schedule {
    _id: string;
    userId: string;
    title: string;
    date: string;
    category: string;
    expenses: string[] | Expense[];
    isRecurring: boolean;
    recurringPattern?: {
        frequency: 'daily' | 'weekly' | 'monthly';
        interval: number;
    };
    createdAt: string;
    updatedAt: string;
}

// 지출
export interface Expense {
    _id: string;
    userId: string;
    amount: number;
    category: string;
    description: string;
    date: string;
    scheduleId?: string;
    createdAt: string;
    updatedAt: string;
}

// 지출 통계
export interface ExpenseStats {
    categoryStats: {
        _id: string;
        total: number;
        count: number;
    }[];
    total: {
        total: number;
        count: number;
    };
}

// AI 인사이트 결과
export interface InsightResult {
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

// 일정 패턴
export interface SchedulePattern {
    title: string;
    category: string;
    frequency: 'daily' | 'weekly' | 'monthly';
    interval: number;
    lastOccurrence: string;
    nextSuggestion: string;
    confidence: number;
    occurrenceCount: number;
}