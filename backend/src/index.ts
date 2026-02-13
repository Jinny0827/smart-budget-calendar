import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/database';
import authRoutes from "./routes/auth-routes";
import scheduleRoutes from "./routes/schedule-routes";
import expenseRoutes from "./routes/expense-routes";

// 환경변수 로드
dotenv.config();

// Express 앱 생성
const app: Application = express();
const PORT = process.env.PORT || 5000;


// 미들웨어 설정
app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true}));

app.get('/', (_req: Request, res: Response)=> {
    res.json({
        success: true,
        message: '스마트 가계부 API 서버 실행중입니다.',
        data: {
            version: '1.0.0',
            timestamp: new Date().toISOString()
        }
    })
});

// 헬스체크 라우트
app.get('/health', (_req: Request, res: Response) => {
    res.json({ success: true, message: 'OK' });
});


// API 라우트 연결
app.use('/api/auth', authRoutes);
app.use('/api/schedule', scheduleRoutes);
app.use('/api/expense', expenseRoutes);



// 서버 시작 함수
const startServer = async () => {
    try {
        await connectDB();

        app.listen(PORT, () => {
            console.log(`🚀 서버가 포트 ${PORT}에서 실행 중입니다`);
            console.log(`📍 환경: ${process.env.NODE_ENV || 'development'}`);
        })
    } catch (e) {
        console.error('서버 시작 실패:', e);
        process.exit(1);
    }
}

// 서버 시작
startServer();