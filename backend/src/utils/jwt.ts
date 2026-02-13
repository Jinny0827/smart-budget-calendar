import jwt from 'jsonwebtoken';

//JWT 토큰 생성
export const generateToken = (userId: string): string => {
    const secret = process.env.JWT_SECRET;
    const expiresIn = process.env.JWT_EXPIRES_IN || '7d';

    if(!secret) {
        throw new Error('JWT_SECRET이 환경변수에 설정되지 않았습니다.')
    }

    return jwt.sign(
        { userId },
        secret,
        { expiresIn: expiresIn }
    );
};


// JWT 토큰 검증
export const verifyToken = (token: string): {userId: string} => {
    const secret = process.env.JWT_SECRET;

    if(!secret) {
        throw new Error('JWT_SECRET이 환경변수에 설정되지 않았습니다.')
    }

    try {
        const decoded = jwt.verify(token, secret) as { userId: string};
        return decoded;
    } catch (error) {
        throw new Error('유효하지 않은 토큰입니다');
    }
};