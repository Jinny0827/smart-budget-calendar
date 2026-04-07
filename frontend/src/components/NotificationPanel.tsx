import {useState, useEffect, useCallback} from "react";
import { useNavigate } from "react-router-dom";
import {
    getNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications,
    type Notification,
} from '../services/notification-service';


const TYPE_LEVEL: Record<string, string> = {
    invite:           '📩 그룹 초대',
    group_approved:   '✅ 그룹 승인',
    group_rejected:   '❌ 그룹 거절',
    user_approved:    '✅ 가입 승인',
    user_rejected:    '❌ 가입 거절',
    member_requested: '👋 참가 요청',
}

interface Props {
    onUnreadChange: (count: number) => void;
}

export function NotificationPanel({onUnreadChange}: Props) {
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchNotifications = async () => {
        try {
            const data = await getNotifications();
            setNotifications(data.notifications);
            onUnreadChange(data.unreadCount);
        } catch {
            // 실패 시 무시
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotifications()
    }, []);

    const handleClick = async (n: Notification) => {
        if(!n.isRead) {
            await markAsRead(n._id);
            setNotifications((prev) =>
                prev.map((item) => item._id === n._id ? { ...item, isRead: true } : item)
            );
            onUnreadChange(notifications.filter((item) => !item.isRead && item._id !== n._id).length);
        }
    }
}
