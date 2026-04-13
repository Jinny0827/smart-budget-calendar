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


    useEffect(() => {
        if (!hasPortfolio) {
            return;
        }

        fetchInsight();
    }, [hasPortfolio]);

    const fetchInsight = async () => {
        setLoading(true);
        setError(null);

        try {
            const token = localStorage.getItem('token');
            const res   = await fetch(`${API_BASE}/portfolio/insight`, {
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
        <div style={{ background: '#111827', borderRadius: 12, padding: 20, textAlign: 'center' }}>
            <p style={{ color: '#6b7280', fontSize: 13 }}>포트폴리오 AI 분석 중...</p>
        </div>
    );

    if (error) return (
        <div style={{ background: '#111827', borderRadius: 12, padding: 20 }}>
            <p style={{ color: '#ef4444', fontSize: 13 }}>{error}</p>
            <button
                onClick={fetchInsight}
                style={{ color: '#60a5fa', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, marginTop: 4 }}
            >
                다시 시도
            </button>
        </div>
    );

    if (!insight) return null;

    const riskColor = insight.riskLevel.includes('낮음') ? '#22c55e'
        : insight.riskLevel.includes('높음') ? '#ef4444'
            : '#f59e0b';

    return (
        <div style={{ background: '#111827', borderRadius: 12, padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* 헤더 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 16 }}>🤖</span>
                    <span style={{ color: '#fff', fontWeight: 'bold', fontSize: 15 }}>포트폴리오 AI 인사이트</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                        fontSize: 11, padding: '3px 10px', borderRadius: 99,
                        background: riskColor + '22', color: riskColor, fontWeight: 'bold',
                    }}>
                        {insight.riskLevel}
                    </span>
                    <button
                        onClick={fetchInsight}
                        style={{ color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12 }}
                    >
                        새로고침
                    </button>
                </div>
            </div>

            {/* 요약 */}
            <p style={{ color: '#d1d5db', fontSize: 14, lineHeight: 1.6, margin: 0 }}>
                {insight.summary}
            </p>

            {/* 상세 토글 */}
            <button
                onClick={() => setExpanded(v => !v)}
                style={{
                    background: '#1f2937', border: 'none', borderRadius: 8,
                    color: '#9ca3af', fontSize: 13, padding: '8px 0',
                    cursor: 'pointer',
                }}
            >
                {expanded ? '접기 ▲' : '상세 분석 보기 ▼'}
            </button>

            {expanded && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {[
                        { label: '섹터 분산', value: insight.sectorBalance },
                        { label: '리밸런싱 제안', value: insight.rebalancingSuggestion },
                        { label: '주목 종목', value: insight.topPick },
                    ].map(({ label, value }) => (
                        <div key={label} style={{ background: '#1f2937', borderRadius: 10, padding: '12px 14px' }}>
                            <p style={{ color: '#60a5fa', fontSize: 11, fontWeight: 'bold', margin: '0 0 4px' }}>{label}</p>
                            <p style={{ color: '#d1d5db', fontSize: 13, lineHeight: 1.6, margin: 0 }}>{value}</p>
                        </div>
                    ))}

                    <p style={{ color: '#4b5563', fontSize: 11, textAlign: 'right', margin: 0 }}>
                        기준: {new Date(insight.generatedAt).toLocaleString('ko-KR')}
                    </p>
                </div>
            )}
        </div>
    );
}