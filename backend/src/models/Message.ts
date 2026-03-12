import mongoose, { Document, Schema } from "mongoose";

export interface IMessage extends Document {
    senderId: mongoose.Types.ObjectId;
    chatType: 'group' | 'direct';
    groupId?: mongoose.Types.ObjectId;
    recipientId?: mongoose.Types.ObjectId;
    content: string;
    readBy: mongoose.Types.ObjectId[];
    createdAt: Date;
    updatedAt: Date;
}

const MessageSchema = new Schema<IMessage>(
    {
        senderId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: [true, '발신자 ID는 필수입니다']
        },
        chatType: {
            type: String,
            enum: ['group', 'direct'],
            required: [true, '채팅 타입은 필수입니다']
        },
        groupId: {
            type: Schema.Types.ObjectId,
            ref: 'Group'
        },
        recipientId: {
            type: Schema.Types.ObjectId,
            ref: 'User'
        },
        content: {
            type: String,
            required: [true, '메시지 내용은 필수입니다'],
            trim: true,
            maxlength: [1000, '메시지는 1000자 이하여야 합니다']
        },
        readBy: {
            type: [Schema.Types.ObjectId],
            ref: 'User',
            default: []
        }
    },
    {
        timestamps: true
    }
);

MessageSchema.index({ groupId : 1, createdAt: -1});
MessageSchema.index({ senderId: 1, recipientId: 1, createdAt: -1 });

export default mongoose.model<IMessage>('Message', MessageSchema);