import {useState, useEffect, useRef, useCallback} from 'react';
import type { Message } from '../types';
import {
    getGroupMessages,
    getDirectMessages,
    sendMessage as sendMessageApi,
    markAsRead
} from '../services/message-service';

interface UseChatOptions {
    chatType: 'group' | 'direct';
    targetId: string; // groupId 또는 상대방 userId
    myId: string;
}

export const useChat = ({ chatType, targetId, myId }: UseChatOptions) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // 메시지 fetch 함수
    const fetchMessage = useCallback(async () => {
        try {
            const data = chatType === 'group'
                                ? await getGroupMessages(targetId)
                                : await getDirectMessages(targetId);
            setMessages(data);
        } catch (error) {
            console.error('메시지 조회 실패:', error);
        } finally {
            setLoading(false);
        }
    }, [chatType, targetId]);
    
    // 최초 조회 + 3초 폴링 시작
    useEffect(() => {
        if (!targetId) return;

        fetchMessage();
        intervalRef.current = setInterval(fetchMessage, 3000);

        // 채팅방 바뀌거나 언마운트 시 폴링 정리
        return () => {
            if(intervalRef.current) clearInterval(intervalRef.current);
        }
    }, [fetchMessage, targetId]);

    // 읽음 처리 - 내가 읽지 않은 메시지만
    useEffect(() => {
        messages
            .filter((m) => !m.readBy.includes(myId))
            .forEach((m) => markAsRead(m._id))
    }, [messages, myId]);

    // 메시지 전송
    const sendMessage = async (content: string) => {
        if (!content.trim() || sending) return;

        setSending(true);
        try {
            const newMessage = await sendMessageApi(chatType, content, targetId);
            setMessages((prev) => [...prev, newMessage]);
        } catch (error) {
            console.error('메시지 전송 실패:', error);
        } finally {
            setSending(false);
        }
    };

    return { messages, loading, sending, sendMessage };
}