import { useState, useEffect } from 'react';
import type { PortfolioInsight as IPortfolioInsight } from '../types/finance';

const API_BASE = `${import.meta.env.VITE_API_URL}/finance`;

interface Props {
    hasPortfolio: boolean;
}

export function PortfolioInsight({hasPortfolio}: Props) {
    const [insight, setInsight] = useState<IPortfolioInsight | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [expanded, setExpanded] = useState(false);
    const [lastRefreshed, setLastRefreshed] = useState<number>(0);
    const COOLDOWN_MS = 5 * 60 * 1000;


    useEffect(() => {
        if (!hasPortfolio) {
            return;
        }

        fetchInsight();
    }, [hasPortfolio]);

    const fetchInsight = async (force = false) => {
        if(force) {
            const remaining = COOLDOWN_MS - (Date.now() - lastRefreshed);
            if (remaining > 0) {
                const min = Math.ceil(remaining / 60000);
                alert(`${min}분 후에 새로고침할 수 있습니다`);
                return;
            }

            setLastRefreshed(Date.now());
        }


        setLoading(true);
        setError(null);

        try {
            const token = localStorage.getItem('token');
            const url   = force ? `${API_BASE}/portfolio/insight?force=true` : `${API_BASE}/portfolio/insight`;
            const res   = await fetch(url, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!res.ok) throw new Error('인사이트 조회 실패');
            const data = await res.json();
            setInsight(data);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }

    if (!hasPortfolio) return null;

    if (loading) return (
        <div className="bg-gray-50 rounded-lg p-5 text-center">
            <p className="text-gray-600 text-sm">포트폴리오 AI 분석 중...</p>
        </div>
    );

    if (error) return (
        <div className="bg-red-50 rounded-lg p-5">
            <p className="text-red-600 text-sm">{error}</p>
            <button
                onClick={() => fetchInsight}
                className="text-blue-600 hover:underline text-sm mt-1"
            >
                다시 시도
            </button>
        </div>
    );

    if (!insight) return null;

    const riskColor = insight.riskLevel.includes('낮음') ? 'text-green-600 bg-green-100'
        : insight.riskLevel.includes('높음') ? 'text-red-600 bg-red-100'
            : 'text-yellow-600 bg-yellow-100';

    return (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-5 flex flex-col gap-3">

            {/* 헤더 */}
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <span className="text-lg">🤖</span>
                    <span className="text-gray-900 font-bold text-base">포트폴리오 AI 인사이트</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${riskColor}`}>
                        {insight.riskLevel}
                    </span>
                    {(() => {
                        const remaining = COOLDOWN_MS - (Date.now() - lastRefreshed);
                        const canRefresh = lastRefreshed === 0 || remaining <= 0;
                        const label = canRefresh ? '새로고침' : `${Math.ceil(remaining / 60000)}분 후 가능`;

                        return (
                            <button
                                onClick={() => fetchInsight(true)}
                                disabled={!canRefresh}
                                className={`text-xs ${canRefresh ? 'text-gray-500 hover:text-gray-800' : 'text-gray-300 cursor-not-allowed'}`}
                            >
                                {label}
                            </button>
                        );
                    })()}
                </div>
            </div>

            {/* 요약 */}
            <p className="text-gray-800 text-sm leading-relaxed m-0">
                {insight.summary}
            </p>

            {/* 상세 토글 */}
            <button
                onClick={() => setExpanded(v => !v)}
                className="w-full bg-white border border-gray-200 rounded-md text-gray-600 text-sm py-2 hover:bg-gray-50"
            >
                {expanded ? '접기 ▲' : '상세 분석 보기 ▼'}
            </button>

            {expanded && (
                <div className="flex flex-col gap-2.5">
                    {[
                        { label: '섹터 분산', value: insight.sectorBalance },
                        { label: '리밸런싱 제안', value: insight.rebalancingSuggestion },
                        { label: '주목 종목', value: insight.topPick },
                    ].map(({ label, value }) => (
                        <div key={label} className="bg-white rounded-lg p-3 border border-gray-200">
                            <p className="text-blue-600 text-xs font-bold mb-1">{label}</p>
                            <p className="text-gray-800 text-sm leading-relaxed m-0">{value}</p>
                        </div>
                    ))}

                    <p className="text-gray-500 text-xs text-right m-0 mt-1">
                        기준: {new Date(insight.generatedAt).toLocaleString('ko-KR')}
                    </p>
                </div>
            )}
        </div>
    );
}
