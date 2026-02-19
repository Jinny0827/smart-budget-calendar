// frontend/src/pages/SchedulesPage.tsx
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import type { View } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { ko } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { logout, getCurrentUser } from '../services/auth-service';
import {
    getSchedules,
    createSchedule,
    updateSchedule,
    deleteSchedule,
} from '../services/schedule-service';
import { getExpenses } from '../services/expense-service';
import type { Schedule, Expense } from '../types';
import Holidays from 'date-holidays';

// ─── date-fns 로컬라이저 설정 ────────────────────────────────
const locales = { ko };
const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek: () => startOfWeek(new Date(), { locale: ko }),
    getDay,
    locales,
});

// ─── 공휴일 초기화 (컴포넌트 밖에서 한 번만) ─────────────────
const hd = new Holidays('KR');
const currentYear = new Date().getFullYear();
const holidayList = [
    ...hd.getHolidays(currentYear - 1),
    ...hd.getHolidays(currentYear),
    ...hd.getHolidays(currentYear + 1),
].filter((h) => h.type === 'public');

const holidaySet = new Set(
    holidayList.map((h) => format(new Date(h.date), 'yyyy-MM-dd'))
);
const holidayNameMap = new Map(
    holidayList.map((h) => [format(new Date(h.date), 'yyyy-MM-dd'), h.name])
);

// ─── 상수 ────────────────────────────────────────────────────
const CATEGORIES = ['식비', '교통', '의료', '운동', '여행', '쇼핑', '문화', '교육', '기타'];

const CATEGORY_COLORS: Record<string, string> = {
    식비: '#FF6384', 교통: '#36A2EB', 의료: '#FF9F40', 운동: '#4BC0C0',
    여행: '#9966FF', 쇼핑: '#FF6B6B', 문화: '#C9CBCF', 교육: '#FFCD56', 기타: '#B0BEC5',
};

const emptyForm = {
    title: '',
    date: '',
    endDate: '',
    category: '기타',
    isRecurring: false,
    recurringPattern: { frequency: 'monthly' as 'daily' | 'weekly' | 'monthly', interval: 1 },
};

// ─── 캘린더 이벤트 타입 ───────────────────────────────────────
interface CalendarEvent {
    id: string;
    title: string;
    start: Date;
    end: Date;
    type: 'schedule' | 'expense';
    resource: Schedule | Expense;
}

