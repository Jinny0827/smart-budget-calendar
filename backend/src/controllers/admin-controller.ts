import { Request, Response } from 'express';
import User from '../models/User';
import Group from '../models/Group';

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

        res.status(200).json({
            success: true,
            message: `${user.name}(${user.email}) 승인 완료`,
            data: { userId: user._id, status: user.status }
        });


    } catch (error) {
        console.error('회원 승인 에러:', error);
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

        res.status(200).json({
            success: true,
            message: `${user.name}(${user.email}) 거절 완료`,
            data: { userId: user._id, status: user.status }
        });

    } catch (error) {
        console.error('회원 거절 에러:', error);
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

        res.status(200).json({
            success: true,
            message: `"${group.name}" 그룹 승인 완료`,
            data: { groupId: group._id, inviteCode: group.inviteCode }
        });
    } catch (error) {
        console.error('그룹 승인 에러:', error);
        res.status(500).json({ success: false, message: '서버 에러가 발생했습니다' });
    }
};