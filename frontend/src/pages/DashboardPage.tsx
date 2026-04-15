import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getExpenses, getExpenseStats } from '../services/expense-service';
import { getSchedules } from '../services/schedule-service';
import { DashboardInsight } from '../components/DashboardInsight';
import type { Expense, Schedule, ExpenseStats } from '../types';
import {
    PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
    BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';

const CATEGORY_COLORS: Record<string, string> = {
    식비: '#FF6384', 교통: '#36A2EB', 의료: '#FF9F40', 운동: '#4BC0C0',
    여행: '#9966FF', 쇼핑: '#FF6B6B', 문화: '#C9CBCF', 교육: '#FFCD56', 기타: '#B0BEC5',
};
const DEFAULT_COLOR = '#B0BEC5';

const formatYAxis = (value: number) => {
    if (value >= 10000) return `${(value / 10000).toFixed(0)}만`;
    if (value >= 1000)  return `${(value / 1000).toFixed(0)}K`;
    return String(value);
};

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white border border-[#E5E8EB] rounded-xl shadow-lg p-3 text-sm">
                <p className="font-semibold text-[#191F28]">{label}일</p>
                <p className="text-[#3182F6] font-bold">{payload[0].value.toLocaleString()}원</p>
            </div>
        );
    }
    return null;
};

