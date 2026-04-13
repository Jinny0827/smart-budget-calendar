import { useNavigate } from 'react-router-dom';
import {useEffect, useState} from "react";
import type { Expense, Schedule } from "../types";
import {
    getExpenses,
    createExpense,
    updateExpense,
    deleteExpense,
} from "../services/expense-service.ts";
import { getSchedules } from "../services/schedule-service.ts";
import { importCardHistory } from "../services/import-service.ts";

// 카테고리 목록 (type별 분리)
const EXPENSE_CATEGORIES = ['식비', '교통', '의료', '운동', '여행', '쇼핑', '문화', '교육', '기타'];
const INCOME_CATEGORIES = ['급여', '부업', '사업', '투자', '용돈', '환급', '기타'];

// 빈 폼 초기값
const emptyForm = {
    amount: '',
    category: '식비',
    description: '',
    date: new Date().toISOString().split('T')[0],
    time: `${String(new Date().getHours()).padStart(2, '0')}:${String(new Date().getMinutes()).padStart(2, '0')}`,
    scheduleId: '',
    type: 'expense' as 'income' | 'expense',
};

function ExpensesPage() {
    const navigate = useNavigate();

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

    // 카드 가져오기 모달 상태
    const [showImportModal, setShowImportModal] = useState(false);
    const [importFile, setImportFile] = useState<File | null>(null);
    const [importing, setImporting] = useState(false);
    const [importResult, setImportResult] = useState<string>('');
    const [selectedCard, setSelectedCard] = useState<string>('삼성카드');

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

    // 추가 버튼
    const handleOpenAdd = () => {
        setEditingId(null);
        setForm(emptyForm);
        setShowModal(true);
    };

    // 수정 버튼
    const handleOpenEdit = (expense: Expense) => {
        setEditingId(expense._id);
        const d = new Date(expense.date);
        const timeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
        setForm({
            amount: String(expense.amount),
            category: expense.category,
            description: expense.description,
            date: expense.date.split('T')[0],
            time: timeStr,
            scheduleId: expense.scheduleId || '',
            type: expense.type || 'expense',
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
                date: form.time ? `${form.date}T${form.time}` : form.date,
                scheduleId: form.scheduleId || undefined,
                type: form.type,
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

    // 카드 내역 가져오기
    const handleImport = async () => {
        if (!importFile) { alert('파일을 선택해주세요'); return; }
        if (selectedCard !== '삼성카드') {
            alert(`${selectedCard}는 현재 지원 예정입니다.\n현재는 삼성카드만 지원합니다.`);
            return;
        }
        try {
            setImporting(true);
            setImportResult('');
            const { count, skipped, cardName } = await importCardHistory(importFile);
            const msg = skipped > 0
                ? `✅ ${cardName} ${count}건 추가 (중복 ${skipped}건 스킵)`
                : `✅ ${cardName} ${count}건 가져오기 완료!`;
            setImportResult(msg);
            setImportFile(null);
            await fetchExpenses();
        } catch (err: any) {
            setImportResult(`❌ ${err?.response?.data?.message || '가져오기 실패'}`);
        } finally {
            setImporting(false);
        }
    };

    // 수입/지출/잔액 합계
    const totalIncome = expenses.filter((e) => e.type === 'income').reduce((sum, e) => sum + e.amount, 0);
    const totalExpense = expenses.filter((e) => e.type !== 'income').reduce((sum, e) => sum + e.amount, 0);
    const balance = totalIncome - totalExpense;


    return (
        <>
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
                            <optgroup label="지출">
                                {EXPENSE_CATEGORIES.map((cat) => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </optgroup>
                            <optgroup label="수입">
                                {INCOME_CATEGORIES.map((cat) => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </optgroup>
                        </select>

                        <button
                            onClick={() => { setImportResult(''); setShowImportModal(true); }}
                            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
                        >
                            📥 카드 가져오기
                        </button>
                        <button
                            onClick={handleOpenAdd}
                            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                        >
                            + 내역 추가
                        </button>
                    </div>
                </div>

                {/* 합계 */}
                {expenses.length > 0 && (
                    <div className="mb-4 p-3 bg-blue-50 rounded-lg flex flex-wrap justify-between items-center gap-2">
                        <span className="text-blue-700 font-medium">총 {expenses.length}건</span>
                        <div className="flex gap-4">
                            <span className="text-green-600 font-semibold">수입 +{totalIncome.toLocaleString()}원</span>
                            <span className="text-red-500 font-semibold">지출 -{totalExpense.toLocaleString()}원</span>
                            <span className={`font-bold ${balance >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
                                잔액 {balance >= 0 ? '+' : ''}{balance.toLocaleString()}원
                            </span>
                        </div>
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
                                <th className="py-3 px-4 text-sm text-gray-600 hidden sm:table-cell">유형</th>
                                <th className="py-3 px-4 text-sm text-gray-600 hidden sm:table-cell">카테고리</th>
                                <th className="py-3 px-4 text-sm text-gray-600 hidden lg:table-cell">연결 일정</th>
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
                                    <td className="py-3 px-4 hidden sm:table-cell">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                            expense.type === 'income'
                                                ? 'bg-green-100 text-green-700'
                                                : 'bg-red-100 text-red-700'
                                        }`}>
                                            {expense.type === 'income' ? '수입' : '지출'}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4 hidden sm:table-cell">
                                            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
                                                {expense.category}
                                            </span>
                                    </td>
                                    <td className="py-3 px-4 text-gray-400 text-sm hidden lg:table-cell">
                                        {expense.scheduleId
                                            ? schedules.find((s) => s._id === expense.scheduleId)?.title || '-'
                                            : '-'}
                                    </td>
                                    <td className={`py-3 px-4 text-right font-semibold ${
                                        expense.type === 'income' ? 'text-green-500' : 'text-red-500'
                                    }`}>
                                        {expense.type === 'income' ? '+' : '-'}{expense.amount.toLocaleString()}원
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

            {/* 추가/수정 모달 */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
                        <h3 className="text-xl font-bold mb-4">
                            {editingId
                                ? (form.type === 'income' ? '수입 수정' : '지출 수정')
                                : (form.type === 'income' ? '수입 추가' : '지출 추가')}
                        </h3>

                        <div className="space-y-4">
                            {/* 수입/지출 유형 선택 */}
                            <div>
                                <label className="block text-sm text-gray-700 mb-1">유형 *</label>
                                <div className="flex rounded overflow-hidden border">
                                    <button
                                        type="button"
                                        onClick={() => setForm({ ...form, type: 'expense', category: EXPENSE_CATEGORIES[0] })}
                                        className={`flex-1 py-2 text-sm font-medium transition-colors ${
                                            form.type === 'expense'
                                                ? 'bg-red-500 text-white'
                                                : 'bg-white text-gray-600 hover:bg-gray-50'
                                        }`}
                                    >
                                        지출
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setForm({ ...form, type: 'income', category: INCOME_CATEGORIES[0] })}
                                        className={`flex-1 py-2 text-sm font-medium transition-colors ${
                                            form.type === 'income'
                                                ? 'bg-green-500 text-white'
                                                : 'bg-white text-gray-600 hover:bg-gray-50'
                                        }`}
                                    >
                                        수입
                                    </button>
                                </div>
                            </div>

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
                                    {(form.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map((cat) => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                                    <label className="block text-sm text-gray-700 mb-1">시간</label>
                                    <input
                                        type="time"
                                        value={form.time}
                                        onChange={(e) => setForm({ ...form, time: e.target.value })}
                                        className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
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

            {/* 카드 내역 가져오기 모달 */}
            {showImportModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
                        <h3 className="text-xl font-bold mb-4">카드 내역 가져오기</h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-gray-700 mb-1">카드사 선택 *</label>
                                <select
                                    value={selectedCard}
                                    onChange={(e) => { setSelectedCard(e.target.value); setImportResult(''); }}
                                    className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                >
                                    <option value="삼성카드">삼성카드 ✅ 지원</option>
                                    <option value="신한카드">신한카드 (지원 예정)</option>
                                    <option value="KB국민카드">KB국민카드 (지원 예정)</option>
                                    <option value="현대카드">현대카드 (지원 예정)</option>
                                    <option value="롯데카드">롯데카드 (지원 예정)</option>
                                    <option value="우리카드">우리카드 (지원 예정)</option>
                                    <option value="하나카드">하나카드 (지원 예정)</option>
                                    <option value="BC카드">BC카드 (지원 예정)</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm text-gray-700 mb-1">이용내역 파일 (.xlsx)</label>
                                <input
                                    type="file"
                                    accept=".xlsx,.xls"
                                    onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                                    className="w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                />
                            </div>

                            {importFile && (
                                <p className="text-sm text-gray-600">
                                    선택된 파일: <span className="font-medium">{importFile.name}</span>
                                </p>
                            )}

                            {importResult && (
                                <p className={`text-sm font-medium ${importResult.startsWith('✅') ? 'text-green-600' : 'text-red-600'}`}>
                                    {importResult}
                                </p>
                            )}
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => { setShowImportModal(false); setImportFile(null); setImportResult(''); setSelectedCard('삼성카드'); }}
                                className="flex-1 px-4 py-2 border rounded hover:bg-gray-50"
                            >
                                닫기
                            </button>
                            <button
                                onClick={handleImport}
                                disabled={importing || !importFile}
                                className="flex-1 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-400"
                            >
                                {importing ? '가져오는 중...' : '가져오기'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

export default ExpensesPage;
