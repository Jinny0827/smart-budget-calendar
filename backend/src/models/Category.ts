import mongoose, { Document, Schema } from 'mongoose';

export interface ICategory extends Document {
    name: string;
    color: string;
    order: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const CategorySchema = new Schema<ICategory>(
    {
        name: {
            type: String,
            required: [true, '카테고리 이름은 필수입니다'],
            unique: true,
            trim: true,
        },
        color: {
            type: String,
            default: '#B0BEC5',
        },
        order: {
            type: Number,
            default: 0,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    { timestamps: true }
);

export default mongoose.model<ICategory>('Category', CategorySchema);
