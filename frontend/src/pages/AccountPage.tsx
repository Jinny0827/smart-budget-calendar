import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMe, setupOtp, enableOtp, disableOtp } from '../services/auth-service';
import {updateNickname, changePassword, deleteAccount} from '../services/user-service';
import type { User } from '../types';

function AccountPage() {
    const navigate = useNavigate();
    const [user, setUser] = useState<User | null>(null);
    const [pageLoading, setPageLoading] = useState(true);

    // 닉네임 변경
    const [nickname, setNickname] = useState('');
    const [nicknameMsg, setNicknameMsg] = useState('');
    const [nicknameLoading, setNicknameLoading] = useState(false);

    // 비밀번호 변경
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [passwordMsg, setPasswordMsg] = useState('');
    const [passwordLoading, setPasswordLoading] = useState(false);

    // OTP 설정
    const [otpStep, setOtpStep] = useState<'idle' | 'setup' | 'disable'>('idle');
    const [qrCode, setQrCode] = useState('');
    const [otpSecret, setOtpSecret] = useState('');
    const [otpCode, setOtpCode] = useState('');
    const [otpMsg, setOtpMsg] = useState('');
    const [otpLoading, setOtpLoading] = useState(false);

    // 회원탈퇴
    const [deletePassword, setDeletePassword] = useState('');
    const [deleteMsg, setDeleteMsg] = useState('');
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // 내 정보 로드
    useEffect(() => {
        getMe()
            .then((u) => {
                setUser(u);
                setNickname(u.nickname || '');
            })
            .catch(() => navigate('/login'))
            .finally(() => setPageLoading(false));
    }, [navigate]);

    // ── 닉네임 변경 ───────────────────────────────────────────
    const handleNickname = async (e: React.FormEvent) => {
        e.preventDefault();
        setNicknameMsg('');
        setNicknameLoading(true);
        try {
            const updated = await updateNickname(nickname);
            setUser(updated);
            setNicknameMsg('닉네임이 변경되었습니다.');
        } catch (err: any) {
            setNicknameMsg(err.response?.data?.message || '변경에 실패했습니다.');
        } finally {
            setNicknameLoading(false);
        }
    };

    // ── 비밀번호 변경 ──────────────────────────────────────────
    const handlePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setPasswordMsg('');

        if (newPassword !== confirmNewPassword) {
            setPasswordMsg('새 비밀번호가 일치하지 않습니다.');
            return;
        }
        if (newPassword.length < 6) {
            setPasswordMsg('새 비밀번호는 6자 이상이어야 합니다.');
            return;
        }

        setPasswordLoading(true);
        try {
            await changePassword(currentPassword, newPassword);
            setPasswordMsg('비밀번호가 변경되었습니다.');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmNewPassword('');
        } catch (err: any) {
            setPasswordMsg(err.response?.data?.message || '변경에 실패했습니다.');
        } finally {
            setPasswordLoading(false);
        }
    };

    // ── OTP 설정 시작 (QR 코드 생성) ──────────────────────────
    const handleSetupOtp = async () => {
        setOtpMsg('');
        setOtpLoading(true);
        try {
            const { qrCode: qr, secret } = await setupOtp();
            setQrCode(qr);
            setOtpSecret(secret);
            setOtpStep('setup');
        } catch (err: any) {
            setOtpMsg(err.response?.data?.message || 'OTP 설정에 실패했습니다.');
        } finally {
            setOtpLoading(false);
        }
    };

    // ── OTP 활성화 ─────────────────────────────────────────────
    const handleEnableOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setOtpMsg('');
        setOtpLoading(true);
        try {
            await enableOtp(otpCode);
            setUser((prev) => prev ? { ...prev, otpEnabled: true } : prev);
            setOtpStep('idle');
            setOtpCode('');
            setQrCode('');
            setOtpSecret('');
            setOtpMsg('OTP가 활성화되었습니다.');
        } catch (err: any) {
            setOtpMsg(err.response?.data?.message || '인증 코드가 올바르지 않습니다.');
        } finally {
            setOtpLoading(false);
        }
    };

    // ── OTP 비활성화 ───────────────────────────────────────────
    const handleDisableOtp = async () => {
        if (!window.confirm('OTP를 비활성화하시겠습니까?')) return;
        setOtpMsg('');
        setOtpLoading(true);
        try {
            await disableOtp();
            setUser((prev) => prev ? { ...prev, otpEnabled: false } : prev);
            setOtpStep('idle');
            setOtpMsg('OTP가 비활성화되었습니다.');
        } catch (err: any) {
            setOtpMsg(err.response?.data?.message || '비활성화에 실패했습니다.');
        } finally {
            setOtpLoading(false);
        }
    };

    // ── 회원탈퇴 ───────────────────────────────────────────────
    const handleDeleteAccount = async (e: React.FormEvent) => {
        e.preventDefault();
        setDeleteMsg('');
        setDeleteLoading(true);
        try {
            await deleteAccount(deletePassword);
            localStorage.removeItem('token');
            navigate('/login');
        } catch (err: any) {
            setDeleteMsg(err.response?.data?.message || '탈퇴에 실패했습니다.');
        } finally {
            setDeleteLoading(false);
        }
    };

    if (pageLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <p className="text-gray-500">불러오는 중...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 py-8 px-4">
            <div className="max-w-lg mx-auto space-y-6">

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="text-gray-500 hover:text-gray-700 text-sm"
                    >
                        ← 대시보드
                    </button>
                    <h1 className="text-2xl font-bold">계정 관리</h1>
                </div>

                {/* 현재 계정 정보 */}
                <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-lg font-semibold mb-3">계정 정보</h2>
                    <div className="text-sm text-gray-600 space-y-1">
                        <p><span className="font-medium">이름:</span> {user?.name}</p>
                        <p><span className="font-medium">이메일:</span> {user?.email}</p>
                        <p><span className="font-medium">닉네임:</span> {user?.nickname || '(미설정)'}</p>
                        <p>
                            <span className="font-medium">역할:</span>{' '}
                            <span className={user?.role === 'admin' ? 'text-purple-600 font-semibold' : ''}>
                                {user?.role === 'admin' ? '관리자' : '일반 사용자'}
                            </span>
                        </p>
                        <p>
                            <span className="font-medium">OTP:</span>{' '}
                            <span className={user?.otpEnabled ? 'text-green-600 font-semibold' : 'text-gray-400'}>
                                {user?.otpEnabled ? '활성화됨' : '비활성화'}
                            </span>
                        </p>
                    </div>
                </div>

                {/* 닉네임 변경 */}
                <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-lg font-semibold mb-4">닉네임 변경</h2>
                    <form onSubmit={handleNickname} className="space-y-3">
                        <input
                            type="text"
                            value={nickname}
                            onChange={(e) => setNickname(e.target.value)}
                            placeholder="새 닉네임 입력"
                            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        />
                        {nicknameMsg && (
                            <p className={`text-sm ${nicknameMsg.includes('변경되었') ? 'text-green-600' : 'text-red-600'}`}>
                                {nicknameMsg}
                            </p>
                        )}
                        <button
                            type="submit"
                            disabled={nicknameLoading}
                            className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 disabled:bg-gray-400"
                        >
                            {nicknameLoading ? '저장 중...' : '닉네임 저장'}
                        </button>
                    </form>
                </div>

                {/* 비밀번호 변경 */}
                <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-lg font-semibold mb-4">비밀번호 변경</h2>
                    <form onSubmit={handlePassword} className="space-y-3">
                        <input
                            type="password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            placeholder="현재 비밀번호"
                            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        />
                        <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="새 비밀번호 (6자 이상)"
                            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                            minLength={6}
                        />
                        <input
                            type="password"
                            value={confirmNewPassword}
                            onChange={(e) => setConfirmNewPassword(e.target.value)}
                            placeholder="새 비밀번호 확인"
                            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                            minLength={6}
                        />
                        {passwordMsg && (
                            <p className={`text-sm ${passwordMsg.includes('변경되었') ? 'text-green-600' : 'text-red-600'}`}>
                                {passwordMsg}
                            </p>
                        )}
                        <button
                            type="submit"
                            disabled={passwordLoading}
                            className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 disabled:bg-gray-400"
                        >
                            {passwordLoading ? '변경 중...' : '비밀번호 변경'}
                        </button>
                    </form>
                </div>

                {/* OTP 설정 */}
                <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-lg font-semibold mb-1">2단계 인증 (OTP)</h2>
                    <p className="text-sm text-gray-500 mb-4">Google Authenticator 앱을 사용하는 TOTP 방식이에요.</p>

                    {otpMsg && (
                        <p className={`text-sm mb-3 ${otpMsg.includes('활성화') || otpMsg.includes('비활성화') ? 'text-green-600' : 'text-red-600'}`}>
                            {otpMsg}
                        </p>
                    )}

                    {/* OTP 비활성화 상태 */}
                    {!user?.otpEnabled && otpStep === 'idle' && (
                        <button
                            onClick={handleSetupOtp}
                            disabled={otpLoading}
                            className="w-full bg-green-500 text-white py-2 rounded-lg hover:bg-green-600 disabled:bg-gray-400"
                        >
                            {otpLoading ? '설정 중...' : 'OTP 설정 시작'}
                        </button>
                    )}

                    {/* QR 코드 표시 + 코드 입력 */}
                    {otpStep === 'setup' && (
                        <div className="space-y-4">
                            <p className="text-sm text-gray-600">
                                Google Authenticator로 아래 QR코드를 스캔하거나, 키를 직접 입력하세요.
                            </p>
                            {qrCode && (
                                <div className="flex justify-center">
                                    <img src={qrCode} alt="OTP QR코드" className="w-48 h-48" />
                                </div>
                            )}
                            <div className="bg-gray-50 rounded p-3 text-center">
                                <p className="text-xs text-gray-500 mb-1">수동 입력 키</p>
                                <p className="font-mono text-sm tracking-widest break-all">{otpSecret}</p>
                            </div>
                            <form onSubmit={handleEnableOtp} className="space-y-3">
                                <input
                                    type="text"
                                    value={otpCode}
                                    onChange={(e) => setOtpCode(e.target.value)}
                                    placeholder="앱에서 생성된 6자리 코드"
                                    maxLength={6}
                                    className="w-full px-3 py-2 border rounded-lg text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                    autoFocus
                                />
                                <button
                                    type="submit"
                                    disabled={otpLoading || otpCode.length !== 6}
                                    className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 disabled:bg-gray-400"
                                >
                                    {otpLoading ? '활성화 중...' : 'OTP 활성화'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setOtpStep('idle'); setOtpCode(''); setQrCode(''); setOtpSecret(''); }}
                                    className="w-full text-gray-500 hover:text-gray-700 text-sm"
                                >
                                    취소
                                </button>
                            </form>
                        </div>
                    )}

                    {/* OTP 활성화 상태 */}
                    {user?.otpEnabled && otpStep === 'idle' && (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 text-green-600">
                                <span className="text-lg">🔐</span>
                                <span className="text-sm font-medium">OTP가 활성화되어 있습니다</span>
                            </div>
                            {/* 변경 전: 비활성화 버튼만 있었음 */}
                            <button
                                onClick={handleSetupOtp}
                                disabled={otpLoading}
                                className="w-full bg-yellow-500 text-white py-2 rounded-lg hover:bg-yellow-600 disabled:bg-gray-400"
                            >
                                {otpLoading ? '설정 중...' : 'QR 코드 재설정 (Authenticator 앱 변경)'}
                            </button>
                            <button
                                onClick={handleDisableOtp}
                                disabled={otpLoading}
                                className="w-full bg-red-500 text-white py-2 rounded-lg hover:bg-red-600"
                            >
                                {otpLoading ? '처리 중...' : 'OTP 비활성화'}
                            </button>
                        </div>
                    )}
                </div>

                {/* 회원탈퇴 */}
                <div className="bg-white rounded-lg shadow p-6 border border-red-200">
                    <h2 className="text-lg font-semibold mb-1 text-red-600">회원탈퇴</h2>
                    <p className="text-sm text-gray-500 mb-4">탈퇴 시 모든 데이터가 삭제되며 복구할 수 없습니다.</p>

                    {!showDeleteConfirm ? (
                        <button
                            onClick={() => setShowDeleteConfirm(true)}
                            className="w-full bg-red-500 text-white py-2 rounded-lg hover:bg-red-600"
                        >
                            회원탈퇴
                        </button>
                    ) : (
                        <form onSubmit={handleDeleteAccount} className="space-y-3">
                            <p className="text-sm text-red-600 font-medium">정말 탈퇴하시겠습니까? 비밀번호를 입력하여 확인해주세요.</p>
                            <input
                                type="password"
                                value={deletePassword}
                                onChange={(e) => setDeletePassword(e.target.value)}
                                placeholder="현재 비밀번호"
                                className="w-full px-3 py-2 border border-red-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                                required
                                autoFocus
                            />
                            {deleteMsg && (
                                <p className="text-sm text-red-600">{deleteMsg}</p>
                            )}
                            <button
                                type="submit"
                                disabled={deleteLoading}
                                className="w-full bg-red-500 text-white py-2 rounded-lg hover:bg-red-600 disabled:bg-gray-400"
                            >
                                {deleteLoading ? '처리 중...' : '탈퇴 확인'}
                            </button>
                            <button
                                type="button"
                                onClick={() => { setShowDeleteConfirm(false); setDeletePassword(''); setDeleteMsg(''); }}
                                className="w-full text-gray-500 hover:text-gray-700 text-sm"
                            >
                                취소
                            </button>
                        </form>
                    )}
                </div>

            </div>
        </div>
    );
}

export default AccountPage;
