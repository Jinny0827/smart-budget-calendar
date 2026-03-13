import { Request, Response } from 'express';
import Post from '../models/Post';

// 목록 조회 (페이지네이션)
export const getPosts = async (req: Request, res: Response): Promise<void> => {
    try {
        const { boardType } = req.params;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const skip = (page - 1) * limit;

        const showModal = req.query.showModal === 'true' ? true : undefined;
        const filter: Record<string, unknown> = { boardType };
        if (showModal !== undefined) filter.showModal = showModal;

        const [ posts, total ] = await Promise.all([
            Post.find(filter)
                .populate('authorId', 'nickname')
                .sort({ isPinned: -1, createdAt: -1 })
                .skip(skip)
                .limit(limit),
            Post.countDocuments(filter),
        ]);

        res.json({ success: true, data: { posts, total, page, totalPages: Math.ceil(total / limit) } });
    } catch (error) {
        res.status(500).json({ success: false, message: '서버 오류' });
    }
}

// 상세 조회 (조회수 증가)
export const getPost = async (req: Request, res: Response): Promise<void> => {
    try {
        const post = await Post.findByIdAndUpdate(
            req.params.id,
            { $inc: { views: 1}},
            { new: true}
        ).populate('authorId', 'nickname');

        if(!post) { res.status(404).json({ success: false, message: '게시글 없음'}); return; }

        res.json({ success: true, data: post });
    } catch (err) {
        res.status(500).json({ success: false, message: '서버 오류' });
    }
}

// 게시글 작성
export const createPost = async (req: Request, res: Response): Promise<void> => {
    try {
        const { boardType } = req.params;
        const { title, content, isPinned, showModal } = req.body;
        const role = (req as any).role;

        // 공지 사항은 어드민만 작성 가능
        if (boardType === 'notice' && role !== 'admin') {
            res.status(403).json({ success: false, message: '권한 없음' }); return;
        }

        const post = await Post.create({
            authorId:  (req as any).userId,
            boardType,
            title,
            content,
            isPinned:  boardType === 'notice' ? (isPinned  ?? false) : false,
            showModal: boardType === 'notice' ? (showModal ?? false) : false,
        });

        res.status(201).json({ success: true, data: post });
    } catch (error) {
        res.status(500).json({ success: false, message: '서버 오류' });
    }
}

// 게시글 수정
export const updatePost = async (req: Request, res: Response): Promise<void> => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) { res.status(404).json({ success: false, message: '게시글 없음' }); return; }

        const userId = (req as any).userId;
        const role = (req as any).role;

        if(post.authorId.toString() !== userId.toString() && role !== 'admin') {
            res.status(403).json({ success: false, message: '권한 없음' }); return;
        }

        const { title, content, isPinned, showModal } = req.body;
        post.title   = title   ?? post.title;
        post.content = content ?? post.content;
        if (role === 'admin') {
            post.isPinned  = isPinned  ?? post.isPinned;
            post.showModal = showModal ?? post.showModal;
        }
        await post.save();

        res.json({ success: true, data: post });
    } catch (err) {
        res.status(500).json({ success: false, message: '서버 오류' });
    }
}

// 게시글 삭제
export const deletePost = async (req: Request, res: Response): Promise<void> => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) { res.status(404).json({ success: false, message: '게시글 없음' }); return; }

        const userId = (req as any).userId;
        const role   = (req as any).role;

        if (post.authorId.toString() !== userId && role !== 'admin') {
            res.status(403).json({ success: false, message: '권한 없음' }); return;
        }

        await post.deleteOne();
        res.json({ success: true, message: '삭제 완료' });
    } catch (err) {
        res.status(500).json({ success: false, message: '서버 오류' });
    }
};