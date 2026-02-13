import mongoose, { Document, Schema } from 'mongoose';

// User 인터페이스
export interface IUser extends Document {
    email: string;
    password: string;
    name: string;
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
        }
    },
    {
        timestamps: true
    }
);

// User 모델 생성 및 export
export default mongoose.model<IUser>('User', UserSchema);