import { Request, Response } from 'express';
import { getHolidaysByYear } from '../services/holiday-service';


export const getHolidays = async (_req: Request, res: Response): Promise<void> => {
    try {
        const holidays = await getHolidaysByYear();  // 인자 없이 호출
        res.status(200).json({ success: true, data: holidays });
    } catch (error) {
        console.error('공휴일 조회 에러:', error);
        res.status(500).json({ success: false, message: '공휴일 조회에 실패했습니다' });
    }
};