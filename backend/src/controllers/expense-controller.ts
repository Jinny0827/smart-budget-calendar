import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Expense from '../models/Expense';
import Schedule from '../models/Schedule';

// 지출 목록 조회
export const getExpenses = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).userId;

        // 쿼리 파라미터로 필터링
        const { category, startDate, endDate, scheduleId } = req.query;

        let query: any = { userId };

        if (category) {
            query.category = category;
        }

        if (scheduleId) {
            query.scheduleId = scheduleId;
        }

        if (startDate || endDate) {
            query.date = {};
            if (startDate) query.date.$gte = new Date(startDate as string);
            if (endDate) query.date.$lte = new Date(endDate as string);
        }

        const expenses = await Expense.find(query)
            .populate('scheduleId', 'title date')
            .sort({ date: -1 });

        res.status(200).json({
            success: true,
            data: { expenses }
        });
    } catch (error) {
        console.error('지출 조회 에러:', error);
        res.status(500).json({
            success: false,
            message: '서버 에러가 발생했습니다'
        });
    }
};

// 지출 생성
export const createExpense = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).userId;
        const { amount, category, description, date, scheduleId } = req.body;

        // 필수 필드 검증
        if (!amount || !category || !description) {
            res.status(400).json({
                success: false,
                message: '금액, 카테고리, 설명은 필수입니다'
            });
            return;
        }

        const expense = await Expense.create({
            userId,
            amount,
            category,
            description,
            date: date || new Date(),
            scheduleId
        });

        // 일정에 연동된 경우, 일정의 expenses 배열에 추가
        if (scheduleId) {
            await Schedule.findByIdAndUpdate(
                scheduleId,
                { $push: { expenses: expense._id } }
            );
        }

        res.status(201).json({
            success: true,
            message: '지출이 생성되었습니다',
            data: { expense }
        });
    } catch (error) {
        console.error('지출 생성 에러:', error);
        res.status(500).json({
            success: false,
            message: '서버 에러가 발생했습니다'
        });
    }
};

// 지출 상세 조회
export const getExpense = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).userId;
        const { id } = req.params;

        const expense = await Expense.findOne({ _id: id, userId })
            .populate('scheduleId', 'title date');

        if (!expense) {
            res.status(404).json({
                success: false,
                message: '지출을 찾을 수 없습니다'
            });
            return;
        }

        res.status(200).json({
            success: true,
            data: { expense }
        });
    } catch (error) {
        console.error('지출 조회 에러:', error);
        res.status(500).json({
            success: false,
            message: '서버 에러가 발생했습니다'
        });
    }
};

// 지출 수정
export const updateExpense = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).userId;
        const { id } = req.params;
        const updateData = req.body;

        const expense = await Expense.findOneAndUpdate(
            { _id: id, userId },
            updateData,
            { new: true, runValidators: true }
        );

        if (!expense) {
            res.status(404).json({
                success: false,
                message: '지출을 찾을 수 없습니다'
            });
            return;
        }

        res.status(200).json({
            success: true,
            message: '지출이 수정되었습니다',
            data: { expense }
        });
    } catch (error) {
        console.error('지출 수정 에러:', error);
        res.status(500).json({
            success: false,
            message: '서버 에러가 발생했습니다'
        });
    }
};

// 지출 삭제
export const deleteExpense = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).userId;
        const { id } = req.params;

        const expense = await Expense.findOneAndDelete({ _id: id, userId });

        if (!expense) {
            res.status(404).json({
                success: false,
                message: '지출을 찾을 수 없습니다'
            });
            return;
        }

        // 일정에 연동된 경우, 일정의 expenses 배열에서 제거
        if (expense.scheduleId) {
            await Schedule.findByIdAndUpdate(
                expense.scheduleId,
                { $pull: { expenses: expense._id } }
            );
        }

        res.status(200).json({
            success: true,
            message: '지출이 삭제되었습니다'
        });
    } catch (error) {
        console.error('지출 삭제 에러:', error);
        res.status(500).json({
            success: false,
            message: '서버 에러가 발생했습니다'
        });
    }
};

// 지출 통계 조회
export const getExpenseStats = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).userId;
        const { startDate, endDate } = req.query;

        // userId를 ObjectId로 변환 (aggregate에서 정확한 매칭 필요)
        const userObjectId = new mongoose.Types.ObjectId(userId);

        let dateFilter: any = {};
        if (startDate) dateFilter.$gte = new Date(startDate as string);
        if (endDate) dateFilter.$lte = new Date(endDate as string);

        const matchStage: any = { userId: userObjectId };
        if (Object.keys(dateFilter).length > 0) {
            matchStage.date = dateFilter;
        }

        // 카테고리별 합계
        const categoryStats = await Expense.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: '$category',
                    total: { $sum: '$amount' },
                    count: { $sum: 1 }
                }
            },
            { $sort: { total: -1 } }
        ]);

        // 전체 합계
        const totalResult = await Expense.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$amount' },
                    count: { $sum: 1 }
                }
            }
        ]);

        res.status(200).json({
            success: true,
            data: {
                categoryStats,
                total: totalResult[0] || { total: 0, count: 0 }
            }
        });
    } catch (error) {
        console.error('통계 조회 에러:', error);
        res.status(500).json({
            success: false,
            message: '서버 에러가 발생했습니다'
        });
    }
};