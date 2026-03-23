import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Group from '../models/Group';
import User from '../models/User';
import { sendInviteNotification } from '../services/notification-service';
import { logActivity } from '../utils/activity-logger';


// 그룹 생성 요청
export const createGroup = async (req: Request, res: Response): Promise<void> => {
    try {
        const { name } = req.body;

        if(!name || name.trim() === '') {
            res.status(400).json({ success: false, message: '그룹명을 입력해주세요' });
            return;
        }

        const group = await Group.create({
            name: name.trim(),
            leaderId: req.userId,
            members: [{
                userId: req.userId,
                status: 'active',
                method: 'invite',
                requestedAt: new Date(),
                joinedAt: new Date()
            }]
            // status: 'pending', inviteCode는 pre-save 훅에서 자동 생성
        });

        logActivity(req.userId!, 'create_group', 'group', group._id.toString(), { name: group.name });
        res.status(201).json({
            success: true,
            message: '그룹 생성 요청이 완료되었습니다. 관리자 승인 후 사용 가능합니다.',
            data: { groupId: group._id, name: group.name, status: group.status }
        });

    } catch (error) {
        console.error('그룹 생성 에러:', error);
        logActivity(req.userId!, 'create_group', 'group', undefined, undefined, 'failed');
        res.status(500).json({ success: false, message: '서버 에러가 발생했습니다' });
    }
}

// 그룹 조회
// 내 그룹 목록(그룹장 or 활성 멤버)
export const getMyGroups = async (req: Request, res: Response): Promise<void> => {
    try {
        const groups = await Group.find({
            status: 'active',
            $or: [
                { leaderId: req.userId },
                { members: { $elemMatch: { userId: req.userId, status: 'active' } } }
            ]
        })
            .populate('leaderId', 'name nickname')
            .populate('members.userId', 'name nickname lastMessageAt')

        res.status(200).json({success: true, data: { groups }});
    } catch (error) {
        console.error('그룹 목록 조회 에러:', error);
        res.status(500).json({ success: false, message: '서버 에러가 발생했습니다' });
    }
}

// 그룹 상세 조회
export const getGroupById = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        const group = await Group.findById(id)
            .populate('leaderId', 'name nickname email')
            .populate('members.userId', 'name nickname email lastLoginAt')

        if (!group) {
            res.status(404).json({ success: false, message: '그룹을 찾을 수 없습니다' });
            return;
        }

        const isLeader =
            ((group.leaderId as any)._id?.toString() ?? group.leaderId.toString()) === req.userId;

        const isMember =
            group.members.some(m => {
                const memberId = (m.userId as any)?._id.toString() ?? (m.userId as any)?.toString();
                return memberId === req.userId && m.status === 'active';
            })

        if (!isLeader && !isMember) {
            res.status(403).json({ success: false, message: '그룹 접근 권한이 없습니다' });
            return;
        }

        // 그룹 내 회원 상태 변경에 대한 예외 처리
        const groupObj = group.toObject();
        groupObj.members = groupObj.members.filter((m: any) => m.userId != null);

        res.status(200).json({ success: true, data: { group: groupObj } });
    } catch (error) {
        console.error('그룹 상세 조회 에러:', error);
        res.status(500).json({ success: false, message: '서버 에러가 발생했습니다' });
    }
}

// 그룹 설정 및 초대 코드 (그룹장 전용 기능)
// 공유 설정 변경 (그룹장만 가능)
export const updateSettings = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { shareSchedules, shareExpenses, showAmounts, showMemberNames, mergedInsights } = req.body;

        const group = await Group.findById(id);
        if (!group) {
            res.status(404).json({ success: false, message: '그룹을 찾을 수 없습니다' });
            return;
        }

        if (group.leaderId.toString() !== req.userId) {
            res.status(403).json({ success: false, message: '그룹장만 설정을 변경할 수 있습니다' });
            return;
        }

        if (shareSchedules !== undefined) group.settings.shareSchedules = shareSchedules;
        if (shareExpenses !== undefined) group.settings.shareExpenses = shareExpenses;
        if (showAmounts !== undefined) group.settings.showAmounts = showAmounts;
        if (showMemberNames !== undefined) group.settings.showMemberNames = showMemberNames;
        if (mergedInsights !== undefined) group.settings.mergedInsights = mergedInsights;

        await group.save();

        res.status(200).json({
            success: true,
            message: '그룹 설정이 변경되었습니다',
            data: { settings: group.settings }
        });

    } catch (error) {
        console.error('그룹 설정 변경 에러:', error);
        res.status(500).json({ success: false, message: '서버 에러가 발생했습니다' });
    }
}

