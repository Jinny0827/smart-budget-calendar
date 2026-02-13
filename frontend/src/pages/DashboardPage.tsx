import { useNavigate } from 'react-router-dom';
import { logout, getCurrentUser } from '../services/auth-service';

function DashboardPage() {
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
                            className="px-4 py-2 text-blue-600 border-b-2 border-blue-600 font-medium"
                        >
                            대시보드
                        </button>
                        <button
                            onClick={() => navigate('/schedules')}
                            className="px-4 py-2 text-gray-600 hover:text-blue-600"
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* 요약 카드 */}
                    <div className="bg-white p-6 rounded-lg shadow">
                        <h2 className="text-lg font-semibold mb-2">이번 달 지출</h2>
                        <p className="text-3xl font-bold text-blue-600">0원</p>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow">
                        <h2 className="text-lg font-semibold mb-2">예정 일정</h2>
                        <p className="text-3xl font-bold text-green-600">0개</p>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow">
                        <h2 className="text-lg font-semibold mb-2">AI 인사이트</h2>
                        <p className="text-gray-600">준비 중</p>
                    </div>
                </div>

                {/* 최근 활동 */}
                <div className="mt-8 bg-white p-6 rounded-lg shadow">
                    <h2 className="text-xl font-bold mb-4">최근 활동</h2>
                    <p className="text-gray-600">아직 데이터가 없습니다.</p>
                </div>
            </main>
        </div>
    );
}

export default DashboardPage;