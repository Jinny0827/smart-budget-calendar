import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { register } from '../services/auth-service';

function RegisterPage() {
    const navigate = useNavigate();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent): Promise<void> => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('비밀번호가 일치하지 않습니다');
            return;
        }

        setLoading(true);

        try {
            await register(email, password, name);
            setSuccess(true);
        } catch (err: any) {
            setError(err.response?.data?.message || '회원가입에 실패했습니다');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">

                {/* 가입 완료 — 승인 대기 안내 */}
                {success ? (
                    <div className="text-center">
                        <div className="text-5xl mb-4">✅</div>
                        <h1 className="text-2xl font-bold mb-3">가입 신청 완료</h1>
                        <p className="text-gray-600 mb-2">
                            가입 신청이 접수되었습니다.
                        </p>
                        <p className="text-gray-500 text-sm mb-6">
                            관리자 승인 후 로그인할 수 있습니다.<br />
                            승인까지 시간이 걸릴 수 있어요.
                        </p>
                        <button
                            onClick={() => navigate('/login')}
                            className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600"
                        >
                            로그인 페이지로 이동
                        </button>
                    </div>
                ) : (
                    <>
                        <h1 className="text-2xl font-bold mb-6 text-center">회원가입</h1>

                        {error && (
                            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit}>
                            <div className="mb-4">
                                <label className="block text-gray-700 mb-2">이름</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                            </div>

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

                            <div className="mb-4">
                                <label className="block text-gray-700 mb-2">비밀번호</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                    minLength={6}
                                />
                            </div>

                            <div className="mb-6">
                                <label className="block text-gray-700 mb-2">비밀번호 확인</label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                    minLength={6}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 disabled:bg-gray-400"
                            >
                                {loading ? '가입 중...' : '회원가입'}
                            </button>
                        </form>

                        <p className="mt-4 text-center text-gray-600">
                            이미 계정이 있으신가요?{' '}
                            <Link to="/login" className="text-blue-500 hover:underline">
                                로그인
                            </Link>
                        </p>
                    </>
                )}

            </div>
        </div>
    );
}

export default RegisterPage;
