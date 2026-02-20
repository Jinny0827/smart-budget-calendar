import { Handler, Context } from 'aws-lambda';
import { createServer, proxy } from 'aws-serverless-express';
import app from './index';

// 서버 객체 생성 (핸들러 외부에서 선언하여 재사용)
const server = createServer(app);

export const handler: Handler = (event: any, context: Context) => {
    proxy(server, event, context);
};