import { useState } from 'react';
import type { AnalyzeResult } from '../types/finance';

interface Props {
    result: AnalyzeResult;
    onClose: () => void;
    onRegister: (payload: RegisterPayload) => Promise<void>;
    usdKrw?: number;
}

export interface RegisterPayload {
    corpName: string;
    ticker: string;
    symbol: string;
    corp_code?: string;
    market: 'kr' | 'us';
    type: 'watchlist' | 'portfolio';
    quantity?: number;
    avgPrice?: number;
    currency: 'KRW' | 'USD';
    purchaseDate?: string;
}

export default function StockRegisterModal({ result, onClose, onRegister, usdKrw }: Props) {
    const [type,     setType]     = useState<'watchlist' | 'portfolio'>('watchlist');
    const [quantity, setQuantity] = useState('');
    const [avgPrice, setAvgPrice] = useState('');
    const [purchaseDate, setPurchaseDate] = useState('');
    const [useCurrentPrice, setUseCurrentPrice] = useState(false);
    const [customRate, setCustomRate]           = useState('');
    const [loading,  setLoading]  = useState(false);
    const [error,    setError]    = useState<string | null>(null);

    const info     = result.company_info;
    const isUs     = info.market === 'US';
    const currency = isUs ? 'USD' : 'KRW';
    const symbol   = result.stock_data?.symbol ?? result.stock_data?.ticker ?? info.ticker ?? '';

    // 현재가 표시
    const currentPrice = result.stock_data?.current_price;
    const priceLabel   = currentPrice
        ? isUs
            ? `$${currentPrice.toLocaleString()}`
            : `${currentPrice.toLocaleString()}원`
        : null;

    const handleSubmit = async () => {
        if (type === 'portfolio') {
            if (!quantity || !avgPrice) {
                setError('수량과 평균매입가를 입력해주세요');
                return;
            }
            if (isNaN(Number(quantity)) || isNaN(Number(avgPrice))) {
                setError('숫자만 입력해주세요');
                return;
            }
        }

        setLoading(true);
        setError(null);
        try {
            await onRegister({
                corpName:  info.corp_name,
                ticker:    info.ticker ?? info.stock_code ?? symbol,
                symbol,
                corp_code: info.corp_code ?? info.cik,
                market:    isUs ? 'us' : 'kr',
                type,
                quantity:  type === 'portfolio' ? Number(quantity) : undefined,
                avgPrice:  type === 'portfolio' ? Number(avgPrice) : undefined,
                currency,
                purchaseDate: type === 'portfolio' && purchaseDate ? purchaseDate : undefined,
            });
        } catch (e: any) {
            setError(e.message ?? '등록 실패');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.75)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000,
        }}>
            <div style={{
                background: '#111827', borderRadius: 16, padding: 24,
                width: '90%', maxWidth: 360,
                display: 'flex', flexDirection: 'column', gap: 16,
            }}>
                {/* 헤더 */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                        <p style={{ color: '#fff', fontWeight: 'bold', fontSize: 16, margin: '0 0 4px' }}>
                            {info.corp_name}
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ color: '#6b7280', fontSize: 12 }}>{symbol}</span>
                            {/* 통화 뱃지 */}
                            <span style={{
                                fontSize: 11, padding: '1px 7px', borderRadius: 99,
                                background: isUs ? '#1e3a5f' : '#14532d',
                                color: isUs ? '#60a5fa' : '#4ade80',
                                fontWeight: 'bold',
                            }}>
                                {currency}
                            </span>
                            <span style={{
                                fontSize: 11, padding: '1px 7px', borderRadius: 99,
                                background: '#1f2937', color: '#9ca3af',
                            }}>
                                {isUs ? '🇺🇸 US' : '🇰🇷 KR'}
                            </span>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        style={{ background: 'none', border: 'none', color: '#6b7280', fontSize: 20, cursor: 'pointer' }}
                    >×</button>
                </div>

                {/* 현재가 표시 */}
                {priceLabel && (
                    <div style={{
                        background: '#1f2937', borderRadius: 10, padding: '10px 14px',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}>
                        <span style={{ color: '#9ca3af', fontSize: 12 }}>현재가</span>
                        <div style={{ textAlign: 'right' }}>
                            <span style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>{priceLabel}</span>
                            <span style={{
                                marginLeft: 8, fontSize: 12, fontWeight: 'bold',
                                color: (result.stock_data?.change_pct ?? 0) >= 0 ? '#22c55e' : '#ef4444',
                            }}>
                                {(result.stock_data?.change_pct ?? 0) >= 0 ? '+' : ''}
                                {result.stock_data?.change_pct}%
                            </span>
                        </div>
                    </div>
                )}

                {/* 관심 / 보유 탭 */}
                <div style={{ display: 'flex', background: '#1f2937', borderRadius: 8, padding: 4, gap: 4 }}>
                    {(['watchlist', 'portfolio'] as const).map(t => (
                        <button
                            key={t}
                            onClick={() => { setType(t); setError(null); }}
                            style={{
                                flex: 1, padding: '8px 0',
                                background: type === t ? '#1d4ed8' : 'transparent',
                                color: type === t ? '#fff' : '#6b7280',
                                border: 'none', borderRadius: 6,
                                fontSize: 13, fontWeight: type === t ? 'bold' : 'normal',
                                cursor: 'pointer',
                            }}
                        >
                            {t === 'watchlist' ? '👀 관심 종목' : '💼 보유 종목'}
                        </button>
                    ))}
                </div>

                {/* 보유 종목 입력 */}
                {type === 'portfolio' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {/* 통화 안내 */}
                        <div style={{
                            background: isUs ? '#1e3a5f22' : '#14532d22',
                            border: `1px solid ${isUs ? '#1e3a5f' : '#14532d'}`,
                            borderRadius: 8, padding: '8px 12px',
                            display: 'flex', alignItems: 'center', gap: 6,
                        }}>
                            <span style={{ fontSize: 14 }}>{isUs ? '💵' : '💴'}</span>
                            <p style={{ color: '#9ca3af', fontSize: 12, margin: 0 }}>
                                매입가는 <strong style={{ color: isUs ? '#60a5fa' : '#4ade80' }}>{currency}</strong>
                                {isUs ? ' (달러)' : ' (원화)'}로 입력하세요
                            </p>
                        </div>

                        {/* 수량 */}
                        <div>
                            <label style={{ color: '#9ca3af', fontSize: 12 }}>보유 수량 (주)</label>
                            <input
                                type="number"
                                value={quantity}
                                onChange={e => setQuantity(e.target.value)}
                                placeholder="ex) 10"
                                min="0"
                                style={{
                                    width: '100%', marginTop: 4,
                                    background: '#1f2937', border: '1px solid #374151',
                                    borderRadius: 8, padding: '10px 12px',
                                    color: '#fff', fontSize: 14,
                                    boxSizing: 'border-box', outline: 'none',
                                }}
                            />
                        </div>

                        {/* 평균 매입가 */}
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <label style={{ color: '#9ca3af', fontSize: 12 }}>
                                    평균 매입가 <span style={{ color: isUs ? '#60a5fa' : '#4ade80', fontWeight: 'bold', fontSize: 11 }}>{isUs ? '$ USD' : '₩ KRW'}</span>
                                </label>
                                {currentPrice && (
                                    <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                                        <input
                                            type="checkbox"
                                            checked={useCurrentPrice}
                                            onChange={e => {
                                                setUseCurrentPrice(e.target.checked);
                                                if (e.target.checked) setAvgPrice(String(currentPrice));
                                                else setAvgPrice('');
                                            }}
                                            style={{ accentColor: '#3b82f6' }}
                                        />
                                        <span style={{ fontSize: 11, color: '#60a5fa' }}>현재가로 입력</span>
                                    </label>
                                )}
                            </div>
                            <div style={{ position: 'relative', marginTop: 4 }}>
                                <span style={{
                                    position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                                    color: '#6b7280', fontSize: 14, pointerEvents: 'none',
                                }}>
                                    {isUs ? '$' : '₩'}
                                </span>
                                <input
                                    type="number"
                                    value={avgPrice}
                                    onChange={e => setAvgPrice(e.target.value)}
                                    placeholder={isUs ? '210.50' : '68000'}
                                    min="0"
                                    style={{
                                        width: '100%',
                                        background: '#1f2937', border: '1px solid #374151',
                                        borderRadius: 8, padding: '10px 12px 10px 28px',
                                        color: '#fff', fontSize: 14,
                                        boxSizing: 'border-box', outline: 'none',
                                    }}
                                />
                            </div>
                        </div>


                        {/* 총 매입금액 미리보기 */}
                        {quantity && avgPrice && !isNaN(Number(quantity)) && !isNaN(Number(avgPrice)) && (
                            <div style={{ background: '#1f2937', borderRadius: 8, padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: '#6b7280', fontSize: 12 }}>총 매입금액</span>
                                    <span style={{ color: '#fff', fontSize: 13, fontWeight: 'bold' }}>
                                        {isUs
                                            ? `$${(Number(quantity) * Number(avgPrice)).toLocaleString()}`
                                            : `${(Number(quantity) * Number(avgPrice)).toLocaleString()}원`}
                                    </span>
                                </div>
                                {isUs && (customRate || usdKrw) && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ color: '#4b5563', fontSize: 11 }}>≈ 원화 환산</span>
                                        <span style={{ color: '#9ca3af', fontSize: 11 }}>
                                            {Math.round(Number(quantity) * Number(avgPrice) * Number(customRate || usdKrw)).toLocaleString()}원
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}


                        {/* 매입일 */}
                        <div>
                            <label style={{ color: '#9ca3af', fontSize: 12 }}>
                                매입일
                                <span style={{ marginLeft: 6, fontSize: 11, color: '#4b5563' }}>(선택 · 입력 시 달력 및 인사이트에 반영)</span>
                            </label>
                            <input
                                type="date"
                                value={purchaseDate}
                                onChange={e => setPurchaseDate(e.target.value)}
                                style={{
                                    width: '100%', marginTop: 4,
                                    background: '#1f2937', border: '1px solid #374151',
                                    borderRadius: 8, padding: '10px 12px',
                                    color: purchaseDate ? '#fff' : '#6b7280', fontSize: 14,
                                    boxSizing: 'border-box', outline: 'none',
                                }}
                            />
                        </div>

                        {/* 환율 (USD 전용) */}
                        {isUs && (
                            <div>
                                <label style={{ color: '#9ca3af', fontSize: 12 }}>
                                    환율 (USD/KRW)
                                    <span style={{ marginLeft: 6, fontSize: 11, color: '#4b5563' }}>
                                        (자동: {usdKrw ? `${usdKrw.toLocaleString()}원` : '조회 중'})
                                    </span>
                                </label>
                                <input
                                    type="number"
                                    value={customRate}
                                    onChange={e => setCustomRate(e.target.value)}
                                    placeholder={usdKrw ? String(usdKrw) : '1430'}
                                    style={{
                                        width: '100%', marginTop: 4,
                                        background: '#1f2937', border: '1px solid #374151',
                                        borderRadius: 8, padding: '10px 12px',
                                        color: '#fff', fontSize: 14,
                                        boxSizing: 'border-box', outline: 'none',
                                    }}
                                />
                            </div>
                        )}
                    </div>
                )}

                {error && <p style={{ color: '#ef4444', fontSize: 12, margin: 0 }}>{error}</p>}

                {/* 등록 버튼 */}
                <button
                    onClick={handleSubmit}
                    disabled={loading}
                    style={{
                        background: loading ? '#374151' : '#1d4ed8',
                        color: '#fff', border: 'none',
                        borderRadius: 10, padding: '12px 0',
                        fontSize: 15, fontWeight: 'bold',
                        cursor: loading ? 'not-allowed' : 'pointer',
                    }}
                >
                    {loading ? '등록 중...' : `${type === 'watchlist' ? '관심' : '보유'} 종목으로 등록`}
                </button>
            </div>
        </div>
    );
}
