import api from './api';
import type { ApiResponse, User, Group } from '../types';

export interface Category {
    _id: string;
    name: string;
    color: string;
    order: number;
    isActive: boolean;
}


// 전체 사용자 목록 조회 (status 필터 선택)
export const getUsers = async (
    status?: 'pending' | 'approved' | 'rejected',
): Promise<User[]> => {
    const params = status ? { status } : {};
    const response = await api.get<ApiResponse<{ users: User[] }>>('/admin/users', { params });
    return response.data.data!.users;
};

// 사용자 승인
export const approveUser = async (userId: string): Promise<User> => {
    const response = await api.patch<ApiResponse<{ user: User }>>(
        `/admin/users/${userId}/approve`,
    );
    return response.data.data!.user;
};

// 사용자 거절
export const rejectUser = async (userId: string): Promise<User> => {
    const response = await api.patch<ApiResponse<{ user: User }>>(
        `/admin/users/${userId}/reject`,
    );
    return response.data.data!.user;
};

// 전체 그룹 목록 조회 (status 필터 선택)
export const getGroups = async (
    status?: 'pending' | 'active',
): Promise<Group[]> => {
    const params = status ? { status } : {};
    const response = await api.get<ApiResponse<{ groups: Group[] }>>('/admin/groups', { params });
    return response.data.data!.groups;
};

// 그룹 생성 승인
export const approveGroup = async (groupId: string): Promise<Group> => {
    const response = await api.patch<ApiResponse<{ group: Group }>>(
        `/admin/groups/${groupId}/approve`,
    );
    return response.data.data!.group;
};

// 그룹 생성 거절
export const rejectGroup = async (groupId: string): Promise<void> => {
    await api.patch(`/admin/groups/${groupId}/reject`);
};

// ─── 카테고리 API ────────────────────────────────────────────

// 활성 카테고리 목록 (일반 사용자용)
export const getCategories = async (): Promise<Category[]> => {
    const res = await api.get<ApiResponse<{ categories: Category[] }>>('/admin/categories');
    return res.data.data!.categories;
};

// 전체 카테고리 목록 (관리자용, 비활성 포함)
export const getAllCategories = async (): Promise<Category[]> => {
    const res = await api.get<ApiResponse<{ categories: Category[] }>>('/admin/categories/all');
    return res.data.data!.categories;
};

// 카테고리 추가
export const createCategory = async (data: { name: string; color: string }): Promise<Category> => {
    const res = await api.post<ApiResponse<{ category: Category }>>('/admin/categories', data);
    return res.data.data!.category;
};

// 카테고리 수정
export const updateCategory = async (
    id: string,
    data: Partial<{ name: string; color: string; order: number; isActive: boolean }>
): Promise<Category> => {
    const res = await api.patch<ApiResponse<{ category: Category }>>(`/admin/categories/${id}`, data);
    return res.data.data!.category;
};

// 카테고리 삭제
export const deleteCategory = async (id: string): Promise<void> => {
    await api.delete(`/admin/categories/${id}`);
};