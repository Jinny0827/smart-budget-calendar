import mongoose, { Schema } from 'mongoose';

const NotificationSchema = new Schema({
    userId:  { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
        type: String,
        enum: ['invite', 'group_approved', 'group_rejected', 'user_approved', 'user_rejected', 'member_requested'],
        required: true,
    },
    message:  { type: String, required: true },
    isRead:   { type: Boolean, default: false },
    link:     { type: String },
    createdAt:{ type: Date, default: Date.now, expires: '30d' },
});

NotificationSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model('Notification', NotificationSchema);
