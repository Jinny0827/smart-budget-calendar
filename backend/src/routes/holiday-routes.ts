import express from 'express';
import { getHolidays } from '../controllers/holiday-controller';
import { authenticationToken } from '../middleware/auth';

const router = express.Router();

router.use(authenticationToken);
router.get('/', getHolidays);

export default router;