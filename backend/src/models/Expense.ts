import mongoose, { Document, Schema } from 'mongoose';

// Expense 인터페이스
export interface IExpense extends Document {
    userId: mongoose.Types.ObjectId;
    amount: number;
    category: string;
    description: string;
    date: Date;
    scheduleId?: mongoose.Types.ObjectId;
    type: 'income' | 'expense';
    createdAt: Date;
    updatedAt: Date;
}

// Expense 스키마
const ExpenseSchema = new Schema<IExpense>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: [true, '사용자 ID는 필수입니다']
        },
        amount: {
            type: Number,
            required: [true, '금액은 필수입니다'],
            min: [0, '금액은 0 이상이어야 합니다']
        },
        category: {
            type: String,
            required: [true, '카테고리는 필수입니다'],
            enum: [
                // 지출 카테고리
                '식비', '교통', '쇼핑', '문화', '의료', '교육', '운동', '여행', '기타',
                // 수입 카테고리
                '급여', '부업', '사업', '투자', '용돈', '환급'
            ],
            default: '기타'
        },
        type: {
            type: String,
            enum: ['income', 'expense'],
            default: 'expense'
        },
        description: {
            type: String,
            required: [true, '설명은 필수입니다'],
            trim: true
        },
        date: {
            type: Date,
            required: [true, '날짜는 필수입니다'],
            default: Date.now
        },
        scheduleId: {
            type: Schema.Types.ObjectId,
            ref: 'Schedule'
        }
    },
    {
        timestamps: true
    }
);

// 인덱스 설정 (검색 성능 향상)
ExpenseSchema.index({ userId: 1, date: -1 });
ExpenseSchema.index({ userId: 1, category: 1 });

// Expense 모델 생성 및 export
export default mongoose.model<IExpense>('Expense', ExpenseSchema);