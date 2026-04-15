import { useState, useEffect } from 'react';

const API_BASE = `${import.meta.env.VITE_API_URL}/insights`;


interface DashboardInsightData {
    summary:   string;
    score:     number;
    expense:   { score: number; comment: string };
    schedule:  { score: number; comment: string };
    portfolio: { score: number; comment: string };
    overall:   string;
    generatedAt: string;
}

const STORAGE_KEY = 'dashboardInsightLastRefreshed';
const COOLDOWN_MS = 5 * 60 * 1000;
const getLastRefreshed = () => Number(localStorage.getItem(STORAGE_KEY) ?? '0');
const setLastRefreshed = () => localStorage.setItem(STORAGE_KEY, String(Date.now()));


function StarScore( { score }: { score: number }) {
    return (
        <span className="text-yellow-400 text-sm">
            {'★'.repeat(score)}{'☆'.repeat(5 - score)}
        </span>
    );
}

export function DashboardInsight() {
    const [data, setData]       = useState<DashboardInsightData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError]     = useState(false);
    const [expanded, setExpanded] = useState(false);

    const fetchInsight = async (force = false) => {
        if(force) {
            const remaining = COOLDOWN_MS - (Date.now() - getLastRefreshed());
            if (remaining > 0) {
                alert(`${Math.ceil(remaining / 60000)}분 후에 새로고침할 수 있습니다`);
                return;
            }

            setLastRefreshed();
        }

        setLoading(true);
        setError(false);

        try {
            const token = localStorage.getItem('token');
            const url = force ? `${API_BASE}/dashboard?force=true` : `${API_BASE}/dashboard`;
            const res = await fetch(url, {
                headers: { Authorization : `Bearer ${token}` }
            })

            if(!res.ok) {
                throw new Error();
            }

            setData(await res.json());
        } catch {
            setError(true);
        } finally {
            setLoading(false);
        }
    };


    useEffect(() => {
        fetchInsight();
    }, [])

    const scoreColor = (score: number) =>
        score >= 80 ? 'text-green-600 bg-green-100' : score >= 60 ? 'text-yellow-600 bg-yellow-100' : 'text-red-600 bg-red-100';

    const canRefresh = getLastRefreshed() === 0 || COOLDOWN_MS - (Date.now() - getLastRefreshed()) <= 0;

    if (loading) {
        return (
            <div className="bg-white p-6 rounded-lg shadow md:col-span-2">
                <p className="text-gray-400 text-sm text-center py-4">🤖 AI 종합 분석 중...</p>
            </div>
        );
    }

    if(error || !data) {
        return (
            <div className="bg-white p-6 rounded-lg shadow md:col-span-2">
                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg text-gray-500">
                    <span className="text-2xl">🔧</span>
                    <div>
                        <p className="font-medium">AI 분석 서비스 점검 중입니다</p>
                        <p className="text-sm text-gray-400 mt-1">잠시 후 다시 시도해주세요</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white p-6 rounded-lg shadow md:col-span-2">
            {/* 헤더 */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <span className="text-lg">🤖</span>
                    <span className="text-xl font-bold">AI 재무 인사이트</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className={`text-sm font-bold px-2.5 py-1 rounded-full ${scoreColor(data.score)}`}>
                        {data.score}점
                    </span>
                    <button
                        onClick={() => fetchInsight(true)}
                        disabled={!canRefresh}
                        className={`text-xs ${canRefresh ? 'text-gray-400 hover:text-gray-700' : 'text-gray-200 cursor-not-allowed'}`}
                    >
                        새로고침
                    </button>
                </div>
            </div>

            {/* 한 줄 요약 */}
            <p className="text-gray-700 text-sm mb-3">{data.summary}</p>

            {/* 더보기 버튼 */}
            <button
                onClick={() => setExpanded(v => !v)}
                className="w-full border border-gray-200 rounded-md text-gray-500 text-sm py-2 hover:bg-gray-50"
            >
                {expanded ? '접기 ▲' : '상세 분석 보기 ▼'}
            </button>

            {/* 상세 펼침 */}
            {expanded && (
                <div className="mt-4 flex flex-col gap-3">
                    {[
                        { icon: '💸', label: '지출 관리',  data: data.expense },
                        { icon: '📅', label: '일정 대비',  data: data.schedule },
                        { icon: '📈', label: '포트폴리오', data: data.portfolio },
                    ].map(({ icon, label, data: d }) => (
                        <div key={label} className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg border border-gray-100">
                            <span className="text-xl">{icon}</span>
                            <div className="flex-1">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-sm font-semibold text-gray-700">{label}</span>
                                    <StarScore score={d.score} />
                                </div>
                                <p className="text-sm text-gray-600">{d.comment}</p>
                            </div>
                        </div>
                    ))}

                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                        <p className="text-xs font-bold text-blue-600 mb-1">💡 종합 코멘트</p>
                        <p className="text-sm text-gray-700 leading-relaxed">{data.overall}</p>
                    </div>

                    <p className="text-xs text-gray-400 text-right">
                        기준: {new Date(data.generatedAt).toLocaleString('ko-KR')}
                    </p>
                </div>
            )}
        </div>
    );
}