import { useState, useEffect } from 'react';
import type { PortfolioInsight as IPortfolioInsight } from '../types/finance';

const API_BASE = `${import.meta.env.VITE_API_URL}/finance`;

interface Props {
    hasPortfolio: boolean;
}

const COOLDOWN_MS = 5 * 60 * 1000;
const STORAGE_KEY = 'portfolioInsightLastRefreshed';
const getLastRefreshed = () => Number(localStorage.getItem(STORAGE_KEY) ?? '0');
const setLastRefreshed = () => localStorage.setItem(STORAGE_KEY, String(Date.now()));

const DETAIL_ITEMS = [
    { key: 'sectorBalance',          label: '섹터 분산' },
    { key: 'rebalancingSuggestion',  label: '리밸런싱' },
    { key: 'topPick',                label: '주목 종목' },
] as const;

export function PortfolioInsight({ hasPortfolio }: Props) {
    const [insight, setInsight]   = useState<IPortfolioInsight | null>(null);
    const [loading, setLoading]   = useState(false);
    const [error, setError]       = useState<string | null>(null);
    const [expanded, setExpanded] = useState(false);

    useEffect(() => {
        if (hasPortfolio) fetchInsight();
    }, [hasPortfolio]);

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
        setError(null);
        try {
            const token = localStorage.getItem('token');
            const url   = force
                ? `${API_BASE}/portfolio/insight?force=true`
                : `${API_BASE}/portfolio/insight`;
            const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
            if (!res.ok) throw new Error('인사이트 조회 실패');
            setInsight(await res.json());
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    if (!hasPortfolio) return null;

    const riskTag = insight
        ? insight.riskLevel.includes('낮음') ? { label: '낮음', cls: 'bg-[#E8F5E9] text-[#2E7D32]' }
        : insight.riskLevel.includes('높음') ? { label: '높음', cls: 'bg-[#FEF0F1] text-[#F04452]' }
        : { label: '중간', cls: 'bg-[#FFF8E1] text-[#F59E0B]' }
        : null;

    const canRefresh = getLastRefreshed() === 0 || COOLDOWN_MS - (Date.now() - getLastRefreshed()) <= 0;

    return (
        <div className="bg-white rounded-2xl overflow-hidden">
            {/* 헤더 */}
            <div className="px-5 py-4 flex items-center justify-between border-b border-[#F2F4F6]">
                <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-[#191F28]">포트폴리오 분석</p>
                    {riskTag && (
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${riskTag.cls}`}>
                            리스크 {riskTag.label}
                        </span>
                    )}
                </div>
                <button
                    onClick={() => fetchInsight(true)}
                    disabled={!canRefresh || loading}
                    className={`text-xs ${canRefresh && !loading ? 'text-[#8B95A1] hover:text-[#3182F6]' : 'text-[#D1D6DB] cursor-not-allowed'}`}
                >
                    새로고침
                </button>
            </div>

            {/* 본문 */}
            {loading ? (
                <div className="px-5 py-6 text-center text-sm text-[#8B95A1]">분석 중...</div>
            ) : error ? (
                <div className="px-5 py-6 text-center text-sm text-[#F04452]">{error}</div>
            ) : !insight ? null : (
                <>
                    {/* 요약 */}
                    <div className="px-5 py-4">
                        <p className="text-sm text-[#191F28] leading-relaxed">{insight.summary}</p>
                    </div>

                    {/* 상세 토글 */}
                    <button
                        onClick={() => setExpanded(v => !v)}
                        className="w-full px-5 py-3 border-t border-[#F2F4F6] text-xs text-[#8B95A1] hover:text-[#191F28] text-left flex items-center justify-between transition-colors"
                    >
                        <span>상세 분석</span>
                        <span>{expanded ? '▲' : '▼'}</span>
                    </button>

                    {expanded && (
                        <>
                            {DETAIL_ITEMS.map(({ key, label }) => (
                                <div key={key} className="px-5 py-4 border-t border-[#F2F4F6]">
                                    <p className="text-[11px] font-semibold uppercase tracking-widest text-[#8B95A1] mb-1.5">{label}</p>
                                    <p className="text-sm text-[#191F28] leading-relaxed">
                                        {(insight as any)[key]}
                                    </p>
                                </div>
                            ))}
                            <div className="px-5 py-3 border-t border-[#F2F4F6]">
                                <p className="text-xs text-[#B0B8C1] text-right">
                                    {new Date(insight.generatedAt).toLocaleString('ko-KR')} 기준
                                </p>
                            </div>
                        </>
                    )}
                </>
            )}
        </div>
    );
}
