import {Request, Response} from 'express';
import Schedule from '../models/Schedule';


// 일정 목록 조회
export const getSchedules = async (req: Request, res: Response) : Promise<void> => {
    try {
        const userId = (req as any).userId;
        
        // 쿼리 파라미터로 필터링 (선택사항)
        const { category, startDate, endDate } = req.body;

        let query: any = { userId };

        if(category) {
            query.category = category;
        }

        if (startDate || endDate) {
            query.date = {};
            if (startDate) query.date.$gte = new Date(startDate as string);
            if (endDate) query.date.$lte = new Date(endDate as string);
        }

        const schedules = await Schedule.find(query)
            .populate('expenses')
            .sort({ date: -1});

        res.status(200).json({
            success: true,
            data: { schedules }
        });
    } catch (error) {
        console.error('일정 조회 에러:', error);
        res.status(500).json({
            success: false,
            message: '서버 에러가 발생했습니다'
        });
    }
}


// 일정 생성
export const createSchedule = async (req: Request, res: Response) : Promise<void> => {
    try {
        const userId = (req as any).userId;
        const { title, date, category, isRecurring, recurringPattern } = req.body;

        // 필수 필드 검증
        if (!title || !date || !category) {
            res.status(400).json({
                success: false,
                message: '제목, 날짜, 카테고리는 필수입니다'
            });
            return;
        }

        const schedule = await Schedule.create({
            userId,
            title,
            date,
            category,
            isRecurring: isRecurring || false,
            recurringPattern
        });

        res.status(201).json({
            success: true,
            message: '일정이 생성되었습니다',
            data: { schedule }
        });

    } catch (error) {
        console.error('일정 생성 에러:', error);
        res.status(500).json({
            success: false,
            message: '서버 에러가 발생했습니다'
        });
    }
}

// 일정 상세 조회
export const getSchedule = async (req: Request, res: Response) : Promise<void> => {
    try {
        const userId = (req as any).userId;
        const { id } = req.params;

        const schedule = await Schedule.findOne({ _id: id, userId })
            .populate('expenses');

        if(!schedule) {
            res.status(404).json({
                success: false,
                message: '일정을 찾을 수 없습니다'
            });
            return;
        }

        res.status(200).json({
            success: true,
            data: { schedule }
        });

    } catch (error) {
        console.error('일정 조회 에러:', error);
        res.status(500).json({
            success: false,
            message: '서버 에러가 발생했습니다'
        });
    }
}

// 일정 수정
export const updateSchedule = async (req: Request, res: Response) : Promise<void> => {
    try {
        const userId = (req as any).userId;
        const { id } = req.params;
        const updateData = req.body;

        const schedule = await Schedule.findOneAndUpdate(
            {_id: id, userId },
            updateData,
            { new: true, runValidators: true }
        );

        if (!schedule) {
            res.status(404).json({
                success: false,
                message: '일정을 찾을 수 없습니다'
            });
            return;
        }

        res.status(200).json({
            success: true,
            message: '일정이 수정되었습니다',
            data: { schedule }
        });
    } catch (error) {
        console.error('일정 수정 에러:', error);
        res.status(500).json({
            success: false,
            message: '서버 에러가 발생했습니다'
        });
    }
}

// 일정 삭제
export const deleteSchedule = async (req: Request, res: Response) : Promise<void> => {
    try {
        const userId = (req as any).userId;
        const { id } = req.params;

        const schedule = await Schedule.findOneAndDelete({ _id: id, userId });

        if (!schedule) {
            res.status(404).json({
                success: false,
                message: '일정을 찾을 수 없습니다'
            });
            return;
        }

        res.status(200).json({
            success: true,
            message: '일정이 삭제되었습니다'
        });

    } catch (error) {
        console.error('일정 삭제 에러:', error);
        res.status(500).json({
            success: false,
            message: '서버 에러가 발생했습니다'
        });
    }
}