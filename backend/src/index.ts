import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoSanitize from 'express-mongo-sanitize';
import { connectDB } from './config/database';
import authRoutes from "./routes/auth-routes";
import scheduleRoutes from "./routes/schedule-routes";
import expenseRoutes from "./routes/expense-routes";
import insightRoutes from "./routes/insight-routes";
import holidayRoutes from "./routes/holiday-routes";
import importRoutes from "./routes/import-routes";
import adminRoutes from "./routes/admin-routes";
import groupRoutes from "./routes/group-routes";
import userRoutes from "./routes/user-routes";
import messageRoutes from "./routes/message-routes";

dotenv.config();

const app: Application = express();

// 허용할 주소 목록 정의
const allowedOrigins = [
    'http://localhost:5173', // 로컬 Vite 개발 서버
    'http://127.0.0.1:5173',
    'https://budget.bowling-manager.com', // 프로덕션 프론트엔드
    process.env.CORS_ORIGIN,  // 환경 변수로 들어올 주소 (S3 등)
].filter(Boolean) as string[]; // null이나 undefined 제거

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true}));
app.use(mongoSanitize()); // NoSQL Injection 방어: $, . 로 시작하는 키 제거

// DB 연결 (Lambda는 핸들러 밖에서 연결하는 것이 성능상 유리합니다)
connectDB();

app.get('/', (_req: Request, res: Response)=> {
    res.json({
        success: true,
        message: '스마트 가계부 API 서버 실행중입니다.',
        data: { version: '1.0.0', timestamp: new Date().toISOString() }
    })
});

app.get('/health', (_req: Request, res: Response) => {
    res.json({ success: true, message: 'OK' });
});

app.use('/api/auth', authRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/insights', insightRoutes);
app.use('/api/holidays', holidayRoutes);
app.use('/api/import', importRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/users', userRoutes);
app.use('/api/messages', messageRoutes);


// [중요] 로컬 환경(development)에서만 직접 서버를 실행합니다.
if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
        console.log(`🚀 로컬 서버가 포트 ${PORT}에서 실행 중입니다`);
    });
}

// Lambda 핸들러에서 사용할 수 있도록 export 추가
export default app;