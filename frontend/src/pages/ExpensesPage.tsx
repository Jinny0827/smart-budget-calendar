import {useEffect, useState} from "react";
import type { Expense } from "../types";
import {
    getExpenses,
    createExpense,
    updateExpense,
    deleteExpense,
} from "../services/expense-service.ts";
import { importCardHistory } from "../services/import-service.ts";

// 카테고리 목록 (type별 분리)
const EXPENSE_CATEGORIES = ['식비', '교통', '의료', '운동', '여행', '쇼핑', '문화', '교육', '기타'];
const INCOME_CATEGORIES = ['급여', '부업', '사업', '투자', '용돈', '환급', '기타'];

// 반복 주기 옵션
const RECURRING_OPTIONS = [
    { value: 'daily',     label: '매일', frequency: 'daily'   as const, interval: 1 },
    { value: 'weekly',    label: '매주', frequency: 'weekly'  as const, interval: 1 },
    { value: 'biweekly',  label: '격주', frequency: 'weekly'  as const, interval: 2 },
    { value: 'monthly',   label: '매월', frequency: 'monthly' as const, interval: 1 },
    { value: 'bimonthly', label: '격월', frequency: 'monthly' as const, interval: 2 },
];
const getRecurringValue = (frequency: string, interval: number): string => {
    if (frequency === 'daily')                      return 'daily';
    if (frequency === 'weekly'  && interval === 1)  return 'weekly';
    if (frequency === 'weekly'  && interval === 2)  return 'biweekly';
    if (frequency === 'monthly' && interval === 1)  return 'monthly';
    if (frequency === 'monthly' && interval === 2)  return 'bimonthly';
    return 'monthly';
};

// 빈 폼 초기값
const emptyForm = {
    amount: '',
    category: '식비',
    description: '',
    date: new Date().toISOString().split('T')[0],
    time: `${String(new Date().getHours()).padStart(2, '0')}:${String(new Date().getMinutes()).padStart(2, '0')}`,
    type: 'expense' as 'income' | 'expense',
    isRecurring: false,
    recurringPattern: { frequency: 'monthly' as 'daily' | 'weekly' | 'monthly', interval: 1 },
    recurringEnd: { type: 'forever' as 'forever' | 'date', endDate: '' },
};