function DashboardPage() {
    const navigate = useNavigate();

    const [expenses,  setExpenses]  = useState<Expense[]>([]);
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [stats,     setStats]     = useState<ExpenseStats | null>(null);
    const [loading,   setLoading]   = useState(true);
    const [error,     setError]     = useState('');

    const now        = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    useEffect(() => {
        const fetchAll = async () => {
            try {
                setLoading(true);
                const [expenseData, scheduleData, statsData] = await Promise.all([
                    getExpenses({ startDate: monthStart, endDate: monthEnd }),
                    getSchedules(),
                    getExpenseStats({ startDate: monthStart, endDate: monthEnd }),
                ]);
                setExpenses(expenseData);
                setSchedules(scheduleData);
                setStats(statsData);
            } catch {
                setError('데이터를 불러오는데 실패했습니다');
            } finally {
                setLoading(false);
            }
        };
        fetchAll();
    }, []);

    const totalIncome  = stats?.incomeTotal?.total  || 0;
    const totalExpense = stats?.expenseTotal?.total || 0;
    const balance      = totalIncome - totalExpense;
    const upcomingSchedules = schedules.filter(s => new Date(s.date) >= new Date());
    const recentExpenses    = expenses.slice(0, 5);

    const pieData = (stats?.categoryStats || []).map(cat => ({ name: cat._id, value: cat.total }));

    const today = now.getDate();
    const dailyMap = new Map<number, number>();
    for (const expense of expenses) {
        if (expense.type === 'income') continue;
        const day = new Date(expense.date).getDate();
        dailyMap.set(day, (dailyMap.get(day) || 0) + expense.amount);
    }
    const barData = Array.from({ length: today }, (_, i) => ({
        day: i + 1,
        금액: dailyMap.get(i + 1) || 0,
    }));

    if (loading) return <div className="text-center py-20 text-[#8B95A1]">불러오는 중...</div>;

    return (
        <>
            {error && <div className="mb-4 p-4 bg-[#FEF0F1] text-[#F04452] rounded-2xl text-sm">{error}</div>}

            {/* 요약 카드 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 mb-4 md:mb-6">
                <div className="bg-white rounded-2xl p-6">
                    <p className="text-sm text-[#8B95A1] mb-2">이번 달 수입</p>
                    <p className="text-3xl font-bold text-[#0DCE7A]">
                        +{totalIncome.toLocaleString()}<span className="text-lg ml-1">원</span>
                    </p>
                    <p className="text-xs text-[#B0B8C1] mt-2">{stats?.incomeTotal?.count || 0}건</p>
                </div>
                <div className="bg-white rounded-2xl p-6">
                    <p className="text-sm text-[#8B95A1] mb-2">이번 달 지출</p>
                    <p className="text-3xl font-bold text-[#F04452]">
                        -{totalExpense.toLocaleString()}<span className="text-lg ml-1">원</span>
                    </p>
                    <p className="text-xs text-[#B0B8C1] mt-2">{stats?.expenseTotal?.count || 0}건</p>
                </div>
                <div className="bg-white rounded-2xl p-6">
                    <p className="text-sm text-[#8B95A1] mb-2">이번 달 잔액</p>
                    <p className={`text-3xl font-bold ${balance >= 0 ? 'text-[#3182F6]' : 'text-[#F04452]'}`}>
                        {balance >= 0 ? '+' : ''}{balance.toLocaleString()}<span className="text-lg ml-1">원</span>
                    </p>
                    <p className="text-xs text-[#B0B8C1] mt-2">수입 - 지출</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">

                {/* 파이차트 */}
                <div className="bg-white rounded-2xl p-6">
                    <h2 className="text-base font-bold text-[#191F28] mb-4">카테고리별 지출</h2>
                    {pieData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={240}>
                            <PieChart>
                                <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={95}
                                    paddingAngle={3} dataKey="value"
                                    label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                                    labelLine={false}
                                >
                                    {pieData.map(entry => (
                                        <Cell key={entry.name} fill={CATEGORY_COLORS[entry.name] ?? DEFAULT_COLOR} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={value => [`${Number(value).toLocaleString()}원`]} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <p className="text-[#B0B8C1] text-center py-16 text-sm">이번 달 지출 내역이 없습니다</p>
                    )}
                </div>

                {/* 바차트 */}
                <div className="bg-white rounded-2xl p-6">
                    <h2 className="text-base font-bold text-[#191F28] mb-4">{now.getMonth() + 1}월 일별 지출</h2>
                    {barData.some(d => d.금액 > 0) ? (
                        <ResponsiveContainer width="100%" height={240}>
                            <BarChart data={barData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F2F4F6" />
                                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#8B95A1' }} tickLine={false} interval={4} />
                                <YAxis tickFormatter={formatYAxis} tick={{ fontSize: 11, fill: '#8B95A1' }} tickLine={false} axisLine={false} width={40} />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey="금액" fill="#3182F6" radius={[6, 6, 0, 0]} maxBarSize={18} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <p className="text-[#B0B8C1] text-center py-16 text-sm">이번 달 지출 내역이 없습니다</p>
                    )}
                </div>

                {/* 최근 지출 */}
                <div className="bg-white rounded-2xl p-6">
                    <div className="flex justify-between items-center mb-5">
                        <h2 className="text-base font-bold text-[#191F28]">최근 지출</h2>
                        <button onClick={() => navigate('/expenses')} className="text-xs text-[#3182F6] font-medium hover:underline">전체보기</button>
                    </div>
                    {recentExpenses.length > 0 ? (
                        <ul className="space-y-4">
                            {recentExpenses.map(expense => (
                                <li key={expense._id} className="flex justify-between items-center">
                                    <div>
                                        <p className="text-sm font-semibold text-[#191F28]">{expense.description}</p>
                                        <p className="text-xs text-[#8B95A1] mt-0.5">{expense.category} · {new Date(expense.date).toLocaleDateString('ko-KR')}</p>
                                    </div>
                                    <span className={`text-sm font-bold ${expense.type === 'income' ? 'text-[#0DCE7A]' : 'text-[#F04452]'}`}>
                                        {expense.type === 'income' ? '+' : '-'}{expense.amount.toLocaleString()}원
                                    </span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-[#B0B8C1] text-sm">최근 지출 내역이 없습니다</p>
                    )}
                </div>

                {/* 예정 일정 */}
                <div className="bg-white rounded-2xl p-6">
                    <div className="flex justify-between items-center mb-5">
                        <h2 className="text-base font-bold text-[#191F28]">예정 일정</h2>
                        <button onClick={() => navigate('/schedules')} className="text-xs text-[#3182F6] font-medium hover:underline">전체보기</button>
                    </div>
                    {upcomingSchedules.length > 0 ? (
                        <ul className="space-y-4">
                            {upcomingSchedules.slice(0, 5).map(schedule => (
                                <li key={schedule._id} className="flex items-center gap-3">
                                    <div className="w-2 h-2 rounded-full bg-[#3182F6] shrink-0" />
                                    <div>
                                        <p className="text-sm font-semibold text-[#191F28]">{schedule.title}</p>
                                        <p className="text-xs text-[#8B95A1] mt-0.5">{schedule.category} · {new Date(schedule.date).toLocaleDateString('ko-KR')}</p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-[#B0B8C1] text-sm">예정된 일정이 없습니다</p>
                    )}
                </div>

                {/* AI 인사이트 */}
                <DashboardInsight />
            </div>
        </>
    );
}

export default DashboardPage;
