import { Request, Response } from 'express';
import User from '../models/User';
import Group from '../models/Group';
import Category from '../models/Category';
import { logActivity } from '../utils/activity-logger';

// 전체 회원 목록 조회 (status 필터 가능)
export const getUsers = async (req: Request, res: Response):Promise<void>  => {
    try {
        // ?status=pending 같은 쿼리 파라미터로 필터링 가능
        // 회원 상태에 따른 필터링
        const { status } = req.query;

        const filter: Record<string, any> = {};
        if (status && ['pending', 'approved', 'rejected'].includes(status as string)) {
            filter.status = status;
        }

        // 최신 가입 순 (DESC)
        const users = await User.find(filter)
            .select('-password -otpSecret')
            .sort({ createdAt: -1 });

        const mappedUsers = users.map(u => ({
            id: u._id,
            email: u.email,
            name: u.name,
            nickname: u.nickname,
            role: u.role,
            status: u.status,
            otpEnabled: u.otpEnabled,
        }));

        res.status(200).json({
            success: true,
            data: { users: mappedUsers, total: mappedUsers.length }
        });

    } catch (error) {
        console.error('회원 목록 조회 에러:', error);
        res.status(500).json({ success: false, message: '서버 에러가 발생했습니다' });
    }
}

// 회원 승인
export const approveUser = async (req: Request, res: Response):Promise<void>  => {
    try {
        const { id } = req.params;

        const user = await User.findById(id);
        if (!user) {
            res.status(404).json({ success: false, message: '사용자를 찾을 수 없습니다' });
            return;
        }

        if (user.status === 'approved') {
            res.status(400).json({ success: false, message: '이미 승인된 사용자입니다' });
            return;
        }

        user.status = 'approved';
        await user.save();

        logActivity(req.userId!, 'admin_approve_user', 'user', user._id.toString(), { name: user.name });
        res.status(200).json({
            success: true,
            message: `${user.name}(${user.email}) 승인 완료`,
            data: { userId: user._id, status: user.status }
        });

    } catch (error) {
        console.error('회원 승인 에러:', error);
        logActivity(req.userId!, 'admin_approve_user', 'user', undefined, undefined, 'failed');
        res.status(500).json({ success: false, message: '서버 에러가 발생했습니다' });
    }
};

// 회원 거절
export const rejectUser = async (req: Request, res: Response):Promise<void>  => {
    try {
        const { id } = req.params;

        const user = await User.findById(id);
        if (!user) {
            res.status(404).json({ success: false, message: '사용자를 찾을 수 없습니다' });
            return;
        }

        if (user.status === 'rejected') {
            res.status(400).json({ success: false, message: '이미 거절된 사용자입니다' });
            return;
        }

        user.status = 'rejected';
        await user.save();

        logActivity(req.userId!, 'admin_reject_user', 'user', user._id.toString(), { name: user.name });
        res.status(200).json({
            success: true,
            message: `${user.name}(${user.email}) 거절 완료`,
            data: { userId: user._id, status: user.status }
        });

    } catch (error) {
        console.error('회원 거절 에러:', error);
        logActivity(req.userId!, 'admin_reject_user', 'user', undefined, undefined, 'failed');
        res.status(500).json({ success: false, message: '서버 에러가 발생했습니다' });
    }
};

// 그룹 목록 조회 (?status=pending 필터 가능)
export const getGroups = async (req: Request, res: Response): Promise<void> => {
    try {
        const { status } = req.query;

        const filter: Record<string, any> = {};
        if (status && ['pending', 'active'].includes(status as string)) {
            filter.status = status;
        }

        const groups = await Group.find(filter)
            .populate('leaderId', 'name email')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: { groups, total: groups.length }
        });
    } catch (error) {
        console.error('그룹 목록 조회 에러:', error);
        res.status(500).json({ success: false, message: '서버 에러가 발생했습니다' });
    }
};

// 그룹 승인
export const approveGroup = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        const group = await Group.findById(id);
        if (!group) {
            res.status(404).json({ success: false, message: '그룹을 찾을 수 없습니다' });
            return;
        }

        if (group.status === 'active') {
            res.status(400).json({ success: false, message: '이미 승인된 그룹입니다' });
            return;
        }

        group.status = 'active';
        await group.save();

        logActivity(req.userId!, 'admin_approve_group', 'group', group._id.toString(), { name: group.name });
        res.status(200).json({
            success: true,
            message: `"${group.name}" 그룹 승인 완료`,
            data: { groupId: group._id, inviteCode: group.inviteCode }
        });
    } catch (error) {
        console.error('그룹 승인 에러:', error);
        logActivity(req.userId!, 'admin_approve_group', 'group', undefined, undefined, 'failed');
        res.status(500).json({ success: false, message: '서버 에러가 발생했습니다' });
    }
};

