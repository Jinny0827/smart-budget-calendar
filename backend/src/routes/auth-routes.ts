import express from 'express';
import {
    register,
    login,
    getMe,
    verifyOtp,
    setupOtp,
    enableOtp,
    disableOtp
} from '../controllers/auth-controller';
import { authenticationToken } from '../middleware/auth';
import { loginLimiter, authLimiter } from "../middleware/rate-limit";


const router = express.Router();

// 회원가입
router.post('/register', authLimiter, register);

// 로그인 1단계 (이메일 + 비밀번호)
router.post('/login', loginLimiter, login);

// 로그인 2단계 (OTP 검증) — 인증 불필요, tempToken으로 처리
router.post('/otp/verify', authLimiter, verifyOtp);

// 내정보 조회 (인증 필요)
router.post('/me', authenticationToken, getMe);

// OTP 설정 (이하 전부 로그인된 유저만)
router.post('/otp/setup', authenticationToken, setupOtp);
router.post('/otp/enable', authenticationToken, enableOtp);
router.post('/otp/disable', authenticationToken, disableOtp);


export default router;