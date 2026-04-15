import { Request, Response } from 'express';
import Schedule from '../models/Schedule';
import { logActivity } from '../utils/activity-logger';

// 일정 목록 조회
export const getSchedules = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).userId;

        // 쿼리 파라미터로 필터링
        const { category, startDate, endDate } = req.query;

        let query: any = { userId };

        if (category) {
            query.category = category;
        }

        if (startDate || endDate) {
            query.date = {};
            if (startDate) query.date.$gte = new Date(startDate as string);
            if (endDate) query.date.$lte = new Date(endDate as string);
        }

        const schedules = await Schedule.find(query)
            .populate('expenses')
            .sort({ date: -1 });

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
};

// 일정 생성
export const createSchedule = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).userId;
        const { title, date, endDate, category, isRecurring, recurringPattern, recurringEnd } = req.body;

        // 필수 필드 검증
        if (!title || !date || !category) {
            res.status(400).json({
                success: false,
                message: '제목, 날짜, 카테고리는 필수입니다'
            });
            return;
        }
        
        // 일반 일정
        if (!isRecurring) {
            const schedule = await Schedule.create({
                userId, title, date,
                endDate: endDate || undefined,
                category,
                isRecurring: false,
            });

            logActivity(userId, 'add_schedule', 'schedule', schedule._id.toString(), { title: schedule.title });
            res.status(201).json({ success: true, message: '일정이 생성되었습니다', data: { schedule } });
            return;
        }

        // 반복 일정 자동 확장
        const { frequency = 'monthly', interval = 1 } = recurringPattern || {};
        
        // 종료 기준 날짜 계산
        const limitDate = recurringEnd?.type === 'date' && recurringEnd.endDate
            ? new Date(recurringEnd.endDate) : new Date(Date.now() + 1000 * 60 *60 * 24 * 365 * 2);

        // 기본 일정 생성
        const first = await Schedule.create({
            userId, title, date,
            endDate: endDate || undefined,
            category,
            isRecurring: true,
            recurringPattern: { frequency, interval },
            recurringEnd: recurringEnd || { type: 'forever' },
            recurringGroupId: 'temp', // 일단 임시값
        })

        // recurringGroupId를 자기 자신 _id로 업데이트
        first.recurringGroupId = first._id.toString();
        await first.save();

        // 반복 날짜 증가 헬퍼
        const addInterval = (d: Date): Date => {
            const next = new Date(d);
            if (frequency === 'daily')   next.setDate(next.getDate() + interval);
            if (frequency === 'weekly')  next.setDate(next.getDate() + interval * 7);
            if (frequency === 'monthly') next.setMonth(next.getMonth() + interval);
            return next;
        }

        // 기본 일정 후 반복 일정 생성
        const copies: any[] = [];
        let cur = addInterval(new Date(date || new Date()));

        while (cur <= limitDate) {
            copies.push({
                userId, title,
                date: new Date(cur),
                endDate: endDate || undefined,
                category,
                isRecurring: true,
                recurringPattern: { frequency, interval },
                recurringEnd: recurringEnd || { type: 'forever' },
                recurringGroupId: first._id.toString(),
            });
            cur = addInterval(cur);
        };

        if(copies.length > 0) {
            await Schedule.insertMany(copies);
        }
        
        logActivity(userId, 'add_schedule', 'schedule', first._id.toString(), { title });
        res.status(201).json({
            success: true,
            message: `반복 일정 ${copies.length + 1}개가 생성되었습니다`,
            data: { schedule: first, totalCreated: copies.length + 1 },
        });
    } catch (error) {
        console.error('일정 생성 에러:', error);
        logActivity((req as any).userId, 'add_schedule', 'schedule', undefined, undefined, 'failed');
        res.status(500).json({
            success: false,
            message: '서버 에러가 발생했습니다'
        });
    }
};

// 일정 상세 조회
export const getSchedule = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).userId;
        const { id } = req.params;

        const schedule = await Schedule.findOne({ _id: id, userId })
            .populate('expenses');

        if (!schedule) {
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
};

// 일정 수정
export const updateSchedule = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).userId;
        const { id } = req.params;
        const updateData = req.body;

        const schedule = await Schedule.findOneAndUpdate(
            { _id: id, userId },
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

        logActivity(userId, 'update_schedule', 'schedule', schedule._id.toString(), { title: schedule.title });
        res.status(200).json({
            success: true,
            message: '일정이 수정되었습니다',
            data: { schedule }
        });
    } catch (error) {
        console.error('일정 수정 에러:', error);
        logActivity((req as any).userId, 'update_schedule', 'schedule', undefined, undefined, 'failed');
        res.status(500).json({
            success: false,
            message: '서버 에러가 발생했습니다'
        });
    }
};

// 일정 삭제
export const deleteSchedule = async (req: Request, res: Response): Promise<void> => {
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

        logActivity(userId, 'delete_schedule', 'schedule', schedule._id.toString());
        res.status(200).json({
            success: true,
            message: '일정이 삭제되었습니다'
        });
    } catch (error) {
        console.error('일정 삭제 에러:', error);
        logActivity((req as any).userId, 'delete_schedule', 'schedule', undefined, undefined, 'failed');
        res.status(500).json({
            success: false,
            message: '서버 에러가 발생했습니다'
        });
    }
};

// AI 학습된 반복 패턴 조회
export const getSchedulePatterns = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).userId;

        // 반복 일정으로 등록된 것만 조회
        const recurringSchedules = await Schedule.find({
            userId,
            isRecurring: true
        }).sort({ date: -1 });

        // 제목 기준으로 그룹핑하여 패턴 분석
        const patternMap = new Map<string, {
            title: string;
            category: string;
            frequency: string;
            interval: number;
            occurrences: Date[];
            lastOccurrence: Date;
        }>();

        for (const schedule of recurringSchedules) {
            const key = `${schedule.title}_${schedule.category}`;
            if (!patternMap.has(key)) {
                patternMap.set(key, {
                    title: schedule.title,
                    category: schedule.category,
                    frequency: schedule.recurringPattern?.frequency || 'monthly',
                    interval: schedule.recurringPattern?.interval || 1,
                    occurrences: [],
                    lastOccurrence: schedule.date
                });
            }
            const pattern = patternMap.get(key)!;
            pattern.occurrences.push(schedule.date);

            // 가장 최근 날짜 업데이트
            if (schedule.date > pattern.lastOccurrence) {
                pattern.lastOccurrence = schedule.date;
            }
        }

        // 패턴 배열로 변환 + 다음 제안 날짜 계산
        const patterns = Array.from(patternMap.values()).map((pattern) => {
            const intervalDays =
                pattern.frequency === 'daily' ? pattern.interval :
                    pattern.frequency === 'weekly' ? pattern.interval * 7 :
                        pattern.interval * 30;

            const nextSuggestion = new Date(pattern.lastOccurrence);
            nextSuggestion.setDate(nextSuggestion.getDate() + intervalDays);

            // 신뢰도: 발생 횟수 기반 (최대 1.0)
            const confidence = Math.min(pattern.occurrences.length / 5, 1.0);

            return {
                title: pattern.title,
                category: pattern.category,
                frequency: pattern.frequency,
                interval: pattern.interval,
                lastOccurrence: pattern.lastOccurrence,
                nextSuggestion,
                confidence,
                occurrenceCount: pattern.occurrences.length
            };
        });

        res.status(200).json({
            success: true,
            data: { patterns }
        });
    } catch (error) {
        console.error('패턴 조회 에러:', error);
        res.status(500).json({
            success: false,
            message: '서버 에러가 발생했습니다'
        });
    }
};