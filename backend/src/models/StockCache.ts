import mongoose, { Schema, Document } from 'mongoose';

export interface IStockCache extends Document {
    key: string;
    data: object;
    expiresAt: Date;
}

const StockCacheSchema = new Schema<IStockCache>({
    key:       { type: String, required: true, unique: true, index: true },
    data:      { type: Schema.Types.Mixed, required: true },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
});

export default mongoose.model<IStockCache>('StockCache', StockCacheSchema);
