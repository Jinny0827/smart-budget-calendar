import ActivityLog from "../models/ActivityLog";

export const logActivity  = (
    userId: string,
    action: string,
    target: string,
    targetId?: string,
    meta?: object,
    status: 'success' | 'failed' = 'success'   // 추가, 기본값 success
) => {
    ActivityLog.create({userId, action, target, targetId, meta, status}).catch(() => {});
};