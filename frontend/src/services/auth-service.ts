import api from './api';
import type { ApiResponse, AuthResponse, User } from "../types";


// 회원 가입
export const register = async (
    email: string,
    password: string,
    name: string,
): Promise<AuthResponse> => {
    const response = await api.post<ApiResponse<AuthResponse>>('/auth/register', {
        email,
        password,
        name
    })

    if (response.data.data) {
        localStorage.setItem('token', response.data.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.data.user));
    }

    return response.data.data!;
}

// 로그인
export const login = async (
    email: string,
    password: string,
): Promise<AuthResponse> => {
    const response = await api.post<ApiResponse<AuthResponse>>('/auth/login', {
        email,
        password,
    })

    // 토큰과 사용자 정보 저장
    if (response.data.data) {
        localStorage.setItem('token', response.data.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.data.user));
    }

    return response.data.data!;
}

// 로그아웃
export const logout = (): void => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
};

// 내 정보 조회
export const getMe = async (): Promise<User> => {
    const response = await api.get<ApiResponse<{ user: User }>>('/auth/me');
    return response.data.data!.user;
};

// 로그인 상태 확인
export const isAuthenticated = (): boolean => {
    return !!localStorage.getItem('token');
};

// 저장된 사용자 정보 가져오기
export const getCurrentUser = (): User | null => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
};
