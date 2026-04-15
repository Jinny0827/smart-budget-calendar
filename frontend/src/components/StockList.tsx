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
    const [editCustomRate, setEditCustomRate] = useState('');
    const [buyCustomRate,  setBuyCustomRate]  = useState('');
    const [loading, setLoading]   = useState(false);
    const [error, setError]       = useState<string | null>(null);
    const [detailTarget, setDetailTarget] = useState<UserStock | null>(null);

    // 수정 모달
    const [editTarget, setEditTarget] = useState<UserStock | null>(null);
    const [editForm, setEditForm]     = useState({ quantity: '', avgPrice: '', purchaseDate: '' });
    const [editLoading, setEditLoading] = useState(false);

    // 추가매입 모달
    const [buyTarget, setBuyTarget]   = useState<UserStock | null>(null);
    const [buyForm, setBuyForm]       = useState({ quantity: '', avgPrice: '', purchaseDate: '' });
    const [buyLoading, setBuyLoading] = useState(false);

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
    };

    // 수정 모달 열기
    const handleOpenEdit = (stock: UserStock) => {
        setEditTarget(stock);
        setEditCustomRate('');
        setEditForm({
            quantity:     String(stock.quantity ?? ''),
            avgPrice:     String(stock.avgPrice ?? ''),
            purchaseDate: stock.purchaseDate
                ? new Date(stock.purchaseDate).toISOString().split('T')[0]
                : '',
        });
    };

    // 수정 저장
    const handleEditSubmit = async () => {
        if (!editTarget) return;
        if (!editForm.quantity || !editForm.avgPrice) {
            alert('수량과 평균매입가를 입력해주세요');
            return;
        }
        setEditLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE}/stocks/${editTarget._id}`, {
                method: 'PATCH',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    quantity:     Number(editForm.quantity),
                    avgPrice:     Number(editForm.avgPrice),
                    purchaseDate: editForm.purchaseDate || undefined,
                }),
            });
            if (!res.ok) throw new Error('수정 실패');
            setEditTarget(null);
            await fetchStocks();
        } catch (e: any) {
            alert(e.message ?? '수정 실패');
        } finally {
            setEditLoading(false);
        }
    };

    // 추가매입 모달 열기
    const handleOpenAddBuy = (stock: UserStock) => {
        setBuyTarget(stock);
        setBuyForm({ quantity: '', avgPrice: '', purchaseDate: ''});
        setBuyCustomRate('');
    };

    // 추가매입 저장
    const handleAddBuySubmit = async () => {
        if (!buyTarget) return;
        if (!buyForm.quantity || !buyForm.avgPrice) {
            alert('수량과 매입가를 입력해주세요');
            return;
        }
        setBuyLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE}/stocks/${buyTarget._id}/buy`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    quantity: Number(buyForm.quantity),
                    avgPrice: Number(buyForm.avgPrice),
                    purchaseDate: buyForm.purchaseDate || undefined,
                }),
            });
            if (!res.ok) throw new Error('추가매입 실패');
            setBuyTarget(null);
            await fetchStocks();
        } catch (e: any) {
            alert(e.message ?? '추가매입 실패');
        } finally {
            setBuyLoading(false);
        }
    };

    // 추가매입 예상 평단가 계산
    const previewAvg = buyTarget && buyForm.quantity && buyForm.avgPrice
        ? (() => {
            const prevQty  = buyTarget.quantity ?? 0;
            const prevAvg  = buyTarget.avgPrice ?? 0;
            const newQty   = Number(buyForm.quantity);
            const newPrice = Number(buyForm.avgPrice);
            if (isNaN(newQty) || isNaN(newPrice) || newQty <= 0) return null;
            return ((prevQty * prevAvg + newQty * newPrice) / (prevQty + newQty));
        })()
        : null;

    const filtered     = stocks.filter(s => s.type === tab);
    const hasPortfolio = stocks.some(s => s.type === 'portfolio');

    const modalInputStyle: React.CSSProperties = {
        width: '100%', marginTop: 4,
        background: '#1f2937', border: '1px solid #374151',
        borderRadius: 8, padding: '10px 12px',
        color: '#fff', fontSize: 14,
        boxSizing: 'border-box', outline: 'none',
    };

    const modalLabelStyle: React.CSSProperties = { color: '#9ca3af', fontSize: 12 };

    return (
        <div className="flex flex-col gap-4 h-full">

            {/* 탭 + 등록 버튼: 모바일 세로 / sm 이상 가로 */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                <div className="flex bg-gray-100 rounded-lg p-1 gap-1">
                    {([['portfolio', '💼 보유'], ['watchlist', '👀 관심']] as const).map(([key, label]) => (
                        <button
                            key={key}
                            onClick={() => setTab(key)}
                            className={`flex-1 sm:flex-none px-4 py-2 text-sm rounded-md ${
                                tab === key ? 'bg-blue-600 text-white font-semibold' : 'text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
                <button
                    onClick={onRegisterClick}
                    className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700"
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
                                onEdit={handleOpenEdit}
                                onAddBuy={handleOpenAddBuy}
                                onDetail={setDetailTarget}
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

            {/* ── 수정 모달 ── */}
            {editTarget && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
                }}>
                    <div style={{
                        background: '#111827', borderRadius: 16, padding: 24,
                        width: '90%', maxWidth: 340, display: 'flex', flexDirection: 'column', gap: 14,
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <p style={{ color: '#fff', fontWeight: 'bold', fontSize: 15, margin: 0 }}>
                                {editTarget.corpName} 수정
                            </p>
                            <button onClick={() => setEditTarget(null)}
                                style={{ background: 'none', border: 'none', color: '#6b7280', fontSize: 20, cursor: 'pointer' }}>×</button>
                        </div>

                        <div>
                            <label style={modalLabelStyle}>보유 수량 (주)</label>
                            <input type="number" value={editForm.quantity} min="0"
                                onChange={e => setEditForm(f => ({ ...f, quantity: e.target.value }))}
                                style={modalInputStyle} />
                        </div>

                        <div>
                            <label style={{ color: '#9ca3af', fontSize: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span>평균매입가 <span style={{ fontSize: 11, color: editTarget.currency === 'USD' ? '#60a5fa' : '#4ade80', fontWeight: 'bold' }}>{editTarget.currency === 'USD' ? '$ USD' : '₩ KRW'}</span></span>
                                {(() => {
                                    const sym = editTarget.market === 'kr' ? `${editTarget.stock_code}${editTarget.suffix ?? '.KS'}` : editTarget.ticker;
                                    const cp  = prices[sym]?.current_price;
                                    return cp ? (
                                        <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                                            <input type="checkbox"
                                                   onChange={e => setEditForm(f => ({ ...f, avgPrice: e.target.checked ? String(cp) : '' }))}
                                                   style={{ accentColor: '#3b82f6' }} />
                                            <span style={{ fontSize: 11, color: '#60a5fa' }}>현재가로 입력</span>
                                        </label>
                                    ) : null;
                                })()}
                            </label>
                            <input type="number" value={editForm.avgPrice} min="0"
                                onChange={e => setEditForm(f => ({ ...f, avgPrice: e.target.value }))}
                                style={modalInputStyle} />
                        </div>

                        <div>
                            <label style={modalLabelStyle}>매입일 (선택)</label>
                            <input type="date" value={editForm.purchaseDate}
                                onChange={e => setEditForm(f => ({ ...f, purchaseDate: e.target.value }))}
                                style={{ ...modalInputStyle, color: editForm.purchaseDate ? '#fff' : '#6b7280' }} />
                        </div>

                        {editTarget.currency === 'USD' && (
                            <div>
                                <label style={modalLabelStyle}>
                                    환율 (USD/KRW)
                                    <span style={{ marginLeft: 6, fontSize: 11, color: '#4b5563' }}>
                                        (자동: {usdKrw ? `${usdKrw.toLocaleString()}원` : '조회 중'})
                                    </span>
                                </label>
                                <input type="number" value={editCustomRate}
                                       onChange={e => setEditCustomRate(e.target.value)}
                                       placeholder={usdKrw ? String(usdKrw) : '1430'}
                                       style={modalInputStyle} />
                            </div>
                        )}

                        <button
                            onClick={handleEditSubmit}
                            disabled={editLoading}
                            style={{
                                background: editLoading ? '#374151' : '#1d4ed8',
                                color: '#fff', border: 'none', borderRadius: 10,
                                padding: '12px 0', fontSize: 14, fontWeight: 'bold',
                                cursor: editLoading ? 'not-allowed' : 'pointer',
                            }}
                        >
                            {editLoading ? '저장 중...' : '저장'}
                        </button>
                    </div>
                </div>
            )}

            {/* ── 추가매입 모달 ── */}
            {buyTarget && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
                }}>
                    <div style={{
                        background: '#111827', borderRadius: 16, padding: 24,
                        width: '90%', maxWidth: 340, display: 'flex', flexDirection: 'column', gap: 14,
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <p style={{ color: '#fff', fontWeight: 'bold', fontSize: 15, margin: 0 }}>
                                {buyTarget.corpName} 추가매입
                            </p>
                            <button onClick={() => setBuyTarget(null)}
                                style={{ background: 'none', border: 'none', color: '#6b7280', fontSize: 20, cursor: 'pointer' }}>×</button>
                        </div>

                        {/* 현재 보유 현황 */}
                        <div style={{ background: '#1f2937', borderRadius: 8, padding: '10px 12px' }}>
                            <p style={{ color: '#6b7280', fontSize: 11, margin: '0 0 4px' }}>현재 보유</p>
                            <p style={{ color: '#fff', fontSize: 13, margin: 0 }}>
                                {buyTarget.quantity?.toLocaleString()}주 · 평균
                                {buyTarget.currency === 'USD'
                                    ? ` $${buyTarget.avgPrice?.toLocaleString()}`
                                    : ` ${buyTarget.avgPrice?.toLocaleString()}원`}
                            </p>
                        </div>

                        <div>
                            <label style={modalLabelStyle}>추가 매입 수량 (주)</label>
                            <input type="number" value={buyForm.quantity} min="1"
                                placeholder="ex) 5"
                                onChange={e => setBuyForm(f => ({ ...f, quantity: e.target.value }))}
                                style={modalInputStyle} />
                        </div>

                        <div>
                            <label style={{ color: '#9ca3af', fontSize: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span>매입가 <span style={{ fontSize: 11, color: buyTarget.currency === 'USD' ? '#60a5fa' : '#4ade80', fontWeight: 'bold' }}>{buyTarget.currency === 'USD' ? '$ USD' : '₩ KRW'}</span></span>
                                {(() => {
                                    const sym = buyTarget.market === 'kr' ? `${buyTarget.stock_code}${buyTarget.suffix ?? '.KS'}` : buyTarget.ticker;
                                    const cp  = prices[sym]?.current_price;
                                    return cp ? (
                                        <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                                            <input type="checkbox"
                                                   onChange={e => setBuyForm(f => ({ ...f, avgPrice: e.target.checked ? String(cp) : '' }))}
                                                   style={{ accentColor: '#3b82f6' }} />
                                            <span style={{ fontSize: 11, color: '#60a5fa' }}>현재가로 입력</span>
                                        </label>
                                    ) : null;
                                })()}
                            </label>
                            <input type="number" value={buyForm.avgPrice} min="0"
                                placeholder={buyTarget.currency === 'USD' ? '210.50' : '68000'}
                                onChange={e => setBuyForm(f => ({ ...f, avgPrice: e.target.value }))}
                                style={modalInputStyle} />
                        </div>

                        {/* 새 평단가 미리보기 */}
                        {previewAvg !== null && (
                            <div style={{
                                background: '#14532d22', border: '1px solid #14532d',
                                borderRadius: 8, padding: '8px 12px',
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            }}>
                                <span style={{ color: '#9ca3af', fontSize: 12 }}>새 평균단가</span>
                                <span style={{ color: '#4ade80', fontSize: 14, fontWeight: 'bold' }}>
                                    {buyTarget.currency === 'USD'
                                        ? `$${previewAvg.toFixed(2)}`
                                        : `${Math.round(previewAvg).toLocaleString()}원`}
                                </span>
                            </div>
                        )}

                        {buyTarget.currency === 'USD' && (
                            <div>
                                <label style={modalLabelStyle}>
                                    환율 (USD/KRW)
                                    <span style={{ marginLeft: 6, fontSize: 11, color: '#4b5563' }}>
                                        (자동: {usdKrw ? `${usdKrw.toLocaleString()}원` : '조회 중'})
                                    </span>
                                </label>
                                <input type="number" value={buyCustomRate}
                                       onChange={e => setBuyCustomRate(e.target.value)}
                                       placeholder={usdKrw ? String(usdKrw) : '1430'}
                                       style={modalInputStyle} />
                            </div>
                        )}

                        <div>
                            <label style={modalLabelStyle}>
                                매입일
                                <span style={{ marginLeft: 6, fontSize: 11, color: '#4b5563' }}>(선택 · 달력 및 인사이트에 반영)</span>
                            </label>
                            <input type="date" value={buyForm.purchaseDate}
                                   onChange={e => setBuyForm(f => ({ ...f, purchaseDate: e.target.value }))}
                                   style={{ ...modalInputStyle, color: buyForm.purchaseDate ? '#fff' : '#6b7280' }} />
                        </div>

                        <button
                            onClick={handleAddBuySubmit}
                            disabled={buyLoading}
                            style={{
                                background: buyLoading ? '#374151' : '#14532d',
                                color: '#4ade80', border: 'none', borderRadius: 10,
                                padding: '12px 0', fontSize: 14, fontWeight: 'bold',
                                cursor: buyLoading ? 'not-allowed' : 'pointer',
                            }}
                        >
                            {buyLoading ? '처리 중...' : '추가매입 확정'}
                        </button>
                    </div>
                </div>
            )}

            {/* ── 거래 이력 상세 모달 ── */}
            {detailTarget && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
                }}>
                    <div style={{
                        background: '#111827', borderRadius: 16, padding: 24,
                        width: '90%', maxWidth: 400, maxHeight: '80vh', overflowY: 'auto',
                        display: 'flex', flexDirection: 'column', gap: 14,
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <p style={{ color: '#fff', fontWeight: 'bold', fontSize: 15, margin: 0 }}>
                                {detailTarget.corpName} 거래 이력
                            </p>
                            <button onClick={() => setDetailTarget(null)}
                                style={{ background: 'none', border: 'none', color: '#6b7280', fontSize: 20, cursor: 'pointer' }}>×</button>
                        </div>

                        {/* 현재 보유 현황 */}
                        <div style={{ background: '#1f2937', borderRadius: 8, padding: '10px 12px' }}>
                            <p style={{ color: '#6b7280', fontSize: 11, margin: '0 0 4px' }}>현재 보유</p>
                            <p style={{ color: '#fff', fontSize: 14, margin: 0, fontWeight: 'bold' }}>
                                {detailTarget.quantity?.toLocaleString()}주 ·
                                평균 {detailTarget.currency === 'USD'
                                    ? ` $${detailTarget.avgPrice?.toLocaleString()}`
                                    : ` ${detailTarget.avgPrice?.toLocaleString()}원`}
                            </p>
                        </div>

                        {/* 이력 리스트 */}
                        {(detailTarget.transactions ?? []).length === 0 ? (
                            <p style={{ color: '#6b7280', fontSize: 13, textAlign: 'center' }}>거래 이력이 없습니다</p>
                        ) : (
                            [...(detailTarget.transactions ?? [])].reverse().map((tx, i) => (
                                <div key={i} style={{
                                    background: '#1f2937', borderRadius: 8, padding: '10px 12px',
                                    borderLeft: `3px solid ${tx.type === 'buy' ? '#22c55e' : '#f59e0b'}`,
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                        <span style={{ color: tx.type === 'buy' ? '#4ade80' : '#fbbf24', fontSize: 12, fontWeight: 'bold' }}>
                                            {tx.type === 'buy' ? '📈 매입' : '✏️ 수정'}
                                        </span>
                                        <span style={{ color: '#6b7280', fontSize: 11 }}>
                                            {tx.purchaseDate
                                                ? new Date(tx.purchaseDate).toLocaleDateString('ko-KR')
                                                : new Date(tx.createdAt).toLocaleDateString('ko-KR')}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                                        <span style={{ color: '#9ca3af' }}>
                                            {tx.quantity.toLocaleString()}주 @
                                            {detailTarget.currency === 'USD'
                                                ? ` $${tx.price.toLocaleString()}`
                                                : ` ${tx.price.toLocaleString()}원`}
                                        </span>
                                        <span style={{ color: '#fff' }}>
                                            → 평단
                                            {detailTarget.currency === 'USD'
                                                ? ` $${tx.avgPrice.toFixed(2)}`
                                                : ` ${Math.round(tx.avgPrice).toLocaleString()}원`}
                                        </span>
                                    </div>
                                    <p style={{ color: '#4b5563', fontSize: 11, margin: '4px 0 0' }}>
                                        총 {tx.totalQty.toLocaleString()}주 보유
                                    </p>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
