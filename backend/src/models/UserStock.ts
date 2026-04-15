import mongoose, { Schema, Document } from 'mongoose';

export interface IUserStock extends Document {
    userId: mongoose.Types.ObjectId;
    corpName: string;
    ticker: string;
    stock_code: string;   // KR: 005930 / US: AAPL (ticker와 동일)
    suffix?: string;      // KR: .KS 또는 .KQ / US: 없음 (Yahoo Finance 심볼용)
    corp_code?: string;   // KR: DART corp_code / US: SEC CIK
    market: 'kr' | 'us';
    type: 'watchlist' | 'portfolio';
    quantity?: number;
    avgPrice?: number;
    currency?: 'KRW' | 'USD';
    addedAt: Date;
    updatedAt: Date;
    purchaseDate?: Date;

    transactions?: {
        type: 'buy' | 'edit';
        quantity: number;
        price: number;
        totalQty: number;
        avgPrice: number;
        purchaseDate?: Date;
        createdAt: Date;
    }[];
}

const UserStockSchema = new Schema<IUserStock>({
    userId:     { type: Schema.Types.ObjectId, ref: 'User', required: true },
    corpName:   { type: String, required: true },
    ticker:     { type: String, required: true },
    stock_code: { type: String, required: true },
    suffix:     { type: String },
    corp_code:  { type: String },
    market:     { type: String, enum: ['kr', 'us'], required: true },
    type:       { type: String, enum: ['watchlist', 'portfolio'], required: true },
    quantity:   { type: Number, min: 0 },
    avgPrice:   { type: Number, min: 0 },
    currency:   { type: String, enum: ['KRW', 'USD'] },
    addedAt:    { type: Date, default: Date.now },
    updatedAt:  { type: Date, default: Date.now },
    purchaseDate: { type: Date },
    transactions: [{
        type:         { type: String, enum: ['buy', 'edit'] },
        quantity:     { type: Number },
        price:        { type: Number },
        totalQty:     { type: Number },
        avgPrice:     { type: Number },
        purchaseDate: { type: Date },
        createdAt:    { type: Date, default: Date.now },
    }]
});

UserStockSchema.index({ userId: 1, ticker: 1, market: 1 }, { unique: true });
UserStockSchema.index({ userId: 1, type: 1 });

export default mongoose.model<IUserStock>('UserStock', UserStockSchema);
