import { Request, Response } from 'express';
import { parseCardExcel } from '../services/card-import-service';
import Expense from '../models/Expense';
import groqService from '../services/groq-service';

// 카드 내역 엑셀 일괄 가져오기
export const importCardHistory = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).userId;

        if (!req.file) {
            res.status(400).json({ success: false, message: '파일이 없습니다' });
            return;
        }

        const { cardName, transactions } = parseCardExcel(req.file.buffer);

        if (transactions.length === 0) {
            res.status(400).json({ success: false, message: '파싱된 거래 내역이 없습니다' });
            return;
        }

        // 중복 방지: userId + date + amount + description 조합이 같으면 스킵
        const operations = transactions.map(t => ({
            updateOne: {
                filter: {
                    userId,
                    date: new Date(t.date),
                    amount: t.amount,
                    description: t.description,
                },
                update: {
                    $setOnInsert: {
                        userId,
                        amount: t.amount,
                        category: t.category,
                        description: t.description,
                        date: new Date(t.date),
                        type: t.type,
                    },
                },
                upsert: true,
            },
        }));

        const result = await Expense.bulkWrite(operations, { ordered: false });
        const insertedCount = result.upsertedCount;
        const skippedCount = transactions.length - insertedCount;

        // 신규 내역이 있을 때만 캐시 무효화
        if (insertedCount > 0) {
            await groqService.invalidateCache(userId);
        }

        const message = skippedCount > 0
            ? `${cardName} ${insertedCount}건 추가 (중복 ${skippedCount}건 스킵)`
            : `${cardName} 내역 ${insertedCount}건을 가져왔습니다`;

        res.status(201).json({
            success: true,
            message,
            data: { count: insertedCount, skipped: skippedCount, cardName },
        });
    } catch (error: any) {
        console.error('카드 내역 가져오기 실패:', error);
        res.status(500).json({
            success: false,
            message: error.message || '서버 오류가 발생했습니다',
        });
    }
};
