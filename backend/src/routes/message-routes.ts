import { Router } from 'express';
import { authenticationToken } from '../middleware/auth';
import {
    sendMessage,
    getGroupMessage,
    getDirectMessages,
    markAsRead
} from '../controllers/message-controller';

const router = Router();

router.use(authenticationToken);

router.post('/', sendMessage);
router.get('/group/:groupId', getGroupMessage);
router.get('/direct/:userId', getDirectMessages);
router.patch('/read/:messageId', markAsRead);

export default router;