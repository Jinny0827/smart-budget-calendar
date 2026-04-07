import api from './api';

export interface Notification {
    _id: string;
    type: 'invite' | 'group_approved' | 'group_rejected' | 'user_approved' | 'user_rejected' | 'member_requested';
    message: string;
    isRead: boolean;
    link?: string;
    createdAt: string;
}

// 내 알림 목록 조회
export const getNotifications = async (): Promise<{ notifications: Notification[]; unreadCount: number }> => {
    const res = await api.get('/notifications');
    return res.data.data;
};

// 단건 읽음 처리
export const markAsRead = async (id: string): Promise<void> => {
    await api.patch(`/notifications/${id}/read`);
};

// 전체 읽음 처리
export const markAllAsRead = async (): Promise<void> => {
    await api.patch('/notifications/read-all');
};

// 단건 삭제
export const deleteNotification = async (id: string): Promise<void> => {
    await api.delete(`/notifications/${id}`);
};

// 전체 삭제
export const deleteAllNotifications = async (): Promise<void> => {
    await api.delete('/notifications');
};