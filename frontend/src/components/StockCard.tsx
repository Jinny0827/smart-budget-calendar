import type { UserStock, BatchPrice } from '../types/finance';

interface Props {
    stock: UserStock;
    price?: BatchPrice;
    usdKrw?: number;
    onRemove: (id: string) => void;
    onEdit: (stock: UserStock) => void;
    onAddBuy: (stock: UserStock) => void;
    onDetail: (stock: UserStock) => void;
}

export default function StockCard({ stock, price, usdKrw, onRemove, onEdit, onAddBuy, onDetail }: Props) {
    const isPortfolio = stock.type === 'portfolio';
    const isUsd       = stock.currency === 'USD';
    const changePos   = (price?.change_pct ?? 0) >= 0;

    const priceDisplay = price
        ? isUsd
            ? `$${price.current_price.toLocaleString()}`
            : `${price.current_price.toLocaleString()}원`
        : null;

    const krwEquiv = price && isUsd && usdKrw
        ? Math.round(price.current_price * usdKrw).toLocaleString()
        : null;

    const returnPct = isPortfolio && price && stock.avgPrice
        ? ((price.current_price - stock.avgPrice) / stock.avgPrice * 100).toFixed(2)
        : null;
    const returnPos = returnPct !== null ? parseFloat(returnPct) >= 0 : null;

    const avgDisplay = stock.avgPrice
        ? isUsd
            ? `$${stock.avgPrice.toLocaleString()}`
            : `${stock.avgPrice.toLocaleString()}원`
        : null;

    const avgKrwEquiv = stock.avgPrice && isUsd && usdKrw
        ? Math.round(stock.avgPrice * usdKrw).toLocaleString()
        : null;

    return (
        // 카드 자체는 인라인 스타일 유지하되 Tailwind cursor 클래스 병행
        <div
            onClick={() => onDetail(stock)}
            className="cursor-pointer"
            style={{
            background: '#111827', borderRadius: 12,
            padding: '12px 14px', display: 'flex',
            flexDirection: 'column', gap: 8,
        }}>
            {/* 종목명 + 삭제 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <p style={{ color: '#fff', fontWeight: 'bold', fontSize: 14, margin: 0 }}>{stock.corpName}</p>
                    <p style={{ color: '#6b7280', fontSize: 11, margin: 0 }}>
                        {stock.ticker} · {stock.market.toUpperCase()} · {isUsd ? 'USD' : 'KRW'}
                    </p>
                </div>
                <button
                    onClick={(e) => { e.stopPropagation(); onRemove(stock._id); }}
                    style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: 16 }}
                >×</button>
            </div>

            {/* 현재가 */}
            {priceDisplay ? (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                        <div>
                            <span style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>{priceDisplay}</span>
                            {krwEquiv && (
                                <p style={{ color: '#6b7280', fontSize: 11, margin: '2px 0 0' }}>
                                    ≈ {krwEquiv}원
                                    {usdKrw && <span style={{ color: '#4b5563', fontSize: 10 }}> ({usdKrw.toLocaleString()}₩/$)</span>}
                                </p>
                            )}
                        </div>
                        <span style={{ color: changePos ? '#22c55e' : '#ef4444', fontSize: 13, fontWeight: 'bold' }}>
                            {changePos ? '▲' : '▼'} {Math.abs(price!.change_pct)}%
                        </span>
                    </div>

                    {/* 보유 종목 수익률 */}
                    {isPortfolio && returnPct !== null && (
                        <div style={{
                            background: '#1f2937', borderRadius: 8,
                            padding: '8px 10px', marginTop: 8,
                            display: 'flex', flexDirection: 'column', gap: 4,
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                                <span style={{ color: '#9ca3af' }}>
                                    {stock.quantity?.toLocaleString()}주 · 평균 {avgDisplay}
                                </span>
                                <span style={{ color: returnPos ? '#22c55e' : '#ef4444', fontWeight: 'bold' }}>
                                    {returnPos ? '+' : ''}{returnPct}%
                                </span>
                            </div>
                            {avgKrwEquiv && (
                                <p style={{ color: '#4b5563', fontSize: 10, margin: 0 }}>
                                    평균단가 ≈ {avgKrwEquiv}원
                                </p>
                            )}
                        </div>
                    )}
                </div>
            ) : (
                <p style={{ color: '#6b7280', fontSize: 13, margin: 0 }}>주가 로딩 중...</p>
            )}

            {/* 하단: 뱃지 + 버튼 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{
                    fontSize: 10, padding: '2px 8px', borderRadius: 99,
                    background: isPortfolio ? '#1d4ed8' : '#374151',
                    color: isPortfolio ? '#bfdbfe' : '#9ca3af',
                }}>
                    {isPortfolio ? '보유' : '관심'}
                </span>

                {/* 보유 종목만 수정/추가매입 버튼 */}
                {isPortfolio && (
                    <div style={{ display: 'flex', gap: 6 }}>
                        <button
                            onClick={(e) => { e.stopPropagation(); onAddBuy(stock); }}
                            style={{
                                fontSize: 11, padding: '3px 8px', borderRadius: 6,
                                background: '#14532d', color: '#4ade80',
                                border: 'none', cursor: 'pointer',
                            }}
                        >
                            + 추가매입
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); onEdit(stock); }}
                            style={{
                                fontSize: 11, padding: '3px 8px', borderRadius: 6,
                                background: '#1f2937', color: '#9ca3af',
                                border: '1px solid #374151', cursor: 'pointer',
                            }}
                        >
                            수정
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
