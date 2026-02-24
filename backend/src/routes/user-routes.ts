import express from 'express';
import { updateNickname, changePassword } from '../controllers/user-controller';
import { authenticationToken } from '../middleware/auth';

const router = express.Router();

router.patch('/nickname', authenticationToken, updateNickname);
router.patch('/password', authenticationToken, changePassword);

export default router;