// 초대 코드 재발급 (그룹장만 가능)
export const refreshInviteCode = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        const group = await Group.findById(id);
        if (!group) {
            res.status(404).json({ success: false, message: '그룹을 찾을 수 없습니다' });
            return;
        }

        if (group.leaderId.toString() !== req.userId) {
            res.status(403).json({ success: false, message: '그룹장만 초대 코드를 재발급할 수 있습니다' });
            return;
        }

        // 초대 코드 변경 값 설정
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let newCode = '';
        for (let i = 0; i < 6; i++) {
            newCode += chars.charAt(Math.floor(Math.random() * chars.length));
        }

        group.inviteCode = newCode;
        await group.save();

        res.status(200).json({
            success: true,
            message: '초대 코드가 재발급되었습니다',
            data: { inviteCode: group.inviteCode }
        });
    } catch (error) {
        console.error('초대 코드 재발급 에러:', error);
        res.status(500).json({ success: false, message: '서버 에러가 발생했습니다' });
    }
}

// A 방식 초대(그룹장 -> 멤버 / 그룹장만 사용 가능)
export const inviteMember = async (req: Request, res: Response): Promise<void> => {
    try {
        const {id} = req.params;
        const {email} = req.body;

        const group = await Group.findById(id);
        if (!group) {
            res.status(404).json({ success: false, message: '그룹을 찾을 수 없습니다' });
            return;
        }

        if (group.leaderId.toString() !== req.userId) {
            res.status(403).json({ success: false, message: '그룹장만 멤버를 초대할 수 있습니다' });
            return;
        }

        if (group.status !== 'active') {
            res.status(400).json({ success: false, message: '승인된 그룹에서만 초대할 수 있습니다' });
            return;
        }

        const targetUser = await User.findOne({ email });
        if (!targetUser) {
            res.status(404).json({ success: false, message: '해당 이메일의 사용자를 찾을 수 없습니다' });
            return;
        }

        if (targetUser._id.toString() === req.userId) {
            res.status(400).json({ success: false, message: '자기 자신을 초대할 수 없습니다' });
            return;
        }

        const existing = group.members.find(m => m.userId.toString() === targetUser._id.toString() &&
                                            ['active', 'leader_invited', 'member_requested'].includes(m.status));
        if(existing) {
            res.status(400).json({ success: false, message: '이미 초대되었거나 멤버인 사용자입니다' });
            return;
        }

        group.members.push({
            userId: targetUser._id as mongoose.Types.ObjectId,
            status: 'leader_invited',
            method: 'invite',
            requestedAt: new Date()
        });

        await group.save();

        await sendInviteNotification(targetUser._id.toString(), group.name);

        res.status(200).json({
            success: true,
            message: `${targetUser.name}(${email})에게 초대를 전송했습니다`
        });
    } catch (error) {
        console.error('멤버 초대 에러:', error);
        res.status(500).json({ success: false, message: '서버 에러가 발생했습니다' });
    }
}

// A방식: 초대 수락/거절
export const respondToInvite = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { action } = req.body; // 'accept' | 'decline'

        if (!['accept', 'decline'].includes(action)) {
            res.status(400).json({ success: false, message: 'action은 accept 또는 decline이어야 합니다' });
            return;
        }

        const group = await Group.findById(id);
        if (!group) {
            res.status(404).json({ success: false, message: '그룹을 찾을 수 없습니다' });
            return;
        }

        const memberEntry = group.members.find(
            m => m.userId.toString() === req.userId && m.status === 'leader_invited'
        );

        if (!memberEntry) {
            res.status(404).json({ success: false, message: '초대 정보를 찾을 수 없습니다' });
            return;
        }

        if (action === 'accept') {
            memberEntry.status = 'active';
            memberEntry.joinedAt = new Date();
        } else {
            group.members = group.members.filter(
                m => m.userId.toString() !== req.userId
            ) as typeof group.members;
        }

        await group.save();

        res.status(200).json({
            success: true,
            message: action === 'accept' ? '그룹에 참여했습니다' : '초대를 거절했습니다'
        });
    } catch (error) {
        console.error('초대 응답 에러:', error);
        res.status(500).json({ success: false, message: '서버 에러가 발생했습니다' });
    }
}

