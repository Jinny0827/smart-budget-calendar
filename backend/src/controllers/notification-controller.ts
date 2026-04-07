import { Request, Response } from "express";
import Notification from "../models/Notification";


// 내 알림 목록 조회
export const getNotifications  = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).user.id;
        const notifications = await Notification.find({ userId })
            .sort({ createdAt: -1 })
            .limit(50);

        const unreadCount = notifications.filter((n) => !n.isRead).length;
        res.json({ success: true, data: { notifications, unreadCount } });
    } catch {
        res.status(500).json({ success: false, message: '알림을 불러오는데 실패했습니다' });
    }
}


// 알림 읽음 처리 (단건)
export const markAsRead = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).user.id;
        const { id } = req.params;
        await Notification.findOneAndUpdate({ _id: id, userId }, { isRead: true });
        res.json({ success: true });
    } catch {
        res.status(500).json({ success: false, message: '읽음 처리에 실패했습니다' });
    }
};

// 전체 읽음 처리
export const markAllAsRead = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).user.id;
        await Notification.updateMany({ userId, isRead: false }, { isRead: true });
        res.json({ success: true });
    } catch {
        res.status(500).json({ success: false, message: '전체 읽음 처리에 실패했습니다' });
    }
};

// 알림 삭제 (단건)
export const deleteNotification = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).user.id;
        const { id } = req.params;
        await Notification.findOneAndDelete({ _id: id, userId });
        res.json({ success: true });
    } catch {
        res.status(500).json({ success: false, message: '삭제에 실패했습니다' });
    }
};

// 전체 삭제
export const deleteAllNotifications = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).user.id;
        await Notification.deleteMany({userId});
        res.json({success: true});
    } catch {
        res.status(500).json({success: false, message: '전체 삭제에 실패했습니다'});
    }
};

// 내부 알림 생성 헬퍼 (다른 컨트롤러에서 호출)
export const createNotification = async ({
                                             userId, type, message, link,
                                         }: {
    userId: string;
    type: string;
    message: string;
    link?: string;
}) => {
    try {
        await Notification.create({ userId, type, message, link });
    } catch (err) {
        // 알림 실패가 본 기능에 영향 주지 않도록 로깅만
        console.error('[Notification] 생성 실패:', err);
    }
};