// 그룹 거절
export const rejectGroup = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const group = await Group.findById(id);
        if (!group) {
            res.status(404).json({ success: false, message: '그룹을 찾을 수 없습니다' });
            return;
        }
        if (group.status !== 'pending') {
            res.status(400).json({ success: false, message: '대기 중인 그룹만 거절할 수 있습니다' });
            return;
        }

        await Group.findByIdAndDelete(id);

        logActivity(req.userId!, 'admin_reject_group', 'group', id, { name: group.name });
        res.status(200).json({ success: true, message: `"${group.name}" 그룹 거절 및 삭제 완료` });
    } catch (error) {
        console.error('그룹 거절 에러:', error);
        logActivity(req.userId!, 'admin_reject_group', 'group', undefined, undefined, 'failed');
        res.status(500).json({ success: false, message: '서버 에러가 발생했습니다' });
    }
};

// ─── 카테고리 관리 ────────────────────────────────────────────

const DEFAULT_CATEGORIES = [
    { name: '식비',  color: '#FF6384', order: 1 },
    { name: '교통',  color: '#36A2EB', order: 2 },
    { name: '의료',  color: '#FF9F40', order: 3 },
    { name: '운동',  color: '#4BC0C0', order: 4 },
    { name: '여행',  color: '#9966FF', order: 5 },
    { name: '쇼핑',  color: '#FF6B6B', order: 6 },
    { name: '문화',  color: '#C9CBCF', order: 7 },
    { name: '교육',  color: '#FFCD56', order: 8 },
    { name: '기타',  color: '#B0BEC5', order: 9 },
];

// 카테고리 목록 조회 (인증된 사용자 전용, 활성만)
export const getCategories = async (_req: Request, res: Response): Promise<void> => {
    try {
        let categories = await Category.find({ isActive: true }).sort({ order: 1, name: 1 });

        // DB가 비어있으면 기본 카테고리 자동 생성
        if (categories.length === 0) {
            await Category.insertMany(DEFAULT_CATEGORIES);
            categories = await Category.find({ isActive: true }).sort({ order: 1, name: 1 });
        }

        res.status(200).json({ success: true, data: { categories } });
    } catch (error) {
        console.error('카테고리 목록 조회 에러:', error);
        res.status(500).json({ success: false, message: '서버 에러가 발생했습니다' });
    }
};

// 카테고리 전체 목록 (관리자용, 비활성 포함)
export const getAllCategories = async (_req: Request, res: Response): Promise<void> => {
    try {
        const categories = await Category.find().sort({ order: 1, name: 1 });
        res.status(200).json({ success: true, data: { categories } });
    } catch (error) {
        console.error('카테고리 전체 조회 에러:', error);
        res.status(500).json({ success: false, message: '서버 에러가 발생했습니다' });
    }
};

// 카테고리 추가
export const createCategory = async (req: Request, res: Response): Promise<void> => {
    try {
        const { name, color, order } = req.body;
        if (!name?.trim()) {
            res.status(400).json({ success: false, message: '카테고리 이름은 필수입니다' });
            return;
        }

        const existing = await Category.findOne({ name: name.trim() });
        if (existing) {
            res.status(400).json({ success: false, message: '이미 존재하는 카테고리입니다' });
            return;
        }

        const maxOrder = await Category.findOne().sort({ order: -1 }).select('order');
        const category = await Category.create({
            name: name.trim(),
            color: color || '#B0BEC5',
            order: order ?? (maxOrder ? (maxOrder as any).order + 1 : 1),
        });

        logActivity(req.userId!, 'admin_create_category', 'category', category._id.toString(), { name: category.name });
        res.status(201).json({ success: true, data: { category } });
    } catch (error) {
        console.error('카테고리 추가 에러:', error);
        logActivity(req.userId!, 'admin_create_category', 'category', undefined, undefined, 'failed');
        res.status(500).json({ success: false, message: '서버 에러가 발생했습니다' });
    }
};

// 카테고리 수정
export const updateCategory = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { name, color, order, isActive } = req.body;

        const category = await Category.findById(id);
        if (!category) {
            res.status(404).json({ success: false, message: '카테고리를 찾을 수 없습니다' });
            return;
        }

        if (name !== undefined) category.name = name.trim();
        if (color !== undefined) category.color = color;
        if (order !== undefined) category.order = order;
        if (isActive !== undefined) category.isActive = isActive;

        await category.save();
        logActivity(req.userId!, 'admin_update_category', 'category', category._id.toString(), { name: category.name });
        res.status(200).json({ success: true, data: { category } });
    } catch (error) {
        console.error('카테고리 수정 에러:', error);
        logActivity(req.userId!, 'admin_update_category', 'category', undefined, undefined, 'failed');
        res.status(500).json({ success: false, message: '서버 에러가 발생했습니다' });
    }
};

// 카테고리 삭제
export const deleteCategory = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const category = await Category.findByIdAndDelete(id);
        if (!category) {
            res.status(404).json({ success: false, message: '카테고리를 찾을 수 없습니다' });
            return;
        }
        logActivity(req.userId!, 'admin_delete_category', 'category', id, { name: category.name });
        res.status(200).json({ success: true, message: `"${category.name}" 카테고리가 삭제되었습니다` });
    } catch (error) {
        console.error('카테고리 삭제 에러:', error);
        logActivity(req.userId!, 'admin_delete_category', 'category', undefined, undefined, 'failed');
        res.status(500).json({ success: false, message: '서버 에러가 발생했습니다' });
    }
};