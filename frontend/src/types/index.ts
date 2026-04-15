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
    nickname?: string;
    role: 'user' | 'admin';
    status: 'pending' | 'approved' | 'rejected';
    otpEnabled: boolean;
    lastLoginAt?: string;
    lastMessageAt?: string;
}

// 로그인 응답 — OTP 미사용 시 token+user, OTP 사용 시 otpRequired+tempToken
export interface LoginResponse {
    token?: string;
    user?: User;
    otpRequired?: boolean;
    tempToken?: string;
}

// OTP 검증 후 최종 응답
export interface OtpVerifyResponse {
    token: string;
    user: User;
}

// 회원가입 응답 — 토큰 없음, 승인 대기 메시지만 반환
export interface RegisterResponse {
    message: string;
}

// 반복 종료 조건 (일정·지출 공통)
export interface RecurringEnd {
    type: 'forever' | 'date';
    endDate?: string;
}

// 일정
export interface Schedule {
    _id: string;
    userId: string;
    title: string;
    date: string;
    endDate?: string;
    category: string;
    expenses: string[] | Expense[];
    isRecurring: boolean;
    recurringPattern?: {
        frequency: 'daily' | 'weekly' | 'monthly';
        interval: number;
    };
    recurringEnd?: RecurringEnd;
    recurringGroupId?: string;
    createdAt: string;
    updatedAt: string;
}

// 지출/수입
export interface Expense {
    _id: string;
    userId: string;
    amount: number;
    category: string;
    description: string;
    date: string;
    scheduleId?: string;
    type: 'income' | 'expense';
    isRecurring?: boolean;
    recurringPattern?: {
        frequency: 'daily' | 'weekly' | 'monthly';
        interval: number;
    };
    recurringEnd?: RecurringEnd;
    recurringGroupId?: string;
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
    incomeTotal: {
        total: number;
        count: number;
    };
    expenseTotal: {
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

// 그룹 설정
export interface GroupSettings {
    shareSchedules: boolean;
    shareExpenses: boolean;
    showAmounts: boolean;
    showMemberNames: boolean;
    mergedInsights: boolean;
}


// 그룹 멤버
export interface GroupMember {
    userId: string;
    status: 'leader_invited' | 'member_requested' | 'active' | 'declined';
    method: 'invite' | 'code';
    requestedAt: string;
    joinedAt?: string;
}

// 그룹
export interface Group {
    _id: string;
    name: string;
    leaderId: string;
    inviteCode: string;
    inviteCodeEnabled: boolean;
    members: GroupMember[];
    settings: GroupSettings;
    status: 'pending' | 'active';
    createdAt: string;
    updatedAt: string;
}

// 메시지 발신자 (populate된 결과)
export interface MessageSender {
    _id: string;
    name: string;
    nickname?: string;
}

// 메시지
export interface Message {
    _id: string;
    senderId: MessageSender;
    chatType: 'group' | 'direct';
    groupId?: string;
    recipientId?: string;
    content: string;
    readBy: string[];
    createdAt: string;
    updatedAt: string;
}

// 게시판
export interface Post {
    _id: string;
    authorId: { _id: string; nickname: string };
    boardType: 'notice' | 'free';
    title: string;
    content: string;
    isPinned: boolean;
    showModal: boolean;
    views: number;
    createdAt: string;
    updatedAt: string;
}

export interface PostListResponse {
    posts: Post[];
    total: number;
    page: number;
    totalPages: number;
}