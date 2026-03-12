import api from './api';
import type { ApiResponse, Message} from "../types";

// 메시지 전송
export const sendMessage = async (
    chatType: 'group' | 'direct',
    content: string,
    targetId: string // groupId / recipientId
): Promise<Message> => {
    const body = chatType === 'group'
        ? { chatType, content, groupId: targetId }
        : { chatType, content, recipientId: targetId };

    const response = await api.post<ApiResponse<Message>>('/messages', body);
    return response.data.data!;
}

// 그룹 채팅 메시지 조회
export const getGroupMessages = async (
    groupId: string,
    before?: string
): Promise<Message[]> => {
    const params = new URLSearchParams({ limit: '50'});
    if(before) {
        params.append('before', before);
    }

    const response = await api.get<ApiResponse<Message[]>>(
        `/messages/group/${groupId}?${params}`
    );

    return response.data.data ?? [];
}

// 1:1 채팅 메시지 조회
export const getDirectMessages = async (
    userId: string,
    before?: string
): Promise<Message[]> => {
    const params = new URLSearchParams({ limit: '50' });
    if (before) params.append('before', before);

    const response = await api.get<ApiResponse<Message[]>>(
        `/messages/direct/${userId}?${params}`
    );
    return response.data.data ?? [];
};

// 읽음 처리
export const markAsRead = async (messageId: string): Promise<void> => {
    await api.patch(`/messages/read/${messageId}`);
};