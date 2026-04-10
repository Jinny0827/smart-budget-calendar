import { Router } from 'express';
import * as fc from '../controllers/finance-controller';
import { authenticationToken } from '../middleware/auth';

const router = Router();

// 인증 불필요
router.get('/autocomplete', fc.autoComplete);
router.get('/stock',        fc.stock);
router.get('/analyze',      fc.analyze);       // 비로그인도 분석 가능 (히스토리만 미저장)

// 인증 필요
router.get   ('/stocks',           authenticationToken, fc.getStocks);
router.post  ('/stocks',           authenticationToken, fc.addStock);
router.patch ('/stocks/:id',       authenticationToken, fc.updateStock);
router.delete('/stocks/:id',       authenticationToken, fc.removeStock);
router.get   ('/history',          authenticationToken, fc.getSearchHistory);
router.get   ('/portfolio/insight',authenticationToken, fc.getPortfolioInsight);

export default router;
