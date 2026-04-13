import { useState, useEffect, useCallback } from 'react';
import type { UserStock, BatchPrice } from '../types/finance';
import StockCard from './StockCard';
import { PortfolioInsight } from './PortfolioInsight';

const API_BASE = `${import.meta.env.VITE_API_URL}/finance`;

interface Props {
    onRegisterClick: () => void;
    refreshKey?: number;
}

export default function StockList({ onRegisterClick, refreshKey }: Props) {
    const [tab, setTab]         = useState<'portfolio' | 'watchlist'>('portfolio');
    const [stocks, setStocks]   = useState<UserStock[]>([]);
    const [prices, setPrices]   = useState<Record<string, BatchPrice>>({});
    const [loading, setLoading] = useState(false);
    const [error, setError]     = useState<string | null>(null);

    // 종목 목록 조회
    const fetchStocks = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const token = localStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}` };

            const res  = await fetch(`${API_BASE}/stocks`, { headers });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message ?? '목록 조회 실패');
            }
            const data: UserStock[] = await res.json();
            setStocks(data);

            // 배치 주가 조회
            if (data.length > 0) {
                const symbols = data.map(s =>
                    s.market === 'kr' ? `${s.stock_code}${s.suffix ?? '.KS'}` : s.ticker
                );
                const priceRes = await fetch(`${API_BASE}/stocks/prices?symbols=${symbols.join(',')}`);
                if (priceRes.ok) {
                    const priceData = await priceRes.json();
                    setPrices(priceData);
                }
            } else {
                setPrices({});
            }

        } catch (e: any) {
            setError(e.message ?? '종목 목록을 불러오는데 실패했습니다');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchStocks();
    }, [fetchStocks, refreshKey]);

    // 종목 삭제
    const handleRemove = async (id: string) => {
        try {
            const token = localStorage.getItem('token');
            await fetch(`${API_BASE}/stocks/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            setStocks(prev => prev.filter(s => s._id !== id));
        } catch {
            alert('삭제 실패');
        }
    }

    const filtered       = stocks.filter(s => s.type === tab);
    const hasPortfolio   = stocks.some(s => s.type === 'portfolio');

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* 탭 + 등록 버튼 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', background: '#111827', borderRadius: 8, padding: 4, gap: 4 }}>
                    {([['portfolio', '💼 보유'], ['watchlist', '👀 관심']] as const).map(([key, label]) => (
                        <button
                            key={key}
                            onClick={() => setTab(key)}
                            style={{
                                padding: '7px 16px',
                                background: tab === key ? '#1d4ed8' : 'transparent',
                                color: tab === key ? '#fff' : '#6b7280',
                                border: 'none', borderRadius: 6,
                                fontSize: 13, fontWeight: tab === key ? 'bold' : 'normal',
                                cursor: 'pointer',
                            }}
                        >
                            {label}
                        </button>
                    ))}
                </div>
                <button
                    onClick={onRegisterClick}
                    style={{
                        background: '#1d4ed8', color: '#fff',
                        border: 'none', borderRadius: 8,
                        padding: '8px 14px', fontSize: 13,
                        fontWeight: 'bold', cursor: 'pointer',
                    }}
                >
                    + 종목 등록
                </button>
            </div>

            {/* 종목 카드 목록 */}
            {loading ? (
                <p style={{ color: '#6b7280', fontSize: 13, textAlign: 'center' }}>불러오는 중...</p>
            ) : error ? (
                <p style={{ color: '#ef4444', fontSize: 13 }}>{error}</p>
            ) : filtered.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 0' }}>
                    <p style={{ color: '#6b7280', fontSize: 14 }}>
                        {tab === 'portfolio' ? '보유 종목이 없어요' : '관심 종목이 없어요'}
                    </p>
                    <button
                        onClick={onRegisterClick}
                        style={{
                            marginTop: 8, color: '#60a5fa',
                            background: 'none', border: 'none',
                            cursor: 'pointer', fontSize: 13,
                        }}
                    >
                        종목 등록하기
                    </button>
                </div>
            ) : (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                    gap: 12,
                }}>
                    {filtered.map(stock => {
                        const symbol = stock.market === 'kr'
                            ? `${stock.stock_code}${stock.suffix ?? '.KS'}`
                            : stock.ticker;
                        return (
                            <StockCard
                                key={stock._id}
                                stock={stock}
                                price={prices[symbol]}
                                onRemove={handleRemove}
                            />
                        );
                    })}
                </div>
            )}

            {/* 포트폴리오 AI 인사이트 */}
            {tab === 'portfolio' && (
                <PortfolioInsight hasPortfolio={hasPortfolio} />
            )}
        </div>
    );
}