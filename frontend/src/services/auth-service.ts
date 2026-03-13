import api from './api';
import type { ApiResponse, LoginResponse, RegisterResponse, OtpVerifyResponse, User } from "../types";


// 회원 가입
export const register = async (
    email: string,
    password: string,
    name: string,
): Promise<RegisterResponse> => {
    const response = await api.post<ApiResponse<RegisterResponse>>('/auth/register', {
        email,
        password,
        name
    })

    return response.data.data!;
}

// 로그인
export const login = async (
    email: string,
    password: string,
): Promise<LoginResponse> => {

    const response = await api.post<ApiResponse<LoginResponse>>('/auth/login', {
        email,
        password,
    })

    const data = response.data.data!;

    // OTP 미사용 직접 로그인 시에만 로컬 저장
    if(data.token && data.user) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
    }

    return data;
}

// 로그아웃
export const logout = (): void => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
};

// 내 정보 조회
export const getMe = async (): Promise<User> => {
    const response = await api.post<ApiResponse<{ user: User }>>('/auth/me');
    return response.data.data!.user;
};

// 로그인 상태 확인
export const isAuthenticated = (): boolean => {
    return !!localStorage.getItem('token');
};

// 저장된 사용자 정보 가져오기
export const getCurrentUser = (): User | null => {
    const userStr = localStorage.getItem('user');
    if (!userStr || userStr === 'undefined') return null;
    try {
        const user = JSON.parse(userStr);
        // _id만 있고 id가 없는 경우 정규화
        if (user && !user.id && user._id) {
            user.id = user._id;
        }
        return user;
    } catch {
        return null;
    }
};

// OTP 검증 (2단계 로그인 완료) — tempToken으로 검증 후 실제 토큰 발급
export const verifyOtp = async (tempToken: string, code: string):Promise<OtpVerifyResponse> => {
    const response = await api.post<ApiResponse<OtpVerifyResponse>>('/auth/otp/verify', {
        tempToken,
        code,
    });

    const data = response.data.data!;
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));

    return data;
}

// OTP 설정 초기화 — QR코드 및 시크릿 반환
export const setupOtp = async (): Promise<{ qrCode: string; secret: string }> => {
    const response = await api.post<ApiResponse<{ qrCode: string; secret: string }>>('/auth/otp/setup');
    return response.data.data!;
};

// OTP 활성화
export const enableOtp = async (code: string): Promise<void> => {
    await api.post('/auth/otp/enable', { code });
};

// OTP 비활성화
export const disableOtp = async (code: string): Promise<void> => {
    await api.post('/auth/otp/disable', { code });
};