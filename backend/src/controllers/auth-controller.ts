import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import User from '../models/User';
import { generateToken, generateTempToken, verifyToken } from '../utils/jwt';

// 회원가입
export const register = async (req: Request, res: Response) : Promise<void> => {
    try {
        const { email, password, name, nickname } = req.body;

        if (!email || !name || !password) {
            res.status(400).json({ success: false, message: '모든 필드를 입력해주세요' });
            return;
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            res.status(400).json({ success: false, message: '이미 존재하는 이메일입니다' });
            return;
        }

        const hashPassword = await bcrypt.hash(password, 10);

        await User.create({
            email,
            password: hashPassword,
            name,
            nickname: nickname || name,
            // role: 'user', status: 'pending' 은 스키마 default값으로 자동 설정
        });

        res.status(201).json({
            success: true,
            message: '회원가입 요청이 완료되었습니다. 관리자 승인 후 로그인하실 수 있습니다.'
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

        if (!email || !password) {
            res.status(400).json({ success: false, message: '이메일과 비밀번호를 입력해주세요' });
            return;
        }

        const user = await User.findOne({ email });
        if (!user) {
            res.status(401).json({ success: false, message: '이메일 또는 비밀번호가 올바르지 않습니다' });
            return;
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            res.status(401).json({ success: false, message: '이메일 또는 비밀번호가 올바르지 않습니다' });
            return;
        }

        // 승인 상태 체크
        if (user.status === 'pending') {
            res.status(403).json({ success: false, message: '관리자 승인 대기 중입니다.' });
            return;
        }
        if (user.status === 'rejected') {
            res.status(403).json({ success: false, message: '가입이 거절되었습니다. 관리자에게 문의하세요.' });
            return;
        }

        // OTP 활성화된 경우 → 임시 토큰 발급 후 2단계로
        if (user.otpEnabled) {
            const tempToken = generateTempToken(user._id.toString());
            res.status(200).json({
                success: true,
                otpRequired: true,
                tempToken
            });
            return;
        }

        // OTP 미사용 → 바로 로그인
        const token = generateToken(user._id.toString(), user.role);
        res.status(200).json({
            success: true,
            message: '로그인 성공',
            data: {
                token,
                user: {
                    id: user._id,
                    email: user.email,
                    name: user.name,
                    nickname: user.nickname,
                    role: user.role,
                    otpEnabled: user.otpEnabled
                }
            }
        });

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
        const user = await User.findById(req.userId).select('-password -otpSecret');

        // 실패
        if (!user) {
            res.status(404).json({ success: false, message: '사용자를 찾을 수 없습니다' });
            return;
        }

        // 성공
        res.status(200).json({
            success: true,
            data: {
                user: {
                    id: user._id,
                    email: user.email,
                    name: user.name,
                    nickname: user.nickname,
                    role: user.role,
                    status: user.status,
                    otpEnabled: user.otpEnabled
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

// OTP 2단계 검증 (tempToken + OTP 코드 → 최종 JWT 발급)
export const verifyOtp = async (req: Request, res: Response) : Promise<void> => {
    try {
        const { tempToken, otpCode } = req.body;

        if (!tempToken || !otpCode) {
            res.status(400).json({ success: false, message: 'tempToken과 OTP 코드를 입력해주세요' });
            return;
        }

        // 임시 토큰 검증
        let userId: string;
        try {
            const decoded = verifyToken(tempToken) as any;
            if (!decoded.temp) {
                res.status(403).json({ success: false, message: '유효하지 않은 임시 토큰입니다' });
                return;
            }
            userId = decoded.userId;
        } catch {
            res.status(403).json({ success: false, message: '임시 토큰이 만료되었습니다. 다시 로그인해주세요' });
            return;
        }

        const user = await User.findById(userId);
        if (!user || !user.otpSecret) {
            res.status(404).json({ success: false, message: '사용자를 찾을 수 없습니다' });
            return;
        }

        // TOTP 코드 검증
        const isValid = speakeasy.totp.verify({
            secret: user.otpSecret,
            encoding: 'base32',
            token: otpCode,
            window: 1  // 앞뒤 30초 허용
        });

        if (!isValid) {
            res.status(401).json({ success: false, message: 'OTP 코드가 올바르지 않습니다' });
            return;
        }

        const token = generateToken(user._id.toString(), user.role);
        res.status(200).json({
            success: true,
            message: '로그인 성공',
            data: {
                token,
                user: {
                    id: user._id,
                    email: user.email,
                    name: user.name,
                    nickname: user.nickname,
                    role: user.role,
                    otpEnabled: user.otpEnabled
                }
            }
        });

    } catch (error) {
        console.error('OTP 검증 에러:', error);
        res.status(500).json({ success: false, message: '서버 에러가 발생했습니다' });
    }
}

// OTP 설정 시작 (QR코드 발급)
export const setupOtp = async (req: Request, res: Response) : Promise<void> => {
    try {
        const user = await User.findById(req.userId);
        if(!user) {
            res.status(404).json({ success: false, message: '사용자를 찾을 수 없습니다' });
            return;
        }

        // 시크릿 키 생성
        const secret = speakeasy.generateSecret({
            name: `SmartBudget (${user.email})`,
            length: 20
        });

        // 시크릿 임시 저장 (아직 활성화 X)
        user.otpSecret = secret.base32;
        await user.save();

        // QR 코드 생성 (검증 및 생성)
        if (!secret.otpauth_url) {
            res.status(500).json({ success: false, message: 'OTP URL 생성에 실패했습니다' });
            return;
        }

        const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

        res.status(200).json({
            success: true,
            data: {
                qrCode: qrCodeUrl,       // 프론트에서 <img src={qrCode} /> 로 표시
                secret: secret.base32    // 수동 입력용
            }
        });

    } catch (error) {
        console.error('OTP 설정 에러:', error);
        res.status(500).json({ success: false, message: '서버 에러가 발생했습니다' });
    }
}

// OTP 활성화 (QR 코드 스캔 후 코드 입력으로 확인)
export const enableOtp = async (req: Request, res: Response): Promise<void> => {
    try {
        const { otpCode } = req.body;
        const user = await User.findById(req.userId);

        if (!user || !user.otpSecret) {
            res.status(400).json({ success: false, message: 'OTP 설정을 먼저 진행해주세요' });
            return;
        }

        const isValid = speakeasy.totp.verify({
            secret: user.otpSecret,
            encoding: 'base32',
            token: otpCode,
            window: 1
        });

        if (!isValid) {
            res.status(401).json({ success: false, message: 'OTP 코드가 올바르지 않습니다. 앱을 다시 확인해주세요' });
            return;
        }

        user.otpEnabled = true;
        await user.save();

        res.status(200).json({ success: true, message: 'OTP가 활성화되었습니다' });

    } catch (error) {
        console.error('OTP 활성화 에러:', error);
        res.status(500).json({ success: false, message: '서버 에러가 발생했습니다' });
    }
}

// OTP 비활성화
export const disableOtp = async (req: Request, res: Response): Promise<void> => {
    try {
        const { otpCode } = req.body;
        const user = await User.findById(req.userId);

        if (!user || !user.otpSecret) {
            res.status(400).json({ success: false, message: 'OTP가 설정되어 있지 않습니다' });
            return;
        }

        const isValid = speakeasy.totp.verify({
            secret: user.otpSecret,
            encoding: 'base32',
            token: otpCode,
            window: 1
        });

        if (!isValid) {
            res.status(401).json({ success: false, message: 'OTP 코드가 올바르지 않습니다' });
            return;
        }

        user.otpEnabled = false;
        user.otpSecret = undefined;
        await user.save();

        res.status(200).json({ success: true, message: 'OTP가 비활성화되었습니다' });

    } catch (error) {
        console.error('OTP 비활성화 에러:', error);
        res.status(500).json({ success: false, message: '서버 에러가 발생했습니다' });
    }
};