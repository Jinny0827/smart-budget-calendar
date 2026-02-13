import mongoose from "mongoose"

export const connectDB = async (): Promise<void> => {
    try {
        const mongoURI = process.env.MONGODB_URI;

        if (!mongoURI) {
            throw new Error('MONGODB_URI가 환경변수에 설정되지 않았습니다');
        }

        await mongoose.connect(mongoURI);

        console.log(' MongoDB 연결 성공');
    } catch (error) {
        console.error(' MongoDB 연결 실패:', error);
        process.exit(1); // 연결 실패 시 프로세스 종료
    }
};

mongoose.connection.on('disconnected', () => {
    console.log(' MongoDB 연결 끊김');
});

mongoose.connection.on('error', (error) => {
    console.error(' MongoDB 에러:', error);
});