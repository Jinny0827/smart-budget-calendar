// 인증 라우트
import express from 'express';
import { register, login, getMe } from '../controllers/auth-controller';
import { authenticationToken } from '../middleware/auth';


const router = express.Router();

// 회원가입
router.post('/register', register);

// 로그인
router.post('/login', login);

// 내정보 조회 (인증 필요)
router.post('/me', authenticationToken, getMe);

export default router;