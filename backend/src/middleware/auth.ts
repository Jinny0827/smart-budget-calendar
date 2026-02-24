import { Request, Response, NextFunction } from 'express';
import { verifyToken } from "../utils/jwt";


// JWT 인증 미들웨어
export const authenticationToken = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        // Authorization 헤더에서 토큰 추출
        const authHeader = req.headers.authorization;
        // Bearer Token
        const token = authHeader && authHeader.split( ' ')[1];


        if(!token) {
            res.status(401).json({
                success: false,
                message: '인증 토큰이 필요합니다.'
            });

            return;
        }

        const { userId, role } = verifyToken(token);
        req.userId = userId;
        req.role = role;

        next();
    } catch (error) {
        res.status(403).json({
            success: false,
            message: '유효하지 않은 토큰입니다'
        });
    }
};

// 어드민 전용 미들웨어
export const requireAdmin = (
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    if (req.role !== 'admin') {
        res.status(403).json({
            success: false,
            message: '관리자 권한이 필요합니다.'
        });
        return;
    }
    next();
}
