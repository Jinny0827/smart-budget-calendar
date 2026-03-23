import mongoose, { Document, Schema } from 'mongoose';

// User 인터페이스
export interface IUser extends Document {
    email: string;
    password: string;
    name: string;
    nickname?: string;
    role: 'user' | 'admin';
    status: 'pending' | 'approved' | 'rejected';
    otpSecret?: string;
    otpEnabled: boolean;
    lastLoginAt: Date;
    lastMessageAt?: Date;
    loginAttempts: number;
    lockUntil?: Date;
    createdAt: Date;
}

// User 스키마
const UserSchema = new Schema<IUser>(
    {
        email: {
            type: String,
            required: [true, '이메일은 필수입니다'],
            unique: true,
            lowercase: true,
            trim: true,
            match: [/^\S+@\S+\.\S+$/, '올바른 이메일 형식이 아닙니다']
        },
        password: {
            type: String,
            required: [true, '비밀번호는 필수입니다'],
            minlength: [6, '비밀번호는 최소 6자 이상이어야 합니다']
        },
        name: {
            type: String,
            required: [true, '이름은 필수입니다'],
            trim: true
        },
        nickname: {
            type: String,
            trim: true
        },
        role: {
            type: String,
            enum: ['user', 'admin'],
            default: 'user'
        },
        status: {
            type: String,
            enum: ['pending', 'approved', 'rejected'],
            default: 'pending'
        },
        otpSecret: {
            type: String
        },
        otpEnabled: {
            type: Boolean,
            default: false
        },
        lastLoginAt: {
            type: Date
        },
        lastMessageAt: {
            type: Date
        },
        loginAttempts: {
            type: Number,
            default: 0
        },
        lockUntil: {
            type: Date
        }
    },
    {
        timestamps: true
    }
);

// User 모델 생성 및 export
export default mongoose.model<IUser>('User', UserSchema);