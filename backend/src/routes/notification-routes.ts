import { Router } from 'express';
import { authenticationToken } from '../middleware/auth';
import {
    getNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications,
} from '../controllers/notification-controller';


const router = Router();

router.get('/',              authenticationToken, getNotifications);
router.patch('/:id/read',   authenticationToken, markAsRead);
router.patch('/read-all',   authenticationToken, markAllAsRead);
router.delete('/:id',       authenticationToken, deleteNotification);
router.delete('/',          authenticationToken, deleteAllNotifications);

export default router;