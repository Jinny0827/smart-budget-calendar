import mongoose, {Schema} from "mongoose";

const ActivityLogSchema = new Schema({
    userId:   { type: Schema.Types.ObjectId, ref: 'User', required: true },
    action:   { type: String, required: true },
    target:   { type: String, required: true },
    targetId: { type: Schema.Types.ObjectId },
    status:   { type: String, enum: ['success', 'failed'], default: 'success' }, // 추가
    meta:     { type: Schema.Types.Mixed },
    createdAt:{ type: Date, default: Date.now, expires: '90d' }
});

export default mongoose.model('ActivityLog', ActivityLogSchema);