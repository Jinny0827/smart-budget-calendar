import mongoose, { Document, Schema } from "mongoose";

export interface IPost extends Document {
    authorId: mongoose.Types.ObjectId;
    boardType : 'notice' | 'free';
    title: string;
    content: string;
    isPinned: boolean;
    showModal: boolean;
    views: number;
    createdAt: Date;
    updatedAt: Date;
}

const PostSchema = new Schema<IPost>(
    {
        authorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        boardType: { type: String, enum: ['notice', 'free'], required: true },
        title:     { type: String, required: true, maxlength: 100 },
        content:   { type: String, required: true },
        isPinned:  { type: Boolean, default: false },
        showModal: { type: Boolean, default: false },
        views:     { type: Number, default: 0 },
    },
    { timestamps: true }
);

PostSchema.index({ authorId: 1, createdAt : -1 });

export default mongoose.model<IPost>('Post', PostSchema);