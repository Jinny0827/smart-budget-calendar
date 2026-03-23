import rateLimit from 'express-rate-limit';
import MongoDBStore from 'rate-limit-mongo';
import dotenv from 'dotenv';
dotenv.config();

const makeStore = (expireMs: number) => new MongoDBStore({
    uri: process.env.MONGODB_URI!,
    collectionName: 'rateLimits',
    expireTimeMs: expireMs
});

// 로그인 전용 - 5번 실패 시 15분 차단
export const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    store: makeStore(15 * 60 * 1000),
    skipSuccessfulRequests: true,
    message: {
        success: false,
        message: '로그인 시도가 너무 많습니다. 15분 후 다시 시도해주세요.'
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

// 일반 API 전체 - 1분에 100번
export const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 100,
    store: makeStore(60 * 1000),
    message: {
        success: false,
        message: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});
