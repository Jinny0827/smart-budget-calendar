import { useState } from 'react';
import type { AnalyzeResult } from '../types/finance';

interface Props {
    result: AnalyzeResult;         // 현재 분석된 종목 정보
    onClose: () => void;
    onRegister: (payload: RegisterPayload) => Promise<void>;
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
}

export default function StockRegisterModal({ result, onClose, onRegister }: Props) {
    const [type, setType]         = useState<'watchlist' | 'portfolio'>('watchlist');
    const [quantity, setQuantity] = useState('');
    const [avgPrice, setAvgPrice] = useState('');
    const [loading, setLoading]   = useState(false);
    const [error, setError]       = useState<string | null>(null);

    const info = result.company_info;
    const isUs = info.market === 'US';
    const symbol = result.stock_data?.symbol ??
                        result.stock_data?.ticker ??
                        info.ticker ??
                        '';

    const handleSubmit = async () => {
        if (type === 'portfolio') {
            if(!quantity || !avgPrice) {
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

        try{
            await onRegister({
                corpName:  info.corp_name,
                ticker:    info.ticker ?? info.stock_code ?? symbol,
                symbol,
                corp_code: info.corp_code ?? info.cik,
                market:    isUs ? 'us' : 'kr',
                type,
                quantity:  type === 'portfolio' ? Number(quantity) : undefined,
                avgPrice:  type === 'portfolio' ? Number(avgPrice) : undefined,
                currency:  isUs ? 'USD' : 'KRW',
            });
        } catch (e: any) {
            setError(e.message ?? '등록 실패');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000,
        }}>
            <div style={{
                background: '#111827',
                borderRadius: 16,
                padding: 24,
                width: '90%',
                maxWidth: 360,
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
            }}>
                {/* 헤더 */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <p style={{ color: '#fff', fontWeight: 'bold', fontSize: 16, margin: 0 }}>{info.corp_name}</p>
                        <p style={{ color: '#6b7280', fontSize: 12, margin: 0 }}>{symbol} · {isUs ? 'US' : 'KR'}</p>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#6b7280', fontSize: 20, cursor: 'pointer' }}>×</button>
                </div>

                {/* 타입 선택 */}
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

                {/* 보유 종목 추가 입력 */}
                {type === 'portfolio' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div>
                            <label style={{ color: '#9ca3af', fontSize: 12 }}>보유 수량</label>
                            <input
                                type="number"
                                value={quantity}
                                onChange={e => setQuantity(e.target.value)}
                                placeholder="ex) 10"
                                style={{
                                    width: '100%', marginTop: 4,
                                    background: '#1f2937', border: '1px solid #374151',
                                    borderRadius: 8, padding: '10px 12px',
                                    color: '#fff', fontSize: 14,
                                    boxSizing: 'border-box',
                                }}
                            />
                        </div>
                        <div>
                            <label style={{ color: '#9ca3af', fontSize: 12 }}>
                                평균 매입가 ({isUs ? 'USD' : 'KRW'})
                            </label>
                            <input
                                type="number"
                                value={avgPrice}
                                onChange={e => setAvgPrice(e.target.value)}
                                placeholder={isUs ? 'ex) 210.5' : 'ex) 68000'}
                                style={{
                                    width: '100%', marginTop: 4,
                                    background: '#1f2937', border: '1px solid #374151',
                                    borderRadius: 8, padding: '10px 12px',
                                    color: '#fff', fontSize: 14,
                                    boxSizing: 'border-box',
                                }}
                            />
                        </div>
                    </div>
                )}

                {error && (
                    <p style={{ color: '#ef4444', fontSize: 12, margin: 0 }}>{error}</p>
                )}

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
                    {loading ? '등록 중...' : '등록하기'}
                </button>
            </div>
        </div>
    );
}