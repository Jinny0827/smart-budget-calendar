import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User';

// 닉네임 변경
export const updateNickname = async (req: Request, res: Response): Promise<void> => {
    try {
        const { nickname } = req.body;

        if (!nickname || nickname.trim() === '') {
            res.status(400).json({ success: false, message: '닉네임을 입력해주세요' });
            return;
        }

        const user = await User.findByIdAndUpdate(
            req.userId,
            { nickname: nickname.trim() },
            { new: true }
        ).select('-password -otpSecret');

        if (!user) {
            res.status(404).json({ success: false, message: '사용자를 찾을 수 없습니다' });
            return;
        }

         res.status(200).json({
             success: true,
             message: '닉네임이 변경되었습니다',
             data: { user }
         });
    } catch (error) {
        console.error('닉네임 변경 에러:', error);
        res.status(500).json({ success: false, message: '서버 에러가 발생했습니다' });
    }
}

// 비밀번호 변경
export const changePassword = async (req: Request, res: Response): Promise<void> => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            res.status(400).json({ success: false, message: '현재 비밀번호와 새 비밀번호를 입력해주세요' });
            return;
        }

        if (newPassword.length < 6) {
            res.status(400).json({ success: false, message: '새 비밀번호는 최소 6자 이상이어야 합니다' });
            return;
        }

        if (currentPassword === newPassword) {
            res.status(400).json({ success: false, message: '새 비밀번호가 현재 비밀번호와 동일합니다' });
            return;
        }

        const user = await User.findById(req.userId);
        if (!user) {
            res.status(404).json({ success: false, message: '사용자를 찾을 수 없습니다' });
            return;
        }

        // 현재 비밀번호 확인
        const isValid = await bcrypt.compare(currentPassword, user.password);
        if (!isValid) {
            res.status(401).json({ success: false, message: '현재 비밀번호가 올바르지 않습니다' });
            return;
        }

        // 새 비밀번호 해싱 후 저장
        user.password = await bcrypt.hash(newPassword, 10);
        await user.save();

        res.status(200).json({ success: true, message: '비밀번호가 변경되었습니다' });

    } catch (error) {
        console.error('비밀번호 변경 에러:', error);
        res.status(500).json({ success: false, message: '서버 에러가 발생했습니다' });
    }
};