function ExpensesPage() {
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // 필터 상태
    const [filterCategory, setFilterCategory] = useState('');

    // 모달 상태
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState(emptyForm);
    const [submitting, setSubmitting] = useState(false);

    // 체크박스 선택 상태
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const handleToggleSelect = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const handleToggleAll = () => {
        setSelectedIds(prev =>
            prev.size === expenses.length
                ? new Set()
                : new Set(expenses.map(e => e._id))
        );
    };

    const handleDeleteSelected = async () => {
        if (selectedIds.size === 0) return;
        if (!window.confirm(`선택한 ${selectedIds.size}건을 삭제하시겠습니까?`)) return;
        try {
            await Promise.all([...selectedIds].map(id => deleteExpense(id)));
            setSelectedIds(new Set());
            await fetchExpenses();
        } catch {
            alert('삭제에 실패했습니다');
        }
    };

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
            const expenseData = await getExpenses(filterCategory ? { category: filterCategory } : undefined);
            setExpenses(expenseData);
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
            type: expense.type || 'expense',
            isRecurring: expense.isRecurring ?? false,
            recurringPattern: expense.recurringPattern ?? { frequency: 'monthly', interval: 1 },
            recurringEnd: {
                type: expense.recurringEnd?.type ?? 'forever',
                endDate: expense.recurringEnd?.endDate ?? '',
            },
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
                type: form.type,
                isRecurring: form.isRecurring,
                recurringPattern: form.isRecurring ? form.recurringPattern : undefined,
                recurringEnd: form.isRecurring
                    ? {
                        type: form.recurringEnd.type,
                        endDate: form.recurringEnd.type === 'date' ? form.recurringEnd.endDate : undefined,
                    }
                    : undefined,
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
            <div className="bg-white p-6 rounded-2xl">
                <div className="flex flex-wrap justify-between items-center mb-6 gap-3">
                    <h2 className="text-xl font-bold text-[#191F28]">지출 관리</h2>

                    <div className="flex items-center gap-3 flex-wrap">
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

                        {/* 선택 삭제 버튼 (체크 시 표시) */}
                        {selectedIds.size > 0 && (
                            <button
                                onClick={handleDeleteSelected}
                                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
                            >
                                🗑 {selectedIds.size}건 삭제
                            </button>
                        )}

                        <button
                            onClick={() => { setImportResult(''); setShowImportModal(true); }}
                            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
                        >
                            📥 카드 가져오기
                        </button>
                        <button
                            onClick={handleOpenAdd}
                            className="px-4 py-2 bg-[#3182F6] text-white rounded hover:bg-[#1B6EE4]"
                        >
                            + 내역 추가
                        </button>
                    </div>
                </div>

                {/* 합계 */}
                {expenses.length > 0 && (
                    <div className="mb-4 p-3 bg-[#EBF3FE] rounded-lg flex flex-wrap justify-between items-center gap-2">
                        <span className="text-[#3182F6] font-medium">총 {expenses.length}건</span>
                        <div className="flex gap-4">
                            <span className="text-green-600 font-semibold">수입 +{totalIncome.toLocaleString()}원</span>
                            <span className="text-[#F04452] font-semibold">지출 -{totalExpense.toLocaleString()}원</span>
                            <span className={`font-bold ${balance >= 0 ? 'text-[#3182F6]' : 'text-red-700'}`}>
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
                                <th className="py-3 px-3">
                                    <input
                                        type="checkbox"
                                        checked={expenses.length > 0 && selectedIds.size === expenses.length}
                                        onChange={handleToggleAll}
                                        className="w-4 h-4 accent-red-500 cursor-pointer"
                                    />
                                </th>
                                <th className="py-3 px-4 text-sm text-gray-600">날짜</th>
                                <th className="py-3 px-4 text-sm text-gray-600">설명</th>
                                <th className="py-3 px-4 text-sm text-gray-600 hidden sm:table-cell">유형</th>
                                <th className="py-3 px-4 text-sm text-gray-600 hidden sm:table-cell">카테고리</th>
                                <th className="py-3 px-4 text-sm text-gray-600 text-right">금액</th>
                                <th className="py-3 px-4 text-sm text-gray-600">관리</th>
                            </tr>
                            </thead>
                            <tbody>
                            {expenses.map((expense) => (
                                <tr
                                    key={expense._id}
                                    className={`border-b hover:bg-gray-50 ${selectedIds.has(expense._id) ? 'bg-red-50' : ''}`}
                                >
                                    <td className="py-3 px-3">
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.has(expense._id)}
                                            onChange={() => handleToggleSelect(expense._id)}
                                            className="w-4 h-4 accent-red-500 cursor-pointer"
                                        />
                                    </td>
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
                                        <span className="px-2 py-1 bg-blue-100 text-[#3182F6] rounded-full text-xs">
                                            {expense.category}
                                        </span>
                                    </td>
                                    <td className={`py-3 px-4 text-right font-semibold ${
                                        expense.type === 'income' ? 'text-[#0DCE7A]' : 'text-[#F04452]'
                                    }`}>
                                        {expense.type === 'income' ? '+' : '-'}{expense.amount.toLocaleString()}원
                                    </td>
                                    <td className="py-3 px-4">
                                        <button
                                            onClick={() => handleOpenEdit(expense)}
                                            className="text-sm text-[#3182F6] hover:underline"
                                        >
                                            수정
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
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4">
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
                                    className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-[#3182F6]"
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
                                    className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-[#3182F6]"
                                    placeholder="지출 내용"
                                />
                            </div>

                            <div>
                                <label className="block text-sm text-gray-700 mb-1">카테고리 *</label>
                                <select
                                    value={form.category}
                                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                                    className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-[#3182F6]"
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
                                        className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-[#3182F6]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-700 mb-1">시간</label>
                                    <input
                                        type="time"
                                        value={form.time}
                                        onChange={(e) => setForm({ ...form, time: e.target.value })}
                                        className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-[#3182F6]"
                                    />
                                </div>
                            </div>

                            {/* 반복 여부 */}
                            {!editingId && (
                                <div className="border rounded-lg p-3 space-y-3 bg-gray-50">
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            id="expIsRecurring"
                                            checked={form.isRecurring}
                                            onChange={(e) => setForm({ ...form, isRecurring: e.target.checked })}
                                            className="w-4 h-4 accent-blue-500"
                                        />
                                        <label htmlFor="expIsRecurring" className="text-sm font-medium text-gray-700">반복 등록</label>
                                    </div>

                                    {form.isRecurring && (
                                        <div className="pl-6 space-y-3">
                                            {/* 주기 */}
                                            <select
                                                value={getRecurringValue(form.recurringPattern.frequency, form.recurringPattern.interval)}
                                                onChange={(e) => {
                                                    const opt = RECURRING_OPTIONS.find(o => o.value === e.target.value)!;
                                                    setForm({
                                                        ...form,
                                                        recurringPattern: { frequency: opt.frequency, interval: opt.interval },
                                                    });
                                                }}
                                                className="border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3182F6]"
                                            >
                                                {RECURRING_OPTIONS.map(o => (
                                                    <option key={o.value} value={o.value}>{o.label}</option>
                                                ))}
                                            </select>

                                            {/* 종료 조건 */}
                                            <div className="space-y-2">
                                                <p className="text-sm font-medium text-gray-700">반복 종료</p>
                                                <div className="flex gap-4">
                                                    <label className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer">
                                                        <input
                                                            type="radio"
                                                            name="expRecurringEnd"
                                                            checked={form.recurringEnd.type === 'forever'}
                                                            onChange={() =>
                                                                setForm({ ...form, recurringEnd: { type: 'forever', endDate: '' } })
                                                            }
                                                            className="accent-blue-500"
                                                        />
                                                        계속
                                                    </label>
                                                    <label className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer">
                                                        <input
                                                            type="radio"
                                                            name="expRecurringEnd"
                                                            checked={form.recurringEnd.type === 'date'}
                                                            onChange={() =>
                                                                setForm({ ...form, recurringEnd: { type: 'date', endDate: '' } })
                                                            }
                                                            className="accent-blue-500"
                                                        />
                                                        날짜 지정
                                                    </label>
                                                </div>
                                                {form.recurringEnd.type === 'date' && (
                                                    <input
                                                        type="date"
                                                        value={form.recurringEnd.endDate}
                                                        min={form.date}
                                                        onChange={(e) =>
                                                            setForm({
                                                                ...form,
                                                                recurringEnd: { type: 'date', endDate: e.target.value },
                                                            })
                                                        }
                                                        className="border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3182F6]"
                                                    />
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

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
                                className="flex-1 px-4 py-2 bg-[#3182F6] text-white rounded hover:bg-[#1B6EE4] disabled:bg-gray-400"
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
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4">
                        <h3 className="text-xl font-bold mb-4">카드 내역 가져오기</h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-gray-700 mb-1">카드사 선택 *</label>
                                <select
                                    value={selectedCard}
                                    onChange={(e) => { setSelectedCard(e.target.value); setImportResult(''); }}
                                    className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-[#3182F6] text-sm"
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
                                    className="w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded file:border-0 file:bg-[#EBF3FE] file:text-[#3182F6] hover:file:bg-blue-100"
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