// B방식 코드 가입 + 멤버 관리
export const joinByCode = async (req: Request, res: Response): Promise<void> => {
    try {
        const { inviteCode } = req.body;

        if (!inviteCode) {
            res.status(400).json({ success: false, message: '초대 코드를 입력해주세요' });
            return;
        }

        const group = await Group.findOne({
            inviteCode: inviteCode.toUpperCase(),
            inviteCodeEnabled: true,
            status: 'active'
        });

        if (!group) {
            res.status(404).json({ success: false, message: '유효하지 않은 초대 코드입니다' });
            return;
        }

        if (group.leaderId.toString() === req.userId) {
            res.status(400).json({ success: false, message: '자신이 그룹장인 그룹에는 참여할 수 없습니다' });
            return;
        }

        const existing = group.members.find(
            m => m.userId.toString() === req.userId &&
            ['active', 'leader_invited', 'member_requested'].includes(m.status)
        );
        if(existing) {
            res.status(400).json({ success: false, message: '이미 가입 요청 중이거나 멤버입니다' });
            return;
        }

        group.members.push({
            userId: new mongoose.Types.ObjectId(req.userId),
            status: 'member_requested',
            method: 'code',
            requestedAt: new Date()
        });

        await group.save();

        logActivity(req.userId!, 'join_group', 'group', group._id.toString(), { name: group.name });
        res.status(200).json({
            success: true,
            message: `"${group.name}" 그룹에 가입 요청을 전송했습니다. 그룹장 승인 후 참여됩니다.`
        });

    } catch (error) {
        console.error('코드 가입 에러:', error);
        logActivity(req.userId!, 'join_group', 'group', undefined, undefined, 'failed');
        res.status(500).json({ success: false, message: '서버 에러가 발생했습니다' });
    }
}

// B방식: 그룹장이 가입 요청 승인/거절
export const approveMember = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { userId, action } = req.body; // action: 'approve' | 'reject'

        if (!['approve', 'reject'].includes(action)) {
            res.status(400).json({ success: false, message: 'action은 approve 또는 reject이어야 합니다' });
            return;
        }

        const group = await Group.findById(id);
        if (!group) {
            res.status(404).json({ success: false, message: '그룹을 찾을 수 없습니다' });
            return;
        }
        if (group.leaderId.toString() !== req.userId) {
            res.status(403).json({ success: false, message: '그룹장만 가입을 승인할 수 있습니다' });
            return;
        }


        const memberEntry = group.members.find(
            m => m.userId.toString() === userId && m.status === 'member_requested'
        );
        if (!memberEntry) {
            res.status(404).json({ success: false, message: '가입 요청을 찾을 수 없습니다' });
            return;
        }

        memberEntry.status = action === 'approve' ? 'active' : 'declined';
        if (action === 'approve') memberEntry.joinedAt = new Date();

        await group.save();

        res.status(200).json({
            success: true,
            message: action === 'approve' ? '가입 요청을 승인했습니다' : '가입 요청을 거절했습니다'
        });

    }  catch (error) {
        console.error('멤버 승인 에러:', error);
        res.status(500).json({ success: false, message: '서버 에러가 발생했습니다' });
    }
}

