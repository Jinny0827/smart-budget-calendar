import express from "express";
import {authenticationToken} from "../middleware/auth";
import {analyzeInsights, getInsights, suggestBugget} from "../controllers/insight-controller";

const router = express.Router();

router.use(authenticationToken);

//AI 인사이트 목록 조회
router.get('/', getInsights);

// 수동 분석 트리거
router.get('/analyze', analyzeInsights);

// 특정 일정 예산 추천
router.get('/budget/:scheduleId', suggestBugget);

export default router;