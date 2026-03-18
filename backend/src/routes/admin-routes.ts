import express from 'express';
import {
    getUsers, approveUser, rejectUser,
    getGroups, approveGroup, rejectGroup,
    getCategories, getAllCategories, createCategory, updateCategory, deleteCategory,
} from '../controllers/admin-controller';
import { authenticationToken, requireAdmin } from '../middleware/auth';

const router = express.Router();

// 사용자 관리
router.get('/users', authenticationToken, requireAdmin, getUsers);
router.patch('/users/:id/approve', authenticationToken, requireAdmin, approveUser);
router.patch('/users/:id/reject', authenticationToken, requireAdmin, rejectUser);

// 그룹 관리
router.get('/groups', authenticationToken, requireAdmin, getGroups);
router.patch('/groups/:id/approve', authenticationToken, requireAdmin, approveGroup);
router.patch('/groups/:id/reject', authenticationToken, requireAdmin, rejectGroup);

// 카테고리 관리
router.get('/categories', authenticationToken, getCategories);                          // 일반 사용자: 활성 카테고리만
router.get('/categories/all', authenticationToken, requireAdmin, getAllCategories);      // 관리자: 비활성 포함
router.post('/categories', authenticationToken, requireAdmin, createCategory);
router.patch('/categories/:id', authenticationToken, requireAdmin, updateCategory);
router.delete('/categories/:id', authenticationToken, requireAdmin, deleteCategory);

export default router;
