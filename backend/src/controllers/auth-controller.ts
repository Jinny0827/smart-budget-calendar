import {Request, Response} from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User';
import { generateToken } from '../utils/jwt';

// 회원가입
export const register = async (req: Request, res: Response) : Promise<void> => {
    try {
        const { email, password, name } = req.body;
        
        // 필수 필드 검증
        if(!email || !name || !password) {
            res.status(400).json({
                success: false,
                message: '모든 필드를 입력해주세요'
            });
            return;
        }

        // 이메일 중복 확인
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            res.status(400).json({
                success: false,
                message: '이미 존재하는 이메일입니다'
            });
            return;
        }

        // 비밀번호 해싱
        const hashPassword = await bcrypt.hash(password, 10);
        
        // 사용자 생성
        const user = await User.create({
            email,
            password: hashPassword,
            name
        });

        const token = generateToken(user._id.toString());

        res.status(201).json({
            success: true,
            message: '회원가입이 완료되었습니다',
            data: {
                token,
                user: {
                    id: user._id,
                    email: user.email,
                    name: user.name
                }
            }
        });

    } catch (error) {
        console.error('회원가입 에러:', error);
        res.status(500).json({
            success: false,
            message: '서버 에러가 발생했습니다'
        });
    }
}

// 로그인
export const login = async (req: Request, res: Response) : Promise<void> => {
    try {
        const { email, password } = req.body;

        // 필수 필드 검증
        if(!email || !password) {
            res.status(400).json({
                success: false,
                message: '이메일과 비밀번호를 입력해주세요'
            });
            return;
        }

        // 사용자 찾기
        const user = await User.findOne({ email });
        if(!user) {
            res.status(401).json({
                success: false,
                message: '이메일 또는 비밀번호가 올바르지 않습니다'
            });
            return;
        }

        // 비밀번호 확인
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            res.status(401).json({
                success: false,
                message: '이메일 또는 비밀번호가 올바르지 않습니다'
            });
            return;
        }

        const token = generateToken(user._id.toString());

        res.status(200).json({
            success: true,
            message: '로그인 성공',
            data: {
                token,
                user: {
                    id: user._id,
                    email: user.email,
                    name: user.name
                }
            }
        })


    } catch (error) {
        console.error('로그인 에러:', error);
        res.status(500).json({
            success: false,
            message: '서버 에러가 발생했습니다'
        });
    }
}


// 내정보 조회 (인증 필요)
export const getMe = async (req: Request, res: Response) : Promise<void> => {
    try {
        const userId = (req as any).userId;
        const user = await User.findById(userId).select('-password');

        // 실패
        if(!user) {
            res.status(404).json({
                success: false,
                message: '사용자를 찾을 수 없습니다'
            });
            return;
        }

        // 성공
        res.status(200).json({
            success: true,
            data: {
                user: {
                    id: user._id,
                    email: user.email,
                    name: user.name
                }
            }
        });
    } catch (error) {
        console.error('사용자 정보 조회 에러:', error);
        res.status(500).json({
            success: false,
            message: '서버 에러가 발생했습니다'
        });
    }
}

