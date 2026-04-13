import type { UserStock, BatchPrice } from '../types/finance';

interface Props {
    stock: UserStock;
    price?: BatchPrice;
    usdKrw?: number;          // USD→KRW 환율
    onRemove: (id: string) => void;
}

export default function StockCard({ stock, price, usdKrw, onRemove }: Props) {
    const isPortfolio = stock.type === 'portfolio';
    const isUsd       = stock.currency === 'USD';
    const changePos   = (price?.change_pct ?? 0) >= 0;

    // 현재가 표시
    const priceDisplay = price
        ? isUsd
            ? `$${price.current_price.toLocaleString()}`
            : `${price.current_price.toLocaleString()}원`
        : null;

    // USD → KRW 환산가 (환율 있을 때만)
    const krwEquiv = price && isUsd && usdKrw
        ? Math.round(price.current_price * usdKrw).toLocaleString()
        : null;

    // 수익률 (보유 종목만)
    const returnPct = isPortfolio && price && stock.avgPrice
        ? ((price.current_price - stock.avgPrice) / stock.avgPrice * 100).toFixed(2)
        : null;
    const returnPos = returnPct !== null ? parseFloat(returnPct) >= 0 : null;

    // 평균단가 표시
    const avgDisplay = stock.avgPrice
        ? isUsd
            ? `$${stock.avgPrice.toLocaleString()}`
            : `${stock.avgPrice.toLocaleString()}원`
        : null;

    // 평균단가 KRW 환산
    const avgKrwEquiv = stock.avgPrice && isUsd && usdKrw
        ? Math.round(stock.avgPrice * usdKrw).toLocaleString()
        : null;

    return (
        <div style={{
            background: '#111827', borderRadius: 12,
            padding: '14px 16px', display: 'flex',
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
                    onClick={() => onRemove(stock._id)}
                    style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: 16 }}
                >×</button>
            </div>

            {/* 현재가 */}
            {priceDisplay ? (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                        <div>
                            <span style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>{priceDisplay}</span>
                            {/* USD → KRW 환산 */}
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
                            {/* 평균단가 KRW 환산 */}
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

            {/* 타입 뱃지 */}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <span style={{
                    fontSize: 10, padding: '2px 8px', borderRadius: 99,
                    background: isPortfolio ? '#1d4ed8' : '#374151',
                    color: isPortfolio ? '#bfdbfe' : '#9ca3af',
                }}>
                    {isPortfolio ? '보유' : '관심'}
                </span>
            </div>
        </div>
    );
}