// 멤버 추방 (그룹장만)
export const removeMember = async (req: Request, res: Response): Promise<void> => {
   try {
       const { id, userId } = req.params;

       const group = await Group.findById(id);
       if (!group) {
           res.status(404).json({ success: false, message: '그룹을 찾을 수 없습니다' });
           return;
       }

       const isLeader = group.leaderId.toString() === req.userId;
       const isSelf = userId === req.userId;

       // 본인 탈퇴
       if (isSelf) {
           if (isLeader) {
               res.status(403).json({ success: false, message: '그룹장은 탈퇴할 수 없습니다' });
               return;
           }
       }
       // 강퇴
       else if (!isLeader) {
           res.status(403).json({ success: false, message: '그룹장만 멤버를 추방할 수 있습니다' });
           return;
       }

       const memberIndex = group.members.findIndex(
           m => m.userId.toString() === userId
       );
       if (memberIndex === -1) {
           res.status(404).json({ success: false, message: '해당 멤버를 찾을 수 없습니다' });
           return;
       }

       group.members.splice(memberIndex, 1);
       await group.save();

       const action = isSelf ? 'leave_group' : 'remove_member';
       logActivity(req.userId!, action, 'group', group._id.toString());
       res.status(200).json({ success: true, message: '멤버를 그룹에서 제거했습니다' });
   }  catch (error) {
       console.error('멤버 추방 에러:', error);
       logActivity(req.userId!, 'remove_member', 'group', undefined, undefined, 'failed');
       res.status(500).json({ success: false, message: '서버 에러가 발생했습니다' });
   }
}

// 앱 내 알림: 내게 온 초대 목록 (로그인 후 배너용)
export const getPendingInvites = async (req: Request, res: Response): Promise<void> => {
    try {
        const groups = await Group.find({
            status: 'active',
            members: {$elemMatch: {userId : req.userId, status: 'leader_invited'}}
        })
            .populate('leaderId', 'name nickname')


        res.status(200).json({
            success: true,
            data: { invites: groups, count: groups.length }
        });
    } catch (error) {
        console.error('초대 목록 조회 에러:', error);
        res.status(500).json({ success: false, message: '서버 에러가 발생했습니다' });
    }
}

// 그룹 해산 (그룹장만)
export const deleteGroup = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        const group = await Group.findById(id);

        if (!group) {
            res.status(404).json({ success: false, message: '그룹을 찾을 수 없습니다' });
            return;
        }

        if (group.leaderId.toString() !== req.userId) {
            res.status(403).json({ success: false, message: '그룹장만 그룹을 해산할 수 있습니다' });
            return;
        }

        await Group.findByIdAndDelete(id);

        logActivity(req.userId!, 'delete_group', 'group', id);
        res.status(200).json({ success: true, message: '그룹이 해산되었습니다' });
    } catch (error) {
        console.error('그룹 해산 에러:', error);
        logActivity(req.userId!, 'delete_group', 'group', undefined, undefined, 'failed');
        res.status(500).json({ success: false, message: '서버 에러가 발생했습니다' });
    }
}

// 그룹장 양도 (그룹장만)
export const transferLeader  = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { newLeaderId } = req.body;

        const group = await Group.findById(id);
        if (!group) {
            res.status(404).json({ success: false, message: '그룹을 찾을 수 없습니다' });
            return;
        }

        if (group.leaderId.toString() !== req.userId) {
            res.status(403).json({ success: false, message: '그룹장만 권한을 양도할 수 있습니다' });
            return;
        }

        const isActiveMember = group.members.some(
            m => m.userId.toString() === newLeaderId && m.status === 'active'
        );
        if (!isActiveMember) {
            res.status(400).json({ success: false, message: '활성 멤버에게만 양도할 수 있습니다' });
            return;
        }

        const oldLeaderInMembers = group.members.some(
            m => m.userId.toString() === req.userId
        );

        if (!oldLeaderInMembers) {
            group.members.push({
                userId: group.leaderId as mongoose.Types.ObjectId,
                status: 'active',
                method: 'invite',
                requestedAt: new Date(),
                joinedAt: new Date()
            });
        }

        group.leaderId = new mongoose.Types.ObjectId(newLeaderId);
        await group.save();

        res.status(200).json({ success: true, message: '그룹장 권한이 양도되었습니다' });
    } catch (error) {
        console.error('그룹장 양도 에러:', error);
        res.status(500).json({ success: false, message: '서버 에러가 발생했습니다' });
    }
}