import { Request, Response} from "express";
import ActivityLog from "../models/ActivityLog";


export const getMyActivity = async (req: Request, res: Response): Promise<void> => {
    try {
        const logs = await ActivityLog.find({ userId: req.userId })
            .sort({ createdAt: -1 })
            .limit(100);
        res.status(200).json({ success: true, data: { logs } });
    } catch (error) {
        res.status(500).json({ success: false, message: '로그 조회 실패' });
    }
}