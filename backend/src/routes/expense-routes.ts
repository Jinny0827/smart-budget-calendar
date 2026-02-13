import express from 'express';
import {
    getExpenses,
    createExpense,
    getExpense,
    updateExpense,
    deleteExpense,
    getExpenseStats
} from '../controllers/expense-controller';
import { authenticationToken } from '../middleware/auth';

const router = express.Router();

// 모든 라우트에 인증 미들웨어 적용
router.use(authenticationToken);

// 통계 조회 (일반 라우트보다 먼저 정의해야 함)
router.get('/stats', getExpenseStats);

// 지출 목록 조회
router.get('/', getExpenses);

// 지출 생성
router.post('/', createExpense);

// 지출 상세 조회
router.get('/:id', getExpense);

// 지출 수정
router.put('/:id', updateExpense);

// 지출 삭제
router.delete('/:id', deleteExpense);

export default router;