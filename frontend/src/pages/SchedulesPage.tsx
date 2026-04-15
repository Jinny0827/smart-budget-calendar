// frontend/src/pages/SchedulesPage.tsx
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import type { View } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { ko } from 'date-fns/locale';
import {
    getSchedules,
    createSchedule,
    updateSchedule,
    deleteSchedule,
} from '../services/schedule-service';
import { getExpenses } from '../services/expense-service';
import { getHolidays } from '../services/holiday-service';
import { getCategories } from '../services/admin-service';
import type { Category } from '../services/admin-service';
import type { Schedule, Expense } from '../types';
import type { UserStock } from '../types/finance';

// ─── date-fns 로컬라이저 설정 ────────────────────────────────
const locales = { ko };
const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek: () => startOfWeek(new Date(), { locale: ko }),
    getDay,
    locales,
});

// ─── 기본 폴백 색상 ───────────────────────────────────────────
const DEFAULT_COLOR = '#B0BEC5';

const emptyForm = {
    title: '',
    date: '',
    startTime: '',
    endDate: '',
    endTime: '',
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
    type: 'schedule' | 'expense' | 'income' | 'stock';
    resource: Schedule | Expense | UserStock;
}

function SchedulesPage() {
    const navigate = useNavigate();

    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // 카테고리 이름 목록 / 색상 맵 (categories state 기반)
    const CATEGORIES = useMemo(() => categories.map((c) => c.name), [categories]);
    const CATEGORY_COLORS = useMemo<Record<string, string>>(
        () => Object.fromEntries(categories.map((c) => [c.name, c.color])),
        [categories]
    );

    // ─── 공휴일 state ────────────────────────────────────────
    const [holidaySet, setHolidaySet] = useState<Set<string>>(new Set());
    const [holidayNameMap, setHolidayNameMap] = useState<Map<string, string>>(new Map());

    const [currentView, setCurrentView] = useState<View>('month');
    const [currentDate, setCurrentDate] = useState(new Date());

    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState(emptyForm);
    const [submitting, setSubmitting] = useState(false);
    const [stocks, setStocks] = useState<UserStock[]>([]);

    // ─── 사이드 패널 ─────────────────────────────────────────
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);

    // ─── 데이터 로드 ─────────────────────────────────────────
    const fetchAll = async () => {
        try {
            setLoading(true);
            const [scheduleData, expenseData, holidayData, categoryData] = await Promise.all([
                getSchedules(),
                getExpenses({}),
                getHolidays(),
                getCategories(),
            ]);
            setSchedules(scheduleData);
            setExpenses(expenseData);
            setCategories(categoryData);

            // 공휴일 set/map 구성
            const newSet = new Set<string>();
            const newMap = new Map<string, string>();
            holidayData.forEach(({ date, name }) => {
                newSet.add(date);
                newMap.set(date, name);
            });
            setHolidaySet(newSet);
            setHolidayNameMap(newMap);

            const token = localStorage.getItem('token');
            const stockRes = await fetch(`${import.meta.env.VITE_API_URL}/finance/stocks`, {
                headers : { Authorization: `Bearer ${token}` },
            });

            const stockData: UserStock[]  = stockRes.ok ? await stockRes.json() : [];
            setStocks(stockData.filter(s => s.type === 'portfolio'));
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
    const openCreateModal = useCallback((date: Date) => {
        const dateStr = format(date, 'yyyy-MM-dd');
        setEditingId(null);
        setForm({ ...emptyForm, date: dateStr, endDate: '' });
        setShowModal(true);
    }, []);

    // ─── 이벤트 변환 ─────────────────────────────────────────
    // 일정 이벤트
    const scheduleEvents: CalendarEvent[] = schedules.flatMap((s) => {
        const start = new Date(s.date);
        const end = s.endDate ? new Date(s.endDate) : start;
        const base = { id: s._id, title: s.title, type: 'schedule' as const, resource: s };

        if (!s.isRecurring || !s.recurringPattern) {
            return [{ ...base, start, end }];
        }

        // 반복 일정이면 12개월치 생성
        const events = [];
        const { frequency, interval } = s.recurringPattern;

        for (let i = 0; i < 12; i++) {
            const s2 = new Date(start);
            const e2 = new Date(end);

            if (frequency === 'monthly') {
                s2.setMonth(s2.getMonth() + i * interval);
                e2.setMonth(e2.getMonth() + i * interval);
            } else if (frequency === 'weekly') {
                s2.setDate(s2.getDate() + i * 7 * interval);
                e2.setDate(e2.getDate() + i * 7 * interval);
            } else if (frequency === 'daily') {
                s2.setDate(s2.getDate() + i * interval);
                e2.setDate(e2.getDate() + i * interval);
            }

            events.push({ ...base, id: `${s._id}-${i}`, start: s2, end: e2 });
        }
        return events;
    });

    // 지출 이벤트
    const expenseEvents: CalendarEvent[] = expenses.map((e) => {
        const date = new Date(e.date);
        const isIncome = e.type === 'income';
        return {
            id: e._id,
            title: `${isIncome ? '💰' : '💸'} ${e.description} (${e.amount.toLocaleString()}원)`,
            start: date,
            end: date,
            type: isIncome ? 'income' : 'expense',
            resource: e,
        };
    });

    // 주식 이벤트 (매입일 입력한 것만 표시)
    const stockEvents: CalendarEvent[] = stocks.filter(s => s.purchaseDate)
        .map(s => {
            const date = new Date(s.purchaseDate as string | Date);
            return {
                id: s._id,
                title: `📈 ${s.corpName} ${s.quantity ?? ''}주 매입`,
                start: date,
                end: date,
                type: 'stock' as const,
                resource: s,
            }
        })

    const events: CalendarEvent[] = [...scheduleEvents, ...expenseEvents, ...stockEvents];

    // ─── 이벤트 스타일 ───────────────────────────────────────
    const eventStyleGetter = useCallback((event: CalendarEvent) => {
        if(event.type === 'stock') {
            return {
                style: {
                    backgroundColor: '#eff6ff',
                    borderLeft: '3px solid #3b82f6',
                    borderRadius: '4px',
                    color: '#1d4ed8',
                    fontSize: '11px',
                    padding: '2px 6px',
                },
            };
        }

        if (event.type === 'income') {
            return {
                style: {
                    backgroundColor: '#f0fdf4',
                    borderLeft: '3px solid #22c55e',
                    borderRadius: '4px',
                    color: '#374151',
                    fontSize: '11px',
                    padding: '2px 6px',
                },
            };
        }
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
    }, [CATEGORY_COLORS]);

    // ─── 빈 날짜 클릭/드래그 → 사이드 패널 열기 ─────────────
    const handleSelectSlot = useCallback(({ start }: { start: Date; end: Date }) => {
        setSelectedDate(start);
    }, []);

    // ─── 이벤트 클릭 → 사이드 패널 열기 ─────────────────────
    const handleSelectEvent = useCallback((event: CalendarEvent) => {
        setSelectedDate(event.start);
    }, []);

    // ─── 사이드 패널 이벤트 클릭 ─────────────────────────────
    const handlePanelEventClick = useCallback((event: CalendarEvent) => {
        if (event.type === 'expense' || event.type === 'income') {
            navigate('/expenses');
            return;
        }
        if (event.type === 'stock') {
            navigate('/finance');
            return;
        }
        const s = event.resource as Schedule;
        const startDate = new Date(s.date);
        const endDate = s.endDate ? new Date(s.endDate) : null;
        setEditingId(s._id);
        setForm({
            title: s.title,
            date: s.date.split('T')[0],
            startTime: format(startDate, 'HH:mm') === '00:00' ? '' : format(startDate, 'HH:mm'),
            endDate: s.endDate ? s.endDate.split('T')[0] : '',
            endTime: endDate ? (format(endDate, 'HH:mm') === '00:00' ? '' : format(endDate, 'HH:mm')) : '',
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
            const payload = {
                ...form,
                date: form.startTime ? `${form.date}T${form.startTime}` : form.date,
                endDate: form.endDate
                    ? (form.endTime ? `${form.endDate}T${form.endTime}` : form.endDate)
                    : undefined,
            };
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

    const messages = {
        today: '오늘', previous: '◀', next: '▶',
        month: '월', week: '주', day: '일', agenda: '목록',
        date: '날짜', time: '시간', event: '일정',
        noEventsInRange: '이 기간에 일정이 없습니다.',
        showMore: (count: number) => `+${count}개 더 보기`,
    };

    // ─── 선택된 날짜의 이벤트 목록 ──────────────────────────
    const selectedDateEvents = selectedDate
        ? events.filter(e => format(e.start, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd'))
        : [];

    const getPanelEventStyle = (event: CalendarEvent) => {
        if (event.type === 'stock')   return { backgroundColor: '#eff6ff', borderLeft: '3px solid #3b82f6', color: '#1d4ed8' };
        if (event.type === 'income')  return { backgroundColor: '#f0fdf4', borderLeft: '3px solid #22c55e', color: '#166534' };
        if (event.type === 'expense') return { backgroundColor: '#fef2f2', borderLeft: '3px solid #ef4444', color: '#991b1b' };
        const s = event.resource as Schedule;
        const color = CATEGORY_COLORS[s.category] ?? DEFAULT_COLOR;
        return { backgroundColor: color + '22', borderLeft: `3px solid ${color}`, color: '#374151' };
    };

    return (
        <>
            {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">{error}</div>}

            <div className="flex gap-4 items-start">
            <div className="bg-white p-6 rounded-lg shadow flex-1 min-w-0">
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
                            <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[cat] ?? DEFAULT_COLOR }} />
                            {cat}
                        </span>
                    ))}
                    <span className="flex items-center gap-1">
                        <span className="inline-block w-3 h-3 rounded" style={{ backgroundColor: '#f0fdf4', border: '1px solid #22c55e' }} />
                        수입
                    </span>
                    <span className="flex items-center gap-1">
                        <span className="inline-block w-3 h-3 rounded" style={{ backgroundColor: '#fef2f2', border: '1px solid #ef4444' }} />
                        지출
                    </span>
                    <span className="flex items-center gap-1">
                        <span className="inline-block w-3 h-3 rounded" style={{ backgroundColor: '#fee2e2', border: '1px solid #ef4444' }} />
                        공휴일/일요일
                    </span>
                    <span className="flex items-center gap-1">
                        <span className="inline-block w-3 h-3 rounded" style={{ backgroundColor: '#eff6ff', border: '1px solid #3b82f6' }} />
                        토요일
                    </span>
                    <span className="flex items-center gap-1">
                        <span className="inline-block w-3 h-3 rounded" style={{ backgroundColor: '#eff6ff', border: '1px solid #3b82f6' }} />
                        주식 매입
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
                        messages={messages}
                        culture="ko"
                        popup
                        popupOffset={10}
                        components={{
                            // ─── 날짜 셀 배경색 + 클릭 처리 ─────────────
                            dateCellWrapper: ({ children, value }: { children: React.ReactNode; value: Date }) => {
                                const dateStr = format(value, 'yyyy-MM-dd');
                                const isSunday = value.getDay() === 0;
                                const isSaturday = value.getDay() === 6;
                                const isHoliday = holidaySet.has(dateStr);
                                const isSelected = selectedDate && format(selectedDate, 'yyyy-MM-dd') === dateStr;

                                let bg = 'transparent';
                                if (isSelected) bg = '#e0e7ff';
                                else if (isHoliday || isSunday) bg = '#fee2e2';
                                else if (isSaturday) bg = '#eff6ff';

                                return (
                                    <div
                                        style={{ flex: 1, cursor: 'pointer', backgroundColor: bg }}
                                        onClick={() => setSelectedDate(value)}
                                    >
                                        {children}
                                    </div>
                                );
                            },
                            month: {
                                // ─── 날짜 숫자 + 공휴일명 표시 ──────────
                                dateHeader: ({ date, label }: { date: Date; label: string }) => {
                                    const dateStr = format(date, 'yyyy-MM-dd');
                                    const todayStr = format(new Date(), 'yyyy-MM-dd');
                                    const isToday = dateStr === todayStr;
                                    const isSunday = date.getDay() === 0;
                                    const isSaturday = date.getDay() === 6;
                                    const holidayName = holidayNameMap.get(dateStr);
                                    const isRed = isSunday || !!holidayName;

                                    return (
                                        <div className="flex flex-col items-end pr-1">
                                            <span style={{
                                                // 오늘이면 흰 텍스트, 아니면 기존 색상
                                                color: isToday ? '#fff' : (isRed ? '#ef4444' : isSaturday ? '#3b82f6' : '#374151'),
                                                fontSize: '13px',
                                                fontWeight: isToday ? 700 : (isRed ? 600 : undefined),
                                                // 오늘이면 인디고 원형 배경
                                                backgroundColor: isToday ? '#4f46e5' : undefined,
                                                borderRadius: isToday ? '50%' : undefined,
                                                width: isToday ? '24px' : undefined,
                                                height: isToday ? '24px' : undefined,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
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

            {/* ─── 사이드 패널 ─────────────────────────────── */}
            {selectedDate && (
                <div className="w-72 flex-shrink-0 bg-white rounded-lg shadow border border-gray-200 flex flex-col sticky top-4" style={{ maxHeight: '780px' }}>
                    {/* 패널 헤더 */}
                    <div className="flex justify-between items-start p-4 border-b">
                        <div>
                            <p className="text-xs text-gray-400">{format(selectedDate, 'yyyy년 M월', { locale: ko })}</p>
                            <p className="text-xl font-bold text-gray-900">{format(selectedDate, 'd일 (eee)', { locale: ko })}</p>
                            {holidayNameMap.get(format(selectedDate, 'yyyy-MM-dd')) && (
                                <p className="text-xs text-red-500 mt-0.5">
                                    {holidayNameMap.get(format(selectedDate, 'yyyy-MM-dd'))}
                                </p>
                            )}
                        </div>
                        <button
                            onClick={() => setSelectedDate(null)}
                            className="text-gray-400 hover:text-gray-700 text-xl leading-none mt-1"
                        >×</button>
                    </div>

                    {/* 이벤트 목록 */}
                    <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
                        {selectedDateEvents.length === 0 ? (
                            <p className="text-gray-400 text-sm text-center py-6">이 날의 일정이 없습니다</p>
                        ) : (
                            selectedDateEvents.map(event => {
                                const style = getPanelEventStyle(event);
                                const isSchedule = event.type === 'schedule';
                                const isExpense  = event.type === 'expense' || event.type === 'income';
                                const isStock    = event.type === 'stock';
                                const s = isSchedule ? event.resource as Schedule : null;
                                const ex = isExpense ? event.resource as Expense : null;
                                const st = isStock ? event.resource as UserStock : null;

                                return (
                                    <div
                                        key={event.id}
                                        onClick={() => handlePanelEventClick(event)}
                                        className="rounded-lg p-3 cursor-pointer hover:opacity-75 transition-opacity"
                                        style={style}
                                    >
                                        <p className="text-sm font-semibold leading-snug">{event.title}</p>
                                        {isSchedule && s && (
                                            <p className="text-xs mt-1 opacity-70">
                                                {format(event.start, 'HH:mm') !== '00:00' ? format(event.start, 'HH:mm') + ' · ' : ''}
                                                {s.category}
                                                {s.isRecurring ? ' 🔁' : ''}
                                            </p>
                                        )}
                                        {isExpense && ex && (
                                            <p className="text-xs mt-1 opacity-70">{ex.category}</p>
                                        )}
                                        {isStock && st && (
                                            <p className="text-xs mt-1 opacity-70">
                                                평균 {st.currency === 'USD' ? `$${st.avgPrice?.toLocaleString()}` : `${st.avgPrice?.toLocaleString()}원`}
                                            </p>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* 일정 추가 버튼 */}
                    <div className="p-3 border-t">
                        <button
                            onClick={() => openCreateModal(selectedDate)}
                            className="w-full py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
                        >
                            + 일정 추가
                        </button>
                    </div>
                </div>
            )}
            </div>

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

                            {/* 시작일 / 시작 시간 */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                                        시작 시간 <span className="text-gray-400 font-normal">(선택)</span>
                                    </label>
                                    <input
                                        type="time"
                                        value={form.startTime}
                                        onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                                        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                                    />
                                </div>
                            </div>

                            {/* 종료일 / 종료 시간 */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        종료 시간 <span className="text-gray-400 font-normal">(선택)</span>
                                    </label>
                                    <input
                                        type="time"
                                        value={form.endTime}
                                        onChange={(e) => setForm({ ...form, endTime: e.target.value })}
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
        </>
    );
}

export default SchedulesPage;
