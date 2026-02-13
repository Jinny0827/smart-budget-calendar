import { useNavigate } from 'react-router-dom';
import { logout, getCurrentUser } from '../services/auth-service';

function SchedulesPage() {
    const navigate = useNavigate();
    const user = getCurrentUser();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-gray-100">
            {/* 헤더 */}
            <header className="bg-white shadow">
                <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-gray-900">스마트 가계부</h1>
                    <div className="flex items-center gap-4">
                        <span className="text-gray-700">{user?.name}님</span>
                        <button
                            onClick={handleLogout}
                            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                        >
                            로그아웃
                        </button>
                    </div>
                </div>
            </header>

            {/* 네비게이션 */}
            <nav className="bg-white shadow-sm">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="flex gap-6 py-4">
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="px-4 py-2 text-gray-600 hover:text-blue-600"
                        >
                            대시보드
                        </button>
                        <button
                            onClick={() => navigate('/schedules')}
                            className="px-4 py-2 text-blue-600 border-b-2 border-blue-600 font-medium"
                        >
                            일정 관리
                        </button>
                        <button
                            onClick={() => navigate('/expenses')}
                            className="px-4 py-2 text-gray-600 hover:text-blue-600"
                        >
                            지출 관리
                        </button>
                    </div>
                </div>
            </nav>

            {/* 메인 콘텐츠 */}
            <main className="max-w-7xl mx-auto px-4 py-8">
                <div className="bg-white p-6 rounded-lg shadow">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold">일정 관리</h2>
                        <button className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                            일정 추가
                        </button>
                    </div>

                    <p className="text-gray-600">일정 목록이 여기에 표시됩니다.</p>
                </div>
            </main>
        </div>
    );
}

export default SchedulesPage;