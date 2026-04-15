import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { logout, getCurrentUser } from '../services/auth-service';

interface LayoutProps {
    children: React.ReactNode;
}

const navItems = [
    { path: '/dashboard', label: '대시보드' },
    { path: '/schedules', label: '일정' },
    { path: '/expenses',  label: '지출' },
    { path: '/finance',   label: '주식' },
    { path: '/board',     label: '게시판' },
];

const Layout: React.FC<LayoutProps> = ({ children }) => {
    const navigate  = useNavigate();
    const location  = useLocation();
    const user      = getCurrentUser();

    const handleLogout = () => {
        logout();
        window.location.href = '/login';
    };

    return (
        <div className="min-h-screen" style={{ backgroundColor: '#F2F4F6' }}>

            {/* ── 헤더 ── */}
            <header className="bg-white border-b border-[#E5E8EB] sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-4 md:px-6 h-14 flex items-center justify-between gap-4">

                    {/* 로고 */}
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="text-base font-bold text-[#191F28] tracking-tight shrink-0"
                    >
                        너의 일정은<span className="text-[#3182F6]">..</span>
                    </button>

                    {/* 데스크톱 네비 */}
                    <nav className="hidden md:flex items-center gap-1 flex-1 justify-center">
                        {navItems.map(({ path, label }) => (
                            <button
                                key={path}
                                onClick={() => navigate(path)}
                                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                                    location.pathname === path
                                        ? 'bg-[#EBF3FE] text-[#3182F6]'
                                        : 'text-[#8B95A1] hover:text-[#191F28] hover:bg-[#F2F4F6]'
                                }`}
                            >
                                {label}
                            </button>
                        ))}
                        {user?.role === 'admin' && (
                            <button
                                onClick={() => navigate('/admin')}
                                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                                    location.pathname === '/admin'
                                        ? 'bg-purple-50 text-purple-600'
                                        : 'text-[#8B95A1] hover:text-purple-600 hover:bg-purple-50'
                                }`}
                            >
                                백오피스
                            </button>
                        )}
                    </nav>

                    {/* 우측: 유저 + 관리 + 로그아웃 */}
                    <div className="flex items-center gap-2 shrink-0">
                        <span className="hidden sm:block text-sm text-[#8B95A1]">{user?.name}</span>
                        <button
                            onClick={() => navigate('/manage')}
                            className={`px-3 py-1.5 text-sm font-medium rounded-xl transition-colors ${
                                location.pathname === '/manage'
                                    ? 'bg-[#EBF3FE] text-[#3182F6]'
                                    : 'text-[#8B95A1] hover:text-[#3182F6] hover:bg-[#EBF3FE]'
                            }`}
                        >
                            관리
                        </button>
                        <button
                            onClick={handleLogout}
                            className="px-3 py-1.5 text-sm font-semibold bg-[#3182F6] text-white rounded-xl hover:bg-[#1B6EE4] transition-colors"
                        >
                            로그아웃
                        </button>
                    </div>
                </div>

                {/* 모바일 네비 */}
                <div className="md:hidden border-t border-[#F2F4F6] px-2 pb-2 pt-1 flex gap-1 overflow-x-auto">
                    {navItems.map(({ path, label }) => (
                        <button
                            key={path}
                            onClick={() => navigate(path)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-colors ${
                                location.pathname === path
                                    ? 'bg-[#EBF3FE] text-[#3182F6]'
                                    : 'text-[#8B95A1] hover:text-[#191F28]'
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                    {user?.role === 'admin' && (
                        <button
                            onClick={() => navigate('/admin')}
                            className="px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap text-purple-500"
                        >
                            백오피스
                        </button>
                    )}
                    <button
                        onClick={() => navigate('/manage')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-colors ${
                            location.pathname === '/manage'
                                ? 'bg-[#EBF3FE] text-[#3182F6]'
                                : 'text-[#8B95A1]'
                        }`}
                    >
                        관리
                    </button>
                </div>
            </header>

            {/* ── 콘텐츠 ── */}
            <main className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8">
                {children}
            </main>
        </div>
    );
};

export default Layout;
