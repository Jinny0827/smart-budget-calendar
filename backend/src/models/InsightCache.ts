import mongoose, { Schema, Document} from "mongoose";

interface IInsightData {
    category?: string;
    amount?: number;
    scheduleId?: string;
    suggestedBudget?: number;
    averageAmount?: number;
    changeRate?: number;
}

interface IInsight {
    type: 'anomaly_alert' | 'budget_suggestion' | 'pattern_insight' | 'schedule_recommendation';
    content: string;
    priority: 'high' | 'medium' | 'low';
    data: IInsightData;
}

// InsightCache 도큐먼트 인터페이스
export interface IInsightCache extends Document {
    userId: string;
    insights: IInsight[];
    analyzedAt: Date;
    dataHash: string;
}

const InsightSchema = new Schema<IInsight>({
    type: {
        type: String,
        enum: ['anomaly_alert', 'budget_suggestion', 'pattern_insight', 'schedule_recommendation'],
        required: true,
    },
    content: { type: String, required: true },
    priority: { type: String, enum: ['high', 'medium', 'low'], required: true },
    data: { type: Schema.Types.Mixed, default: {} },
});

const InsightCacheSchema = new Schema<IInsightCache>(
    {
        // 유저당 1개
        userId: { type: String, required: true, unique: true },
        insights: { type: [InsightSchema], default: [] },
        analyzedAt: { type: Date, required: true },
        dataHash: { type: String, required: true },
    },
    { timestamps: false }
);

export default mongoose.model<IInsightCache>('InsightCache', InsightCacheSchema);