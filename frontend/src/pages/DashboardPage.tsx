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
    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
    return String(value);
};

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white border rounded shadow p-2 text-sm">
                <p className="font-semibold text-gray-700">{label}일</p>
                <p className="text-blue-600">{payload[0].value.toLocaleString()}원</p>
            </div>
        );
    }
    return null;
};

function DashboardPage() {
    const navigate = useNavigate();

    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [stats, setStats] = useState<ExpenseStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

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

            } catch (err) {
                setError('데이터를 불러오는데 실패했습니다');
            } finally {
                setLoading(false);
            }
        };

        fetchAll();
    }, []);

    const totalIncome = stats?.incomeTotal?.total || 0;
    const totalExpense = stats?.expenseTotal?.total || 0;
    const balance = totalIncome - totalExpense;
    const upcomingSchedules = schedules.filter((s) => new Date(s.date) >= new Date());
    const recentExpenses = expenses.slice(0, 5);

    // 파이차트 데이터
    const pieData = (stats?.categoryStats || []).map((cat) => ({
        name: cat._id,
        value: cat.total,
    }));

    // 바차트: 오늘까지 일별 지출 (수입 제외)
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

    return (
        <>
            {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">{error}</div>}
            {loading ? (
                <div className="text-center py-12 text-gray-500">로딩 중...</div>
            ) : (
                <>
                    {/* 요약 카드 */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div className="bg-white p-6 rounded-lg shadow">
                            <h2 className="text-sm text-gray-500 mb-1">이번 달 수입</h2>
                            <p className="text-3xl font-bold text-green-600">+{totalIncome.toLocaleString()}원</p>
                            <p className="text-xs text-gray-400 mt-1">{stats?.incomeTotal?.count || 0}건</p>
                        </div>
                        <div className="bg-white p-6 rounded-lg shadow">
                            <h2 className="text-sm text-gray-500 mb-1">이번 달 지출</h2>
                            <p className="text-3xl font-bold text-red-500">-{totalExpense.toLocaleString()}원</p>
                            <p className="text-xs text-gray-400 mt-1">{stats?.expenseTotal?.count || 0}건</p>
                        </div>
                        <div className="bg-white p-6 rounded-lg shadow">
                            <h2 className="text-sm text-gray-500 mb-1">이번 달 잔액</h2>
                            <p className={`text-3xl font-bold ${balance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                                {balance >= 0 ? '+' : ''}{balance.toLocaleString()}원
                            </p>
                            <p className="text-xs text-gray-400 mt-1">수입 - 지출</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                        {/* 파이차트: 카테고리별 지출 */}
                        <div className="bg-white p-6 rounded-lg shadow">
                            <h2 className="text-xl font-bold mb-4">카테고리별 지출</h2>
                            {pieData.length > 0 ? (
                                <ResponsiveContainer width="100%" height={260}>
                                    <PieChart>
                                        <Pie
                                            data={pieData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={100}
                                            paddingAngle={3}
                                            dataKey="value"
                                            label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                                            labelLine={false}
                                        >
                                            {pieData.map((entry) => (
                                                <Cell key={entry.name} fill={CATEGORY_COLORS[entry.name] ?? DEFAULT_COLOR} />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(value) => [`${Number(value).toLocaleString()}원`]} />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <p className="text-gray-400 text-center py-16">이번 달 지출 내역이 없습니다.</p>
                            )}
                        </div>

                        {/* 바차트: 일별 지출 추이 */}
                        <div className="bg-white p-6 rounded-lg shadow">
                            <h2 className="text-xl font-bold mb-4">{now.getMonth() + 1}월 일별 지출</h2>
                            {barData.some((d) => d.금액 > 0) ? (
                                <ResponsiveContainer width="100%" height={260}>
                                    <BarChart data={barData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="day" tick={{ fontSize: 11 }} tickLine={false} interval={4} />
                                        <YAxis tickFormatter={formatYAxis} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={40} />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Bar dataKey="금액" fill="#3B82F6" radius={[4, 4, 0, 0]} maxBarSize={20} />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <p className="text-gray-400 text-center py-16">이번 달 지출 내역이 없습니다.</p>
                            )}
                        </div>

                        {/* 최근 지출 */}
                        <div className="bg-white p-6 rounded-lg shadow">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-bold">최근 지출</h2>
                                <button onClick={() => navigate('/expenses')} className="text-sm text-blue-500 hover:underline">전체보기</button>
                            </div>
                            {recentExpenses.length > 0 ? (
                                <ul className="space-y-3">
                                    {recentExpenses.map((expense) => (
                                        <li key={expense._id} className="flex justify-between items-center">
                                            <div>
                                                <p className="font-medium text-gray-800">{expense.description}</p>
                                                <p className="text-xs text-gray-400">{expense.category} · {new Date(expense.date).toLocaleDateString('ko-KR')}</p>
                                            </div>
                                            <span className={`font-semibold ${expense.type === 'income' ? 'text-green-500' : 'text-red-500'}`}>
                                                {expense.type === 'income' ? '+' : '-'}{expense.amount.toLocaleString()}원
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-gray-400">최근 지출 내역이 없습니다.</p>
                            )}
                        </div>

                        {/* 예정 일정 */}
                        <div className="bg-white p-6 rounded-lg shadow">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-bold">예정 일정</h2>
                                <button onClick={() => navigate('/schedules')} className="text-sm text-blue-500 hover:underline">전체보기</button>
                            </div>
                            {upcomingSchedules.length > 0 ? (
                                <ul className="space-y-3">
                                    {upcomingSchedules.slice(0, 5).map((schedule) => (
                                        <li key={schedule._id} className="flex items-center gap-3 border-b pb-2 last:border-0">
                                            <div className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
                                            <div>
                                                <p className="font-medium text-gray-800">{schedule.title}</p>
                                                <p className="text-xs text-gray-400">{schedule.category} · {new Date(schedule.date).toLocaleDateString('ko-KR')}</p>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-gray-400">예정된 일정이 없습니다.</p>
                            )}
                        </div>

                        {/* 통합 AI 인사이트 */}
                        <DashboardInsight/>

                    </div>
                </>
            )}
        </>
    );
}

export default DashboardPage;
