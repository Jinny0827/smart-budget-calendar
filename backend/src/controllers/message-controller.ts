import { Request, Response } from 'express';
import Message from '../models/Message';
import Group from '../models/Group';

// 메시지 전송
export const sendMessage = async (req: Request, res: Response): Promise<void> => {
    try {
        const senderId = (req as any).userId;
        const { chatType, groupId, recipientId, content } = req.body;
        
        // 그룹 채팅이면 멤버 여부 확인
        if (chatType === 'group') {
            const group = await Group.findById(groupId);
            if(!group) {
                res.status(404).json({ success: false, message: '그룹을 찾을 수 없습니다.'})
                return;
            }

            const isLeader = group.leaderId.toString() === senderId;
            const isMember = group.members.some(
                (m) => m.userId.toString() === senderId && m.status === 'active'
            );
            if (!isLeader && !isMember) {
                res.status(403).json({ success: false, message: '그룹 멤버가 아닙니다' });
                return;
            }
        }

        const message = await Message.create({
            senderId,
            chatType,
            groupId: chatType === 'group' ? groupId : undefined,
            recipientId: chatType === 'direct' ? recipientId : undefined,
            content,
            readBy: [senderId]
        });

        await message.populate('senderId', 'nickname name');

        res.status(201).json({ success: true, data: message});
    } catch (error) {
        res.status(500).json({ success: false, message: '메시지 전송 실패', error });
    }
};

// 그룹 채팅 메시지 조회
export const getGroupMessage = async (req: Request, res: Response): Promise<void> => {
    try {
        const { groupId } = req.params;
        const { before, limit = '50' } = req.query;

        const query: any = { chatType: 'group', groupId };

        if(before) {
            query.createdAt = { $lt: new Date(before as string)};
        }

        const messages = await Message.find(query)
            .sort({ createdAt : -1 })
            .limit(Number(limit))
            .populate('senderId', 'nickname name');

        res.json({ success: true, data: messages.reverse() }) // 오래된순으로 반환 (reverse())

    } catch (error) {
        res.status(500).json({ success: false, message: '메시지 조회 실패', error });
    }
}

// 1:1 채팅 메시지 조회
export const getDirectMessages = async (req: Request, res: Response): Promise<void> => {
    try {
        const myId = (req as any).userId;
        const { userId } = req.params;
        const { before, limit = '50' } = req.query;

        const query: any = {
            chatType: 'direct',
            $or: [
                { senderId: myId, recipientId: userId },
                { senderId: userId, recipientId: myId }
            ]
        };

        if(before) {
            query.createdAt = { $lt: new Date(before as string) };
        }

        const messages = await Message.find(query)
            .sort({ createdAt: -1 })
            .limit(Number(limit))
            .populate('senderId', 'nickname name');

        res.json({ success: true, data: messages.reverse() });

    } catch(error) {
        res.status(500).json({ success: false, message: '메시지 조회 실패', error });
    }
}

// 읽음 처리
export const markAsRead = async (req: Request, res: Response): Promise<void> => {
    try {
        const myId = (req as any).userId;
        const { messageId } = req.params;

        await Message.findByIdAndUpdate(messageId, {
            $addToSet: { readBy: myId } // 중복 추가 방지
        });

        res.json({ success: true, message: '읽음 처리 완료'});
    } catch (error) {
        res.status(500).json({ success: false, message: '읽음 처리 실패', error });
    }
}