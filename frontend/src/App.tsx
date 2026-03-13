import { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import {isAuthenticated, getCurrentUser, logout} from './services/auth-service';
import { getMyGroups } from './services/group-service';

import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import SchedulesPage from './pages/SchedulesPage';
import ExpensesPage from './pages/ExpensesPage';
import AccountPage from './pages/AccountPage';
import AdminPage from './pages/AdminPage';
import GroupPage from './pages/GroupPage';
import BoardPage from './pages/BoardPage';

import { ChatButton } from './components/ChatButton';
import { ChatPanel } from './components/ChatPanel';
import type { User, Group } from './types';
import {NoticeModal} from "./components/NoticeModal.tsx";

// 인증이 필요한 라우트 보호
function PrivateRoute({ children }: { children: React.ReactNode }) {
    return isAuthenticated() ? <>{children}</> : <Navigate to="/login" />;
}

// 인증된 사용자는 접근 불가 (로그인/회원가입 페이지)
function PublicRoute({ children }: { children: React.ReactNode }) {
    return !isAuthenticated() ? <>{children}</> : <Navigate to="/dashboard" />;
}


function App() {
    const authenticated = isAuthenticated();

    const [isChatOpen, setIsChatOpen] = useState(false);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [myGroups, setMyGroups] = useState<Group[]>([]);
    const [ showNotice, setShowNotice ] = useState(false);
    const handleNoticeClose = useCallback(() => setShowNotice(false), []);

    useEffect(() => {
        if (authenticated) {
            const storedUser = getCurrentUser();

            if (!storedUser) {
                // user 데이터 없으면 그냥 로그아웃
                logout();
                return;
            }

            setCurrentUser(storedUser);
            getMyGroups().then(setMyGroups).catch(console.error);
        }
    }, [authenticated]);

    useEffect(() => {
        if (authenticated) {
            // 오늘 하루 안보기 체크
            const today = new Date().toISOString().split('T')[0];
            const dismissed = localStorage.getItem('noticeDismissedDate');
            if (dismissed !== today) {
                setShowNotice(true);
            }
        }
    }, [authenticated]);

    return (
        <Router>
            <Routes>
                {/* 공개 라우트 */}
                <Route
                    path="/login"
                    element={
                        <PublicRoute>
                            <LoginPage />
                        </PublicRoute>
                    }
                />
                <Route
                    path="/register"
                    element={
                        <PublicRoute>
                            <RegisterPage />
                        </PublicRoute>
                    }
                />

                {/* 인증 필요 라우트 */}
                <Route
                    path="/dashboard"
                    element={
                        <PrivateRoute>
                            <DashboardPage />
                        </PrivateRoute>
                    }
                />
                <Route
                    path="/schedules"
                    element={
                        <PrivateRoute>
                            <SchedulesPage />
                        </PrivateRoute>
                    }
                />
                <Route
                    path="/expenses"
                    element={
                        <PrivateRoute>
                            <ExpensesPage />
                        </PrivateRoute>
                    }
                />

                <Route
                    path="/account"
                    element={
                        <PrivateRoute>
                            <AccountPage />
                        </PrivateRoute>
                    }
                />
                <Route
                    path="/groups"
                    element={
                        <PrivateRoute>
                            <GroupPage />
                        </PrivateRoute>
                    }
                />
                <Route
                    path="/admin"
                    element={
                        <PrivateRoute>
                            <AdminPage />
                        </PrivateRoute>
                    }
                />

                {/* 기본 리다이렉트 */}
                <Route path="/" element={<Navigate to="/dashboard" />} />

                {/* 게시판 */}
                <Route path="/board" element={<PrivateRoute><BoardPage /></PrivateRoute>} />
            </Routes>

            {isAuthenticated() && currentUser && (
                <>
                    <ChatButton
                        onClick={() => setIsChatOpen((prev) => !prev)}
                        unreadCount={0}
                    />
                    {isChatOpen && (
                        <ChatPanel
                            onClose={() => setIsChatOpen(false)}
                            currentUser={currentUser}
                            myGroups={myGroups}
                        />
                    )}
                </>
            )}

            {showNotice && isAuthenticated() && (
                <NoticeModal onClose={handleNoticeClose} />
            )}
        </Router>
    );
}


export default App;