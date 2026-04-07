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

    const fetchNotifications = useCallback(async () => {
        try {
            const data = await getNotifications();
            setNotifications(data.notifications);
            onUnreadChange(data.unreadCount);
        } catch {
            // 실패 시 무시
        } finally {
            setLoading(false);
        }
    }, [onUnreadChange]);

    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    const handleClick = async (n: Notification) => {
        if (!n.isRead) {
            await markAsRead(n._id);
            setNotifications((prev) =>
                prev.map((item) => item._id === n._id ? { ...item, isRead: true } : item)
            );
            onUnreadChange(notifications.filter((item) => !item.isRead && item._id !== n._id).length);
        }
        if (n.link) {
            navigate(n.link);
        }
    };

    const handleMarkAllAsRead = async () => {
        await markAllAsRead();
        setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })));
        onUnreadChange(0);
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        await deleteNotification(id);
        const updated = notifications.filter((item) => item._id !== id);
        setNotifications(updated);
        onUnreadChange(updated.filter((item) => !item.isRead).length);
    };

    const handleDeleteAll = async () => {
        await deleteAllNotifications();
        setNotifications([]);
        onUnreadChange(0);
    };

    if (loading) {
        return <div className="notification-panel-loading">불러오는 중...</div>;
    }

    return (
        <div className="notification-panel">
            <div className="notification-panel-header">
                <span>알림</span>
                <div className="notification-panel-actions">
                    <button onClick={handleMarkAllAsRead}>모두 읽음</button>
                    <button onClick={handleDeleteAll}>모두 삭제</button>
                </div>
            </div>
            {notifications.length === 0 ? (
                <div className="notification-panel-empty">알림이 없습니다.</div>
            ) : (
                <ul className="notification-panel-list">
                    {notifications.map((n) => (
                        <li
                            key={n._id}
                            className={`notification-item ${n.isRead ? 'read' : 'unread'}`}
                            onClick={() => handleClick(n)}
                        >
                            <div className="notification-item-type">
                                {TYPE_LEVEL[n.type] ?? n.type}
                            </div>
                            <div className="notification-item-message">{n.message}</div>
                            <button
                                className="notification-item-delete"
                                onClick={(e) => handleDelete(e, n._id)}
                            >
                                ✕
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
