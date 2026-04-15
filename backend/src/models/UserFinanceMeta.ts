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
    dashboardInsight: {
        summary: string;
        score: number;
        expense:   { score: number; comment: string };
        schedule:  { score: number; comment: string };
        portfolio: { score: number; comment: string };
        overall: string;
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
    dashboardInsight: {
        summary:   { type: String },
        score:     { type: Number },
        expense:   { score: { type: Number }, comment: { type: String } },
        schedule:  { score: { type: Number }, comment: { type: String } },
        portfolio: { score: { type: Number }, comment: { type: String } },
        overall:   { type: String },
        generatedAt: { type: Date },
    },
});

export default mongoose.model<IUserFinanceMeta>('UserFinanceMeta', UserFinanceMetaSchema);