function SchedulesPage() {
    const navigate = useNavigate();
    const user = getCurrentUser();

    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [currentView, setCurrentView] = useState<View>('month');
    const [currentDate, setCurrentDate] = useState(new Date());

    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState(emptyForm);
    const [submitting, setSubmitting] = useState(false);

    // ─── 데이터 로드 ─────────────────────────────────────────
    const fetchAll = async () => {
        try {
            setLoading(true);
            const [scheduleData, expenseData] = await Promise.all([
                getSchedules(),
                getExpenses({}),
            ]);
            setSchedules(scheduleData);
            setExpenses(expenseData);
        } catch {
            setError('데이터를 불러오는데 실패했습니다');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAll();
    }, []);

    // ─── 모달 열기 (날짜 지정) ───────────────────────────────
    // dateCellWrapper와 onSelectSlot 둘 다 이 함수를 사용
    const openCreateModal = useCallback((date: Date) => {
        const dateStr = format(date, 'yyyy-MM-dd');
        setEditingId(null);
        setForm({ ...emptyForm, date: dateStr, endDate: '' });
        setShowModal(true);
    }, []);

    // ─── 이벤트 변환 ─────────────────────────────────────────
    const scheduleEvents: CalendarEvent[] = schedules.map((s) => {
        const start = new Date(s.date);
        const end = s.endDate ? new Date(s.endDate) : start;
        return { id: s._id, title: s.title, start, end, type: 'schedule', resource: s };
    });

    const expenseEvents: CalendarEvent[] = expenses.map((e) => {
        const date = new Date(e.date);
        return {
            id: e._id,
            title: `💸 ${e.description} (${e.amount.toLocaleString()}원)`,
            start: date,
            end: date,
            type: 'expense',
            resource: e,
        };
    });

    const events: CalendarEvent[] = [...scheduleEvents, ...expenseEvents];

    // ─── 이벤트 스타일 ───────────────────────────────────────
    const eventStyleGetter = useCallback((event: CalendarEvent) => {
        if (event.type === 'expense') {
            return {
                style: {
                    backgroundColor: '#fef2f2',
                    borderLeft: '3px solid #ef4444',
                    borderRadius: '4px',
                    color: '#374151',
                    fontSize: '11px',
                    padding: '2px 6px',
                },
            };
        }
        const s = event.resource as Schedule;
        const color = CATEGORY_COLORS[s.category] ?? '#B0BEC5';
        return {
            style: {
                backgroundColor: color,
                borderRadius: '4px',
                opacity: 0.9,
                color: '#fff',
                border: 'none',
                fontSize: '12px',
                padding: '2px 6px',
            },
        };
    }, []);

    // ─── 날짜 셀 스타일 (공휴일/일요일 빨강) ────────────────
    const dayPropGetter = useCallback((date: Date) => {
        const dateStr = format(date, 'yyyy-MM-dd');
        const isSunday = date.getDay() === 0;
        const isHoliday = holidaySet.has(dateStr);
        if (isHoliday || isSunday) {
            return { style: { backgroundColor: '#fff5f5' } };
        }
        return {};
    }, []);

    // ─── 빈 날짜 드래그 범위 선택 → 생성 모달 ───────────────
    // 현재 달 날짜에만 동작 (다른 달은 dateCellWrapper가 처리)
    const handleSelectSlot = useCallback(({ start, end }: { start: Date; end: Date }) => {
        const startStr = format(start, 'yyyy-MM-dd');
        const endStr = format(end, 'yyyy-MM-dd');
        setEditingId(null);
        setForm({
            ...emptyForm,
            date: startStr,
            endDate: startStr === endStr ? '' : endStr,
        });
        setShowModal(true);
    }, []);

    // ─── 이벤트 클릭 ────────────────────────────────────────
    const handleSelectEvent = useCallback((event: CalendarEvent) => {
        if (event.type === 'expense') {
            navigate('/expenses');
            return;
        }
        const s = event.resource as Schedule;
        setEditingId(s._id);
        setForm({
            title: s.title,
            date: s.date.split('T')[0],
            endDate: s.endDate ? s.endDate.split('T')[0] : '',
            category: s.category,
            isRecurring: s.isRecurring,
            recurringPattern: s.recurringPattern ?? { frequency: 'monthly', interval: 1 },
        });
        setShowModal(true);
    }, [navigate]);

    // ─── 저장 ────────────────────────────────────────────────
    const handleSubmit = async () => {
        if (!form.title || !form.date || !form.category) {
            alert('제목, 날짜, 카테고리를 입력해주세요');
            return;
        }
        if (form.endDate && form.endDate < form.date) {
            alert('종료일은 시작일 이후여야 합니다');
            return;
        }
        try {
            setSubmitting(true);
            const payload = { ...form, endDate: form.endDate || undefined };
            if (editingId) {
                await updateSchedule(editingId, payload);
            } else {
                await createSchedule(payload);
            }
            setShowModal(false);
            await fetchAll();
        } catch {
            alert('저장에 실패했습니다');
        } finally {
            setSubmitting(false);
        }
    };

    // ─── 삭제 ────────────────────────────────────────────────
    const handleDelete = async () => {
        if (!editingId || !window.confirm('일정을 삭제하시겠습니까?')) return;
        try {
            await deleteSchedule(editingId);
            setShowModal(false);
            await fetchAll();
        } catch {
            alert('삭제에 실패했습니다');
        }
    };

    const handleLogout = () => { logout(); navigate('/login'); };

    const messages = {
        today: '오늘', previous: '◀', next: '▶',
        month: '월', week: '주', day: '일', agenda: '목록',
        date: '날짜', time: '시간', event: '일정',
        noEventsInRange: '이 기간에 일정이 없습니다.',
        showMore: (count: number) => `+${count}개 더 보기`,
    };

    return (
        <div className="min-h-screen bg-gray-100">
            {/* ─── 헤더 ───────────────────────────────────── */}
            <header className="bg-white shadow">
                <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-gray-900">스마트 가계부</h1>
                    <div className="flex items-center gap-4">
                        <span className="text-gray-700">{user?.name}님</span>
                        <button onClick={handleLogout} className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600">
                            로그아웃
                        </button>
                    </div>
                </div>
            </header>

            {/* ─── 네비게이션 ─────────────────────────────── */}
            <nav className="bg-white shadow-sm">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="flex gap-6 py-4">
                        <button onClick={() => navigate('/dashboard')} className="px-4 py-2 text-gray-600 hover:text-blue-600">대시보드</button>
                        <button onClick={() => navigate('/schedules')} className="px-4 py-2 text-blue-600 border-b-2 border-blue-600 font-medium">일정 관리</button>
                        <button onClick={() => navigate('/expenses')} className="px-4 py-2 text-gray-600 hover:text-blue-600">지출 관리</button>
                    </div>
                </div>
            </nav>

            {/* ─── 메인 ───────────────────────────────────── */}
            <main className="max-w-7xl mx-auto px-4 py-8">
                {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">{error}</div>}

                <div className="bg-white p-6 rounded-lg shadow">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-2xl font-bold">일정 관리</h2>
                        <button
                            onClick={() => openCreateModal(new Date())}
                            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                        >
                            + 일정 추가
                        </button>
                    </div>

                    {/* 범례 */}
                    <div className="flex flex-wrap gap-4 mb-4 text-xs text-gray-600">
                        {CATEGORIES.map((cat) => (
                            <span key={cat} className="flex items-center gap-1">
                                <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[cat] }} />
                                {cat}
                            </span>
                        ))}
                        <span className="flex items-center gap-1">
                            <span className="inline-block w-3 h-3 rounded" style={{ backgroundColor: '#fef2f2', border: '1px solid #ef4444' }} />
                            지출
                        </span>
                        <span className="flex items-center gap-1">
                            <span className="inline-block w-3 h-3 rounded" style={{ backgroundColor: '#fff5f5', border: '1px solid #fca5a5' }} />
                            공휴일
                        </span>
                    </div>

                    {loading ? (
                        <div className="text-center py-20 text-gray-400">로딩 중...</div>
                    ) : (
                        <Calendar
                            localizer={localizer}
                            events={events}
                            startAccessor="start"
                            endAccessor="end"
                            style={{ height: 680 }}
                            view={currentView}
                            onView={setCurrentView}
                            date={currentDate}
                            onNavigate={setCurrentDate}
                            selectable
                            onSelectSlot={handleSelectSlot}
                            onSelectEvent={handleSelectEvent}
                            eventPropGetter={eventStyleGetter}
                            dayPropGetter={dayPropGetter}
                            messages={messages}
                            culture="ko"
                            popup
                            popupOffset={10}
                            components={{
                                // ─── 날짜 셀 전체 클릭 처리 ─────────────────
                                // 다른 달 날짜 클릭 시에도 생성 모달이 열리도록
                                dateCellWrapper: ({ children, value }: { children: React.ReactNode; value: Date }) => (
                                    <div
                                        style={{ flex: 1, cursor: 'pointer' }}
                                        onClick={() => openCreateModal(value)}
                                    >
                                        {children}
                                    </div>
                                ),
                                month: {
                                    // ─── 날짜 숫자 커스텀 ────────────────────
                                    dateHeader: ({ date, label }: { date: Date; label: string }) => {
                                        const dateStr = format(date, 'yyyy-MM-dd');
                                        const isSunday = date.getDay() === 0;
                                        const isSaturday = date.getDay() === 6;
                                        const holidayName = holidayNameMap.get(dateStr);
                                        const isRed = isSunday || !!holidayName;

                                        return (
                                            <div className="flex flex-col items-end pr-1">
                                                <span style={{
                                                    color: isRed ? '#ef4444' : isSaturday ? '#3b82f6' : undefined,
                                                    fontSize: '13px',
                                                    fontWeight: isRed ? 600 : undefined,
                                                }}>
                                                    {label}
                                                </span>
                                                {holidayName && (
                                                    <span style={{ fontSize: '9px', color: '#ef4444', lineHeight: 1.2 }}>
                                                        {holidayName}
                                                    </span>
                                                )}
                                            </div>
                                        );
                                    },
                                },
                            }}
                        />
                    )}
                </div>
            </main>

            {/* ─── 생성/수정 모달 ─────────────────────────── */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md mx-4">
                        <h3 className="text-lg font-bold mb-5">
                            {editingId ? '일정 수정' : '일정 추가'}
                        </h3>

                        <div className="space-y-4">
                            {/* 제목 */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">제목 *</label>
                                <input
                                    type="text"
                                    value={form.title}
                                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                                    placeholder="일정 제목"
                                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                                />
                            </div>

                            {/* 시작일 / 종료일 */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">시작일 *</label>
                                    <input
                                        type="date"
                                        value={form.date}
                                        onChange={(e) => setForm({ ...form, date: e.target.value })}
                                        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        종료일 <span className="text-gray-400 font-normal">(선택)</span>
                                    </label>
                                    <input
                                        type="date"
                                        value={form.endDate}
                                        min={form.date}
                                        onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                                        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                                    />
                                </div>
                            </div>

                            {/* 카테고리 */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">카테고리 *</label>
                                <select
                                    value={form.category}
                                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                                >
                                    {CATEGORIES.map((cat) => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>

                            {/* 반복 일정 */}
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="isRecurring"
                                    checked={form.isRecurring}
                                    onChange={(e) => setForm({ ...form, isRecurring: e.target.checked })}
                                    className="w-4 h-4 accent-blue-500"
                                />
                                <label htmlFor="isRecurring" className="text-sm text-gray-700">반복 일정</label>
                            </div>

                            {form.isRecurring && (
                                <div className="flex gap-3 pl-6 items-center">
                                    <select
                                        value={form.recurringPattern.frequency}
                                        onChange={(e) =>
                                            setForm({
                                                ...form,
                                                recurringPattern: {
                                                    ...form.recurringPattern,
                                                    frequency: e.target.value as 'daily' | 'weekly' | 'monthly',
                                                },
                                            })
                                        }
                                        className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                                    >
                                        <option value="daily">매일</option>
                                        <option value="weekly">매주</option>
                                        <option value="monthly">매월</option>
                                    </select>
                                    <input
                                        type="number"
                                        min={1}
                                        value={form.recurringPattern.interval}
                                        onChange={(e) =>
                                            setForm({
                                                ...form,
                                                recurringPattern: {
                                                    ...form.recurringPattern,
                                                    interval: Number(e.target.value),
                                                },
                                            })
                                        }
                                        className="w-20 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                                    />
                                    <span className="text-sm text-gray-500">회마다</span>
                                </div>
                            )}
                        </div>

                        {/* 버튼 */}
                        <div className="flex justify-between mt-6">
                            <div>
                                {editingId && (
                                    <button onClick={handleDelete} className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600">
                                        삭제
                                    </button>
                                )}
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                                    취소
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    disabled={submitting}
                                    className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 disabled:opacity-50"
                                >
                                    {submitting ? '저장 중...' : '저장'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default SchedulesPage;