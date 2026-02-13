import express from 'express';
import {
    getSchedules,
    createSchedule,
    getSchedule,
    updateSchedule,
    deleteSchedule
} from "../controllers/schedule-controller";
import { authenticationToken } from "../middleware/auth";

const router = express.Router();

// 모든 라우트에 인증 미들웨어 적용
router.use(authenticationToken);

// 일정 목록 조회
router.get('/', getSchedules);

// 일정 생성
router.post('/', createSchedule);

// 일정 상세 조회
router.get('/:id', getSchedule);

// 일정 수정
router.put('/:id', updateSchedule);

// 일정 삭제
router.delete('/:id', deleteSchedule);

export default router;