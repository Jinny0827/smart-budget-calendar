import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import MongoDBStore from 'rate-limit-mongo';
import dotenv from 'dotenv';
import { verifyToken } from '../utils/jwt';
dotenv.config();

const makeStore = (expireMs: number) => new MongoDBStore({
    uri: process.env.MONGODB_URI!,
    collectionName: 'rateLimits',
    expireTimeMs: expireMs
});

// 로그인 전용 - IP 기준 1분에 20번 초과 시 차단 (MongoDB store: 다중 인스턴스 공유)
export const loginLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 20,
    store: makeStore(60 * 1000),
    skipSuccessfulRequests: true,
    keyGenerator: (req) => ipKeyGenerator(req.ip ?? ''),
    message: {
        success: false,
        message: '로그인 시도가 너무 많습니다. 잠시 후 다시 시도해주세요.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// 인증 관련 (회원가입, OTP 등) - 10분에 10번
export const authLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    limit: 10,
    store: makeStore(10 * 60 * 1000),
    message: {
        success: false,
        message: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// 일반 API 전체 - 1분에 100번 (로그인 유저는 userId 기준, 비로그인은 IP 기준)
export const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 100,
    store: makeStore(60 * 1000),
    keyGenerator: (req) => {
        try {
            const token = req.headers.authorization?.split(' ')[1];
            if (token) {
                const decoded = verifyToken(token) as any;
                return decoded.userId;
            }
        } catch {
            // 토큰 없거나 만료 시 IP로 폴백
        }
        return ipKeyGenerator(req.ip ?? '');
    },
    message: {
        success: false,
        message: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});
