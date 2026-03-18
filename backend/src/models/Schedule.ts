import mongoose, { Document, Schema } from 'mongoose';

// Schedule 인터페이스
export interface ISchedule extends Document {
    userId: mongoose.Types.ObjectId;
    title: string;
    date: Date;
    endDate?: Date;
    category: string;
    expenses: mongoose.Types.ObjectId[]; // 관련 지출 ID들
    isRecurring: boolean;
    recurringPattern?: {
        frequency: 'daily' | 'weekly' | 'monthly';
        interval: number;
    };
    createdAt: Date;
    updatedAt: Date;
}

// Schedule 스키마
const ScheduleSchema = new Schema<ISchedule>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: [true, '사용자 ID는 필수입니다']
        },
        title: {
            type: String,
            required: [true, '일정 제목은 필수입니다'],
            trim: true
        },
        date: {
            type: Date,
            required: [true, '일정 날짜는 필수입니다']
        },
        endDate: {
            type: Date,
            required: false
        },
        category: {
            type: String,
            required: [true, '카테고리는 필수입니다'],
            enum: ['식비', '교통', '의료', '운동', '여행', '쇼핑', '문화', '교육', '기타'],
            default: '기타'
        },
        expenses: [{
            type: Schema.Types.ObjectId,
            ref: 'Expense'
        }],
        isRecurring: {
            type: Boolean,
            default: false
        },
        recurringPattern: {
            frequency: {
                type: String,
                enum: ['daily', 'weekly', 'monthly']
            },
            interval: {
                type: Number,
                min: 1
            }
        }
    },
    {
        timestamps: true
    }
);

// 인덱스 설정 (검색 성능 향상)
ScheduleSchema.index({ userId: 1, date: 1 });

// Schedule 모델 생성 및 export
export default mongoose.model<ISchedule>('Schedule', ScheduleSchema);