// src/components/Layout.tsx
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { logout, getCurrentUser } from '../services/auth-service';

interface LayoutProps {
    children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const user = getCurrentUser();

    const handleLogout = () => {
        logout();
        window.location.href = '/login';
    };

    const navItems = [
        { path: '/dashboard', label: '대시보드' },
        { path: '/schedules', label: '일정 관리' },
        { path: '/expenses', label: '지출 관리' },
        { path: '/groups', label: '그룹' },
        { path: '/finance', label: '주식 분석' },
        { path: '/board', label: '게시판' },
    ];

    return (
        <div className="min-h-screen bg-gray-100">
            <header className="bg-white shadow">
                <div className="max-w-7xl mx-auto px-4 py-4 flex flex-wrap justify-between items-center gap-2">
                    <h1 className="text-2xl font-bold text-gray-900">스마트 가계부</h1>
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-gray-700 hidden sm:inline">{user?.name}님</span>
                        <button onClick={() => navigate('/account')} className="px-3 py-2 text-gray-600 hover:text-blue-600 text-sm">
                            계정 관리
                        </button>
                        <button onClick={handleLogout} className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 text-sm">
                            로그아웃
                        </button>
                    </div>
                </div>
            </header>

            <nav className="bg-white shadow-sm">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="flex gap-2 py-4 overflow-x-auto whitespace-nowrap">
                        {navItems.map((item) => (
                            <button
                                key={item.path}
                                onClick={() => navigate(item.path)}
                                className={`px-4 py-2 ${
                                    location.pathname === item.path
                                        ? 'text-blue-600 border-b-2 border-blue-600 font-medium'
                                        : 'text-gray-600 hover:text-blue-600'
                                }`}
                            >
                                {item.label}
                            </button>
                        ))}
                        {user?.role === 'admin' && (
                            <button
                                onClick={() => navigate('/admin')}
                                className={`px-4 py-2 ${
                                    location.pathname === '/admin'
                                        ? 'text-purple-600 border-b-2 border-purple-600 font-medium'
                                        : 'text-purple-600 hover:text-purple-800'
                                }`}
                            >
                                백오피스
                            </button>
                        )}
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-4 py-8">
                {children}
            </main>
        </div>
    );
};

export default Layout;
