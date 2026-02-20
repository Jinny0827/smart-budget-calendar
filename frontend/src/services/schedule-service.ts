import api from './api';
import type { ApiResponse, Schedule } from '../types';


// 일정 목록 조회
export const getSchedules = async (params?: {
    category?: string;
    startDate?: string;
    endDate?: string;
}): Promise<Schedule[]> => {
    const response = await api.get<ApiResponse<{ schedules: Schedule[] }>>('/schedules', {
        params,
    });
    return response.data.data!.schedules;
};


// 일정 생성
export const createSchedule = async (data: {
    title: string;
    date: string;
    endDate?: string;
    category: string;
    isRecurring?: boolean;
    recurringPattern?: {
        frequency: 'daily' | 'weekly' | 'monthly';
        interval: number;
    };
}): Promise<Schedule> => {
    const response = await api.post<ApiResponse<{ schedule: Schedule }>>('/schedules', data);
    return response.data.data!.schedule;
}

// 일정 상세 조회
export const getSchedule = async (id: string): Promise<Schedule> => {
    const response = await api.get<ApiResponse<{ schedule: Schedule }>>(`/schedules/${id}`);
    return response.data.data!.schedule;
};

// 일정 수정
export const updateSchedule = async (
    id: string,
    data: Partial<Schedule>
): Promise<Schedule> => {
    const response = await api.put<ApiResponse<{ schedule: Schedule }>>(`/schedules/${id}`, data);
    return response.data.data!.schedule;
};

// 일정 삭제
export const deleteSchedule = async (id: string): Promise<void> => {
    await api.delete(`/schedules/${id}`);
};