import mongoose, { Document, Schema } from 'mongoose';

// 멤버 서브도큐먼트 인터페이스
export interface IMember {
    userId : mongoose.Types.ObjectId;
    status: 'leader_invited' | 'member_requested' | 'active' | 'declined';
    method: 'invite' | 'code';
    requestedAt: Date;
    joinedAt?: Date;
}

// 공유 설정 서브 도큐먼트 인터페이스
export interface IGroupSettings {
    shareSchedules: boolean;
    shareExpenses: boolean;
    showAmounts: boolean;
    showMemberNames: boolean;
    mergedInsights: boolean;
}

// Group 인터페이스
export interface IGroup extends Document {
    name: string;
    leaderId: mongoose.Types.ObjectId;
    inviteCode: string;
    inviteCodeEnabled: boolean;
    members: IMember[];
    settings: IGroupSettings;
    status: 'pending' | 'active';
    createdAt: Date;
    updatedAt: Date;
}

// 초대 코드 생성 헬퍼 (6자리 대문자+숫자)
const generateInviteCode = (): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i =0; i< 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// Member 서브스키마
const MemberSchema = new Schema<IMember>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        status: {
            type: String,
            enum: ['leader_invited', 'member_requested', 'active', 'declined'],
            required: true
        },
        method: {
            type: String,
            enum: ['invite', 'code'],
            required: true
        },
        requestedAt: {
            type: Date,
            default: Date.now
        },
        joinedAt: {
            type: Date
        }
    },
    { _id: false } // 멤버 배열 항목에는 별도 _id 불필요
);

// GroupSettings 서브스키마
const GroupSettingsSchema = new Schema<IGroupSettings>(
    {
        shareSchedules: { type: Boolean, default: false },
        shareExpenses:  { type: Boolean, default: false },
        showAmounts:    { type: Boolean, default: false },
        showMemberNames:{ type: Boolean, default: true  },
        mergedInsights: { type: Boolean, default: false }
    },
    { _id: false }
);

// Group 스키마
const GroupSchema = new Schema<IGroup>(
    {
        name: {
            type: String,
            required: [true, '그룹명은 필수입니다'],
            trim: true
        },
        leaderId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        inviteCode: {
            type: String,
            unique: true
        },
        inviteCodeEnabled: {
            type: Boolean,
            default: true
        },
        members: {
            type: [MemberSchema],
            default: []
        },
        settings: {
            type: GroupSettingsSchema,
            default: () => ({})
        },
        status: {
            type: String,
            enum: ['pending', 'active'],
            default: 'pending'
        }
    },
    {
        timestamps: true
    }
);

// 그룹 생성 시 inviteCode 자동 발급
GroupSchema.pre('save', function (next) {
    if (!this.inviteCode) {
        this.inviteCode = generateInviteCode();
    }
    next();
});

export default mongoose.model<IGroup>('Group', GroupSchema);