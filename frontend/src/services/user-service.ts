import api from './api';
import type { ApiResponse, User } from "../types";

// 닉네임 변경
export const updateNickname = async (nickname: string): Promise<User> => {
    const response = await api.patch<ApiResponse<{ user: User }>>('/users/nickname', {
        nickname,
    });

    const user = response.data.data!.user;

    // 로컬에 저장된 사용자 정보도 갱신
    localStorage.setItem('user', JSON.stringify(user));

    return user;
};


// 비밀번호 변경
export const changePassword = async (
    currentPassword: string,
    newPassword: string,
): Promise<void> => {
    await api.patch('/users/password', {
        currentPassword,
        newPassword,
    });
};

// 회원탈퇴
export const deleteAccount = async (password: string): Promise<void> => {
    await api.delete('/users/me', { data: { password } });
};

