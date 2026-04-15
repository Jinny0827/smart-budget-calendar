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

const SECTION_ITEMS = [
    { key: 'expense',   label: '지출' },
    { key: 'schedule',  label: '일정' },
    { key: 'portfolio', label: '포트폴리오' },
] as const;

function scoreBar(score: number) {
    const pct = Math.min(score, 100);
    const color = score >= 80 ? '#3182F6' : score >= 55 ? '#F59E0B' : '#F04452';
    return { pct, color };
}

export function DashboardInsight() {
    const [data, setData]         = useState<DashboardInsightData | null>(null);
    const [loading, setLoading]   = useState(false);
    const [error, setError]       = useState(false);
    const [expanded, setExpanded] = useState(false);

    const fetchInsight = async (force = false) => {
        if (force) {
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
            const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
            if (!res.ok) throw new Error();
            setData(await res.json());
        } catch {
            setError(true);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchInsight(); }, []);

    const canRefresh = getLastRefreshed() === 0 || COOLDOWN_MS - (Date.now() - getLastRefreshed()) <= 0;

    /* ── 로딩 ── */
    if (loading) return (
        <div className="bg-white rounded-2xl p-6 md:col-span-2 flex items-center justify-center">
            <p className="text-sm text-[#8B95A1]">재무 분석 중...</p>
        </div>
    );

    /* ── 에러 / 데이터 없음 ── */
    if (error || !data) return (
        <div className="bg-white rounded-2xl p-6 md:col-span-2">
            <div className="flex items-center gap-3">
                <div>
                    <p className="text-sm font-semibold text-[#191F28]">AI 분석을 불러올 수 없어요</p>
                    <button
                        onClick={() => fetchInsight()}
                        className="text-xs text-[#3182F6] mt-1 hover:underline"
                    >
                        다시 시도
                    </button>
                </div>
            </div>
        </div>
    );

    const { pct, color } = scoreBar(data.score);

    return (
        <div className="bg-white rounded-2xl overflow-hidden md:col-span-2">

            {/* 헤더 */}
            <div className="px-5 py-4 border-b border-[#F2F4F6] flex items-center justify-between">
                <p className="text-sm font-semibold text-[#191F28]">이번 달 재무 요약</p>
                <button
                    onClick={() => fetchInsight(true)}
                    disabled={!canRefresh}
                    className={`text-xs ${canRefresh ? 'text-[#8B95A1] hover:text-[#3182F6]' : 'text-[#D1D6DB] cursor-not-allowed'}`}
                >
                    새로고침
                </button>
            </div>

            {/* 종합 점수 + 요약 */}
            <div className="px-5 py-4 flex items-center gap-4">
                <div className="shrink-0 text-center">
                    <p className="text-3xl font-bold" style={{ color }}>{data.score}</p>
                    <p className="text-[10px] text-[#8B95A1] mt-0.5">/ 100</p>
                </div>
                <div className="flex-1 min-w-0">
                    <div className="h-1.5 bg-[#F2F4F6] rounded-full overflow-hidden mb-2">
                        <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%`, background: color }}
                        />
                    </div>
                    <p className="text-sm text-[#191F28] leading-relaxed">{data.summary}</p>
                </div>
            </div>

            {/* 상세 토글 */}
            <button
                onClick={() => setExpanded(v => !v)}
                className="w-full px-5 py-3 border-t border-[#F2F4F6] text-xs text-[#8B95A1] hover:text-[#191F28] flex items-center justify-between transition-colors"
            >
                <span>상세 분석</span>
                <span>{expanded ? '▲' : '▼'}</span>
            </button>

            {expanded && (
                <>
                    {/* 3개 섹션 */}
                    {SECTION_ITEMS.map(({ key, label }) => {
                        const d = data[key];
                        return (
                            <div key={key} className="px-5 py-4 border-t border-[#F2F4F6]">
                                <div className="flex items-center justify-between mb-1.5">
                                    <p className="text-[11px] font-semibold uppercase tracking-widest text-[#8B95A1]">{label}</p>
                                    <div className="flex gap-0.5">
                                        {Array.from({ length: 5 }, (_, i) => (
                                            <div
                                                key={i}
                                                className="w-4 h-1.5 rounded-sm"
                                                style={{ background: i < d.score ? '#3182F6' : '#E5E8EB' }}
                                            />
                                        ))}
                                    </div>
                                </div>
                                <p className="text-sm text-[#191F28] leading-relaxed">{d.comment}</p>
                            </div>
                        );
                    })}

                    {/* 종합 코멘트 */}
                    <div className="px-5 py-4 border-t border-[#F2F4F6] bg-[#F8FAFF]">
                        <p className="text-[11px] font-semibold uppercase tracking-widest text-[#3182F6] mb-1.5">종합</p>
                        <p className="text-sm text-[#191F28] leading-relaxed">{data.overall}</p>
                    </div>

                    <div className="px-5 py-3 border-t border-[#F2F4F6]">
                        <p className="text-xs text-[#B0B8C1] text-right">
                            {new Date(data.generatedAt).toLocaleString('ko-KR')} 기준
                        </p>
                    </div>
                </>
            )}
        </div>
    );
}
