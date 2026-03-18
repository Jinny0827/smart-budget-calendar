import express from 'express';
import {getUsers, approveUser, rejectUser, getGroups, approveGroup, rejectGroup} from '../controllers/admin-controller';
import { authenticationToken, requireAdmin } from '../middleware/auth';

const router = express.Router();

router.get('/users', authenticationToken, requireAdmin, getUsers);
router.patch('/users/:id/approve', authenticationToken, requireAdmin, approveUser);
router.patch('/users/:id/reject', authenticationToken, requireAdmin, rejectUser);
router.get('/groups', authenticationToken, requireAdmin, getGroups);
router.patch('/groups/:id/approve', authenticationToken, requireAdmin, approveGroup);
router.patch('/groups/:id/reject', authenticationToken, requireAdmin, rejectGroup);


export default router;
