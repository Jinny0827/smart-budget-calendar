import mongoose, { Schema, Document } from 'mongoose';

export interface IUserFinanceMeta extends Document {
    userId: mongoose.Types.ObjectId;
    searchHistory: {
        query: string;
        market: 'kr' | 'us';
        searchedAt: Date;
    }[];
    portfolioInsight: {
        summary: string;
        riskLevel: string;
        sectorBalance: string;
        rebalancingSuggestion: string;
        topPick: string;
        basedOn: string[];
        generatedAt: Date;
    } | null;
}

const UserFinanceMetaSchema = new Schema<IUserFinanceMeta>({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    searchHistory: [{
        query:      { type: String, required: true },
        market:     { type: String, enum: ['kr', 'us'], required: true },
        searchedAt: { type: Date, default: Date.now },
    }],
    portfolioInsight: {
        summary:               { type: String },
        riskLevel:             { type: String },
        sectorBalance:         { type: String },
        rebalancingSuggestion: { type: String },
        topPick:               { type: String },
        basedOn:               { type: [String], default: [] },
        generatedAt:           { type: Date },
    },
});

export default mongoose.model<IUserFinanceMeta>('UserFinanceMeta', UserFinanceMetaSchema);
