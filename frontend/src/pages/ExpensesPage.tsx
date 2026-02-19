import { useNavigate } from 'react-router-dom';
import { logout, getCurrentUser } from '../services/auth-service';
import {useEffect, useState} from "react";
import type { Expense, Schedule } from "../types";
import {
    getExpenses,
    createExpense,
    updateExpense,
    deleteExpense,
} from "../services/expense-service.ts";
import { getSchedules } from "../services/schedule-service.ts";

// 카테고리 목록
const CATEGORIES = ['식비', '교통', '의료', '운동', '여행', '쇼핑', '문화', '교육', '기타'];

// 빈 폼 초기값
const emptyForm = {
    amount: '',
    category: '식비',
    description: '',
    date: new Date().toISOString().split('T')[0],
    scheduleId: '',
};

function ExpensesPage() {
    const navigate = useNavigate();
    const user = getCurrentUser();

    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // 필터 상태
    const [filterCategory, setFilterCategory] = useState('');

    // 모달 상태
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState(emptyForm);
    const [submitting, setSubmitting] = useState(false);

    // 데이터 로드
    const fetchExpenses = async() => {
        try {
            setLoading(true);
            const [expenseData, scheduleData] = await Promise.all([
                getExpenses(filterCategory ? { category: filterCategory } : undefined),
                getSchedules(),
            ]);
            setExpenses(expenseData);
            setSchedules(scheduleData);
        } catch (err) {
            setError('지출을 불러오는데 실패했습니다');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchExpenses();
    }, [filterCategory]);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    // 추가 버튼
    const handleOpenAdd = () => {
        setEditingId(null);
        setForm(emptyForm);
        setShowModal(true);
    };

    // 수정 버튼
    const handleOpenEdit = (expense: Expense) => {
        setEditingId(expense._id);
        setForm({
            amount: String(expense.amount),
            category: expense.category,
            description: expense.description,
            date: expense.date.split('T')[0],
            scheduleId: expense.scheduleId || '',
        });
        setShowModal(true);
    };

    // 저장 (추가 or 수정)
    const handleSubmit = async () => {
        if (!form.amount || !form.category || !form.description) {
            alert('금액, 카테고리, 설명을 입력해주세요');
            return;
        }
        try {
            setSubmitting(true);
            const payload = {
                amount: Number(form.amount),
                category: form.category,
                description: form.description,
                date: form.date,
                scheduleId: form.scheduleId || undefined,
            };
            if (editingId) {
                await updateExpense(editingId, payload);
            } else {
                await createExpense(payload);
            }
            setShowModal(false);
            await fetchExpenses();
        } catch (err) {
            alert('저장에 실패했습니다');
        } finally {
            setSubmitting(false);
        }
    };

    // 삭제
    const handleDelete = async (id: string) => {
        if (!window.confirm('지출을 삭제하시겠습니까?')) return;
        try {
            await deleteExpense(id);
            await fetchExpenses();
        } catch (err) {
            alert('삭제에 실패했습니다');
        }
    };

    // 총 지출 합계
    const total = expenses.reduce((sum, e) => sum + e.amount, 0);


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
                        <button onClick={() => navigate('/dashboard')} className="px-4 py-2 text-gray-600 hover:text-blue-600">
                            대시보드
                        </button>
                        <button onClick={() => navigate('/schedules')} className="px-4 py-2 text-gray-600 hover:text-blue-600">
                            일정 관리
                        </button>
                        <button onClick={() => navigate('/expenses')} className="px-4 py-2 text-blue-600 border-b-2 border-blue-600 font-medium">
                            지출 관리
                        </button>
                    </div>
                </div>
            </nav>

            {/* 메인 콘텐츠 */}
            <main className="max-w-7xl mx-auto px-4 py-8">
                <div className="bg-white p-6 rounded-lg shadow">
                    <div className="flex flex-wrap justify-between items-center mb-6 gap-3">
                        <h2 className="text-2xl font-bold">지출 관리</h2>

                        <div className="flex items-center gap-3">
                            {/* 카테고리 필터 */}
                            <select
                                value={filterCategory}
                                onChange={(e) => setFilterCategory(e.target.value)}
                                className="px-3 py-2 border rounded text-sm"
                            >
                                <option value="">전체 카테고리</option>
                                {CATEGORIES.map((cat) => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>

                            <button
                                onClick={handleOpenAdd}
                                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                            >
                                + 지출 추가
                            </button>
                        </div>
                    </div>

                    {/* 합계 */}
                    {expenses.length > 0 && (
                        <div className="mb-4 p-3 bg-blue-50 rounded-lg flex justify-between">
                            <span className="text-blue-700 font-medium">총 {expenses.length}건</span>
                            <span className="text-blue-700 font-bold">{total.toLocaleString()}원</span>
                        </div>
                    )}

                    {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">{error}</div>}

                    {loading ? (
                        <p className="text-gray-500 text-center py-8">로딩 중...</p>
                    ) : expenses.length === 0 ? (
                        <p className="text-gray-400 text-center py-8">등록된 지출이 없습니다.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                <tr className="border-b bg-gray-50">
                                    <th className="py-3 px-4 text-sm text-gray-600">날짜</th>
                                    <th className="py-3 px-4 text-sm text-gray-600">설명</th>
                                    <th className="py-3 px-4 text-sm text-gray-600">카테고리</th>
                                    <th className="py-3 px-4 text-sm text-gray-600">연결 일정</th>
                                    <th className="py-3 px-4 text-sm text-gray-600 text-right">금액</th>
                                    <th className="py-3 px-4 text-sm text-gray-600">관리</th>
                                </tr>
                                </thead>
                                <tbody>
                                {expenses.map((expense) => (
                                    <tr key={expense._id} className="border-b hover:bg-gray-50">
                                        <td className="py-3 px-4 text-gray-600 text-sm">
                                            {new Date(expense.date).toLocaleDateString('ko-KR')}
                                        </td>
                                        <td className="py-3 px-4 font-medium">{expense.description}</td>
                                        <td className="py-3 px-4">
                                                <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">
                                                    {expense.category}
                                                </span>
                                        </td>
                                        <td className="py-3 px-4 text-gray-400 text-sm">
                                            {expense.scheduleId
                                                ? schedules.find((s) => s._id === expense.scheduleId)?.title || '-'
                                                : '-'}
                                        </td>
                                        <td className="py-3 px-4 text-right font-semibold text-red-500">
                                            -{expense.amount.toLocaleString()}원
                                        </td>
                                        <td className="py-3 px-4">
                                            <button
                                                onClick={() => handleOpenEdit(expense)}
                                                className="mr-2 text-sm text-blue-500 hover:underline"
                                            >
                                                수정
                                            </button>
                                            <button
                                                onClick={() => handleDelete(expense._id)}
                                                className="text-sm text-red-500 hover:underline"
                                            >
                                                삭제
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </main>

            {/* 추가/수정 모달 */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
                        <h3 className="text-xl font-bold mb-4">
                            {editingId ? '지출 수정' : '지출 추가'}
                        </h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-gray-700 mb-1">금액 *</label>
                                <input
                                    type="number"
                                    value={form.amount}
                                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                                    className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="0"
                                    min="0"
                                />
                            </div>

                            <div>
                                <label className="block text-sm text-gray-700 mb-1">설명 *</label>
                                <input
                                    type="text"
                                    value={form.description}
                                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                                    className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="지출 내용"
                                />
                            </div>

                            <div>
                                <label className="block text-sm text-gray-700 mb-1">카테고리 *</label>
                                <select
                                    value={form.category}
                                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                                    className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    {CATEGORIES.map((cat) => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm text-gray-700 mb-1">날짜</label>
                                <input
                                    type="date"
                                    value={form.date}
                                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                                    className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm text-gray-700 mb-1">연결 일정 (선택)</label>
                                <select
                                    value={form.scheduleId}
                                    onChange={(e) => setForm({ ...form, scheduleId: e.target.value })}
                                    className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">없음</option>
                                    {schedules.map((s) => (
                                        <option key={s._id} value={s._id}>
                                            {s.title} ({new Date(s.date).toLocaleDateString('ko-KR')})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setShowModal(false)}
                                className="flex-1 px-4 py-2 border rounded hover:bg-gray-50"
                            >
                                취소
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={submitting}
                                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
                            >
                                {submitting ? '저장 중...' : '저장'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ExpensesPage;