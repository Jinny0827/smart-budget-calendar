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
    const [tab, setTab]           = useState<'portfolio' | 'watchlist'>('portfolio');
    const [stocks, setStocks]     = useState<UserStock[]>([]);
    const [prices, setPrices]     = useState<Record<string, BatchPrice>>({});
    const [usdKrw, setUsdKrw]     = useState<number | null>(null);
    const [loading, setLoading]   = useState(false);
    const [error, setError]       = useState<string | null>(null);

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

    // 환율 조회 (마운트 1회)
    useEffect(() => {
        fetch(`${API_BASE}/exchange-rate`)
            .then(r => r.ok ? r.json() : null)
            .then(d => { if (d?.usdKrw) setUsdKrw(d.usdKrw); })
            .catch(() => {});
    }, []);

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
        <div className="flex flex-col gap-4 h-full">

            {/* 탭 + 등록 버튼 */}
            <div className="flex justify-between items-center">
                <div className="flex bg-gray-100 rounded-lg p-1 gap-1">
                    {([['portfolio', '💼 보유'], ['watchlist', '👀 관심']] as const).map(([key, label]) => (
                        <button
                            key={key}
                            onClick={() => setTab(key)}
                            className={`px-4 py-1.5 text-sm rounded-md ${
                                tab === key ? 'bg-blue-600 text-white font-semibold' : 'text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
                <button
                    onClick={onRegisterClick}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700"
                >
                    + 종목 등록
                </button>
            </div>

            {/* 종목 카드 목록 */}
            {loading ? (
                <p className="text-gray-500 text-sm text-center py-8">불러오는 중...</p>
            ) : error ? (
                <p className="text-red-500 text-sm">{error}</p>
            ) : filtered.length === 0 ? (
                <div className="text-center py-10">
                    <p className="text-gray-500 text-sm">
                        {tab === 'portfolio' ? '보유 종목이 없어요' : '관심 종목이 없어요'}
                    </p>
                    <button
                        onClick={onRegisterClick}
                        className="mt-2 text-blue-600 hover:underline text-sm"
                    >
                        종목 등록하기
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {filtered.map(stock => {
                        const symbol = stock.market === 'kr'
                            ? `${stock.stock_code}${stock.suffix ?? '.KS'}`
                            : stock.ticker;
                        return (
                            <StockCard
                                key={stock._id}
                                stock={stock}
                                price={prices[symbol]}
                                usdKrw={usdKrw ?? undefined}
                                onRemove={handleRemove}
                            />
                        );
                    })}
                </div>
            )}

            {/* 포트폴리오 AI 인사이트 */}
            {tab === 'portfolio' && (
                <div className="mt-auto pt-4">
                    <PortfolioInsight hasPortfolio={hasPortfolio} />
                </div>
            )}
        </div>
    );
}
