import { useState} from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login, verifyOtp } from '../services/auth-service';


function LoginPage() {
    const navigate = useNavigate();

    const [step, setStep] = useState<'credentials' | 'otp'>('credentials');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [otpCode, setOtpCode] = useState('');
    const [tempToken, setTempToken] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // 1단계: 이메일 + 비밀번호 제출
    const handleSubmit = async (e: any): Promise<void> => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const data = await login(email, password);

            if (data.otpRequired && data.tempToken) {
                // OTP 2단계로 전환
                setTempToken(data.tempToken);
                setStep('otp');
            } else {
                // 직접 로그인 성공
                navigate('/dashboard');
            }

        } catch (err: any) {
            setError(err.response?.data?.message || '로그인에 실패했습니다');
        } finally {
            setLoading(false);
        }
    };

    // 2단계: OTP 코드 제출
    const handleOtpSubmit = async (e: React.FormEvent): Promise<void> => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await verifyOtp(tempToken, otpCode);
            navigate('/dashboard');
        } catch (err: any) {
            setError(err.response?.data?.message || 'OTP 인증에 실패했습니다');
            setOtpCode('');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">

                {/* 1단계: 이메일/비밀번호 */}
                {step === 'credentials' && (
                    <>
                        <h1 className="text-2xl font-bold mb-6 text-center">로그인</h1>

                        {error && (
                            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit}>
                            <div className="mb-4">
                                <label className="block text-gray-700 mb-2">이메일</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                            </div>

                            <div className="mb-6">
                                <label className="block text-gray-700 mb-2">비밀번호</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 disabled:bg-gray-400"
                            >
                                {loading ? '로그인 중...' : '로그인'}
                            </button>
                        </form>

                        <p className="mt-4 text-center text-gray-600">
                            계정이 없으신가요?{' '}
                            <Link to="/register" className="text-blue-500 hover:underline">
                                회원가입
                            </Link>
                        </p>
                    </>
                )}

                {/* 2단계: OTP 입력 */}
                {step === 'otp' && (
                    <>
                        <h1 className="text-2xl font-bold mb-2 text-center">2단계 인증</h1>
                        <p className="text-gray-500 text-sm text-center mb-6">
                            Google Authenticator 앱에서 6자리 코드를 입력해주세요
                        </p>

                        {error && (
                            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleOtpSubmit}>
                            <div className="mb-6">
                                <label className="block text-gray-700 mb-2">인증 코드</label>
                                <input
                                    type="text"
                                    value={otpCode}
                                    onChange={(e) => setOtpCode(e.target.value)}
                                    placeholder="000000"
                                    maxLength={6}
                                    className="w-full px-3 py-2 border rounded-lg text-center text-2xl tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                    autoFocus
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading || otpCode.length !== 6}
                                className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 disabled:bg-gray-400"
                            >
                                {loading ? '확인 중...' : '인증 완료'}
                            </button>

                            <button
                                type="button"
                                onClick={() => { setStep('credentials'); setError(''); setOtpCode(''); }}
                                className="w-full mt-3 text-gray-500 hover:text-gray-700 text-sm"
                            >
                                ← 이메일/비밀번호 다시 입력
                            </button>
                        </form>
                    </>
                )}

            </div>
        </div>
    );
}

export default LoginPage;