import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { isAuthenticated } from './services/auth-service';

import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import SchedulesPage from './pages/SchedulesPage';
import ExpensesPage from './pages/ExpensesPage';
import AccountPage from './pages/AccountPage';
import AdminPage from './pages/AdminPage';
import GroupPage from './pages/GroupPage';

// 인증이 필요한 라우트 보호
function PrivateRoute({ children }: { children: React.ReactNode }) {
    return isAuthenticated() ? <>{children}</> : <Navigate to="/login" />;
}

// 인증된 사용자는 접근 불가 (로그인/회원가입 페이지)
function PublicRoute({ children }: { children: React.ReactNode }) {
    return !isAuthenticated() ? <>{children}</> : <Navigate to="/dashboard" />;
}


function App() {
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
            </Routes>
        </Router>
    );
}


export default App;