import api from './api';
import type { ApiResponse, Expense, ExpenseStats } from '../types';


// 지출 목록 조회
export const getExpenses = async (params?: {
    category?: string;
    startDate?: string;
    endDate?: string;
    scheduleId?: string;
}): Promise<Expense[]> => {
    const response = await api.get<ApiResponse<{ expenses: Expense[] }>>('/expenses', {
        params,
    });
    return response.data.data!.expenses;
};

// 지출 생성
export const createExpense = async (data: {
    amount: number;
    category: string;
    description: string;
    date?: string;
    scheduleId?: string;
}): Promise<Expense> => {
    const response = await api.post<ApiResponse<{ expense: Expense }>>('/expenses', data);
    return response.data.data!.expense;
};

// 지출 상세 조회
export const getExpense = async (id: string): Promise<Expense> => {
    const response = await api.get<ApiResponse<{ expense: Expense }>>(`/expenses/${id}`);
    return response.data.data!.expense;
};

// 지출 수정
export const updateExpense = async (
    id: string,
    data: Partial<Expense>
): Promise<Expense> => {
    const response = await api.put<ApiResponse<{ expense: Expense }>>(`/expenses/${id}`, data);
    return response.data.data!.expense;
};

// 지출 삭제
export const deleteExpense = async (id: string): Promise<void> => {
    await api.delete(`/expenses/${id}`);
};

// 지출 통계 조회
export const getExpenseStats = async (params?: {
    startDate?: string;
    endDate?: string;
}): Promise<ExpenseStats> => {
    const response = await api.get<ApiResponse<ExpenseStats>>('/expenses/stats', {
        params,
    });
    return response.data.data!;
};