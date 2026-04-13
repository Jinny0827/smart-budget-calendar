import { useState, useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import type {
    AnalyzeResult, YearFinancial, BalanceSheet,
    AmountData, Insight, SectorNews, StockData,
    CompanyInfo, Disclosure, Shareholder, Dividend,
} from '../types/finance';
import StockList from '../components/StockList.tsx';
import StockRegisterModal from '../components/StockRegisterModal';
import type { RegisterPayload } from '../components/StockRegisterModal';

// ── 상수 ──────────────────────────────────────────────────
const API_BASE = `${import.meta.env.VITE_API_URL}/finance`;

// ── 페이지 탭 ──────────────────────────────────────────────
type PageTab  = 'mystock' | 'analyze';
type Step     = 'search' | 'loading' | 'result';
type TabKey   = 'financial' | 'stock' | 'disclosure' | 'shareholder' | 'dividend' | 'insight';

// ── 유틸 ──────────────────────────────────────────────────
function formatDate(dt: string | null) {
    if (!dt) return '-';
    return `${dt.slice(0, 4)}.${dt.slice(4, 6)}.${dt.slice(6, 8)}`;
}
function formatDisclosureDate(dt: string) {
    return `${dt.slice(0, 4)}.${dt.slice(4, 6)}.${dt.slice(6, 8)}`;
}
function getColor(raw?: number) {
    if (raw === undefined) return undefined;
    return raw >= 0 ? '#00cc44' : '#f87171';
}
function getChartValue(amount?: AmountData): number {
    if (!amount) return 0;
    return amount.억원 ?? amount.백만달러 ?? 0;
}
function getChartUnit(data: Record<string, YearFinancial>): string {
    const first = Object.values(data)[0];
    const rev = first?.income_statement?.revenue;
    if (rev && rev.백만달러 !== undefined) return '$M';
    return '억';
}

// ══════════════════════════════════════════════════════════
// 메인 컴포넌트
// ══════════════════════════════════════════════════════════
export default function FinancePage() {
    const [pageTab, setPageTab] = useState<PageTab>('mystock');

    // 분석 상태
    const [step,    setStep]    = useState<Step>('search');
    const [query,   setQuery]   = useState('');
    const [year,    setYear]    = useState(String(new Date().getFullYear() - 1));
    const [result,  setResult]  = useState<AnalyzeResult | null>(null);
    const [error,   setError]   = useState<string | null>(null);
    const [tab,     setTab]     = useState<TabKey>('financial');
    const [market,  setMarket]  = useState<'kr' | 'us'>('kr');
    const [suggestions, setSuggestions]   = useState<string[]>([]);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const acCache = useRef<Record<string, string[]>>({});

    // 종목 등록 모달
    const [showModal,   setShowModal]   = useState(false);
    const [refreshKey,  setRefreshKey]  = useState(0);

    // ── 자동완성 ──
    useEffect(() => {
        if (query.trim().length < 2) { setSuggestions([]); return; }
        const cacheKey = `${market}:${query.trim()}`;
        if (acCache.current[cacheKey]) { setSuggestions(acCache.current[cacheKey]); return; }

        const timer = setTimeout(async () => {
            try {
                const res  = await fetch(`${API_BASE}/autocomplete?query=${encodeURIComponent(query.trim())}&market=${market}`);
                const data = await res.json();
                if (data.length > 0) acCache.current[cacheKey] = data;
                setSuggestions(data);
                setSelectedIndex(-1);
            } catch { setSuggestions([]); }
        }, 150);

        return () => clearTimeout(timer);
    }, [query, market]);

    // ── 분석 호출 ──
    const handleSearch = async (force = false) => {
        if (!query.trim()) return;
        setSuggestions([]);
        setError(null);
        setStep('loading');

        try {
            const token = localStorage.getItem('token');
            const url   = `${API_BASE}/analyze?query=${encodeURIComponent(query)}&year=${year}&market=${market}${force ? '&force=true' : ''}`;
            const res   = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
            const data  = await res.json();
            if (!res.ok) throw new Error(data.error || '조회 실패');
            setResult(data);
            setStep('result');
            setTab('financial');
        } catch (e: any) {
            setError(e.message || '서버 오류가 발생했습니다');
            setStep('search');
        }
    };

    const handleReset = () => {
        setStep('search');
        setQuery('');
        setResult(null);
        setError(null);
    };

    // ── 종목 등록 ──
    const handleRegister = async (payload: RegisterPayload) => {
        const token = localStorage.getItem('token');
        const res   = await fetch(`${API_BASE}/stocks`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.message || '등록 실패');
        }
        setShowModal(false);
        setRefreshKey(k => k + 1);
        setPageTab('mystock');   // 등록 후 내 종목 탭으로 이동
    };

    return (
        <div style={{ maxWidth: 480, margin: '0 auto', background: '#000', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

            {/* ── 헤더 ── */}
            <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ color: '#888', fontSize: 13 }}>
                    {pageTab === 'mystock' ? '내 종목' : step === 'search' ? '기업 검색' : step === 'loading' ? '조회 중' : '분석 결과'}
                </span>
                <h2 style={{ color: '#fff', margin: 0, fontSize: 17, fontWeight: 'bold' }}>재무 분석</h2>
                {pageTab === 'analyze' && step === 'result'
                    ? <button onClick={handleReset} style={{ color: '#60a5fa', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13 }}>다시 검색</button>
                    : <span style={{ width: 56 }} />
                }
            </div>

            {/* ── 페이지 탭 ── */}
            <div style={{ display: 'flex', borderBottom: '1px solid #1f2937', padding: '0 16px' }}>
                {([['mystock', '내 종목'], ['analyze', '기업 분석']] as const).map(([key, label]) => (
                    <button
                        key={key}
                        onClick={() => setPageTab(key)}
                        style={{
                            padding: '10px 16px', background: 'none', border: 'none',
                            color: pageTab === key ? '#60a5fa' : '#6b7280',
                            borderBottom: pageTab === key ? '2px solid #60a5fa' : '2px solid transparent',
                            fontSize: 14, fontWeight: pageTab === key ? 'bold' : 'normal',
                            cursor: 'pointer',
                        }}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {/* ── 내 종목 탭 ── */}
            {pageTab === 'mystock' && (
                <div style={{ padding: 16, flex: 1 }}>
                    <StockList
                        onRegisterClick={() => setPageTab('analyze')}
                        refreshKey={refreshKey}
                    />
                </div>
            )}

            {/* ── 기업 분석 탭 ── */}
            {pageTab === 'analyze' && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>

                    {/* 검색 화면 */}
                    {step === 'search' && (
                        <div style={{ padding: 16, flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>

                            {/* 마켓 토글 */}
                            <div style={{ display: 'flex', background: '#111827', borderRadius: 8, padding: 4, gap: 4 }}>
                                {([['kr', '🇰🇷 한국'], ['us', '🇺🇸 미국']] as const).map(([key, label]) => (
                                    <button
                                        key={key}
                                        onClick={() => { setMarket(key); setQuery(''); setSuggestions([]); }}
                                        style={{
                                            flex: 1, padding: '10px 0',
                                            background: market === key ? '#0d4f8c' : 'transparent',
                                            color: market === key ? '#fff' : '#6b7280',
                                            border: 'none', borderRadius: 6,
                                            fontSize: 14, fontWeight: market === key ? 'bold' : 'normal',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>

                            <p style={{ color: '#888', fontSize: 13, margin: 0 }}>
                                {market === 'us' ? '회사명 또는 티커를 입력하세요' : '회사명 또는 종목코드를 입력하세요'}
                            </p>

                            {/* 검색 입력 */}
                            <div style={{ position: 'relative' }}>
                                <input
                                    type="text"
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (suggestions.length > 0) {
                                            if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex(i => Math.min(i + 1, suggestions.length - 1)); }
                                            else if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIndex(i => Math.max(i - 1, -1)); }
                                            else if (e.key === 'Escape') { setSuggestions([]); setSelectedIndex(-1); }
                                            else if (e.key === 'Enter') {
                                                if (selectedIndex >= 0) { setQuery(suggestions[selectedIndex]); setSuggestions([]); setSelectedIndex(-1); }
                                                else { handleSearch(); }
                                            }
                                        } else if (e.key === 'Enter') { handleSearch(); }
                                    }}
                                    onBlur={() => setTimeout(() => { setSuggestions([]); setSelectedIndex(-1); }, 150)}
                                    placeholder={market === 'us' ? '예: 테슬라 또는 TSLA' : '예: 삼성전자 또는 005930'}
                                    style={{
                                        width: '100%', padding: '14px 16px', background: '#111827',
                                        color: '#fff', border: '1px solid #374151', borderRadius: 8,
                                        fontSize: 16, boxSizing: 'border-box', outline: 'none',
                                    }}
                                />

                                {suggestions.length > 0 && (
                                    <div style={{
                                        position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
                                        background: '#1f2937', border: '1px solid #374151',
                                        borderRadius: 8, marginTop: 4, overflow: 'hidden',
                                    }}>
                                        {suggestions.map((name, idx) => (
                                            <button
                                                key={name}
                                                onMouseDown={() => { setQuery(name); setSuggestions([]); setSelectedIndex(-1); }}
                                                onMouseEnter={() => setSelectedIndex(idx)}
                                                onMouseLeave={() => setSelectedIndex(-1)}
                                                style={{
                                                    display: 'block', width: '100%', padding: '12px 16px',
                                                    background: selectedIndex === idx ? '#374151' : 'none',
                                                    border: 'none', borderBottom: '1px solid #374151',
                                                    color: '#e2e8f0', fontSize: 14, textAlign: 'left', cursor: 'pointer',
                                                }}
                                            >
                                                {name}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* 사업연도 */}
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                <span style={{ color: '#888', fontSize: 13 }}>사업연도</span>
                                <select
                                    value={year}
                                    onChange={(e) => setYear(e.target.value)}
                                    style={{
                                        padding: '8px 12px', background: '#111827',
                                        color: '#fff', border: '1px solid #374151',
                                        borderRadius: 8, fontSize: 14, cursor: 'pointer',
                                    }}
                                >
                                    {Array.from({ length: 5 }, (_, i) => String(new Date().getFullYear() - 1 - i))
                                        .map((y) => <option key={y} value={y}>{y}년</option>)}
                                </select>
                            </div>

                            {error && <p style={{ color: '#f87171', fontSize: 13, margin: 0 }}>{error}</p>}

                            <button
                                onClick={handleSearch}
                                disabled={!query.trim()}
                                style={{
                                    marginTop: 8, padding: '14px 0',
                                    background: query.trim() ? '#0d4f8c' : '#1f2937',
                                    color: query.trim() ? '#fff' : '#6b7280',
                                    border: 'none', borderRadius: 8,
                                    fontSize: 16, cursor: query.trim() ? 'pointer' : 'default',
                                    fontWeight: 'bold',
                                }}
                            >
                                재무 분석 시작
                            </button>

                            {/* 예시 버튼 */}
                            <div style={{ marginTop: 8 }}>
                                <p style={{ color: '#555', fontSize: 12, margin: '0 0 8px' }}>예시</p>
                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                    {(market === 'us'
                                        ? ['테슬라', '애플', '엔비디아', '알파벳']
                                        : ['삼성전자', 'SK하이닉스', '카카오', 'NAVER']
                                    ).map((name) => (
                                        <button
                                            key={name}
                                            onClick={() => setQuery(name)}
                                            style={{
                                                padding: '6px 12px', background: '#1f2937',
                                                color: '#9ca3af', border: '1px solid #374151',
                                                borderRadius: 20, fontSize: 13, cursor: 'pointer',
                                            }}
                                        >
                                            {name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 로딩 화면 */}
                    {step === 'loading' && (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
                            <div style={{ color: '#60a5fa', fontSize: 40 }}>📊</div>
                            <p style={{ color: '#fff', fontSize: 16, margin: 0 }}>{query} 분석 중...</p>
                            <p style={{ color: '#888', fontSize: 13, margin: 0 }}>데이터를 가져오고 있어요</p>
                        </div>
                    )}

                    {/* 결과 화면 */}
                    {step === 'result' && result && (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>

                            <CompanyCard info={result.company_info} />

                            {/* 종목 추가 버튼 */}
                            <div style={{ padding: '0 16px 8px' }}>
                                <button
                                    onClick={() => setShowModal(true)}
                                    style={{
                                        width: '100%', padding: '11px 0',
                                        background: '#1d4ed8', color: '#fff',
                                        border: 'none', borderRadius: 8,
                                        fontSize: 14, fontWeight: 'bold', cursor: 'pointer',
                                    }}
                                >
                                    ＋ 내 종목에 추가
                                </button>
                            </div>

                            {/* 분석 탭 메뉴 */}
                            <div style={{ display: 'flex', borderBottom: '1px solid #1f2937', overflowX: 'auto', scrollbarWidth: 'none' }}>
                                {([
                                    { key: 'financial',   label: '재무제표' },
                                    { key: 'stock',       label: '📈 주가' },
                                    { key: 'disclosure',  label: '공시' },
                                    { key: 'shareholder', label: '주주' },
                                    { key: 'dividend',    label: '배당' },
                                    { key: 'insight',     label: '인사이트' },
                                ] as const).map(({ key, label }) => (
                                    <button
                                        key={key}
                                        onClick={() => setTab(key)}
                                        style={{
                                            flexShrink: 0, padding: '12px 14px', background: 'none', border: 'none',
                                            color: tab === key ? '#60a5fa' : '#6b7280',
                                            borderBottom: tab === key ? '2px solid #60a5fa' : '2px solid transparent',
                                            fontSize: 12, cursor: 'pointer',
                                            fontWeight: tab === key ? 'bold' : 'normal',
                                            whiteSpace: 'nowrap',
                                        }}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>

                            {/* 탭 컨텐츠 */}
                            <div style={{ padding: 16, flex: 1 }}>
                                {tab === 'financial'   && <FinancialTab data={result.financial} baseYear={year} />}
                                {tab === 'stock'       && <StockTab data={result.stock_data} />}
                                {tab === 'disclosure'  && <DisclosureTab data={result.disclosures} />}
                                {tab === 'shareholder' && <ShareholderTab data={result.shareholders?.shareholders ?? []} />}
                                {tab === 'dividend'    && <DividendTab data={result.dividend ?? []} />}
                                {tab === 'insight'     && <InsightTab insight={result.insight} news={result.sector_news} />}
                            </div>

                            <div style={{ padding: '12px 16px', borderTop: '1px solid #1f2937', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                                <button
                                    onClick={() => handleSearch(true)}
                                    style={{
                                        background: 'none', border: '1px solid #374151',
                                        color: '#6b7280', borderRadius: 6,
                                        padding: '6px 14px', fontSize: 12, cursor: 'pointer',
                                    }}
                                >
                                    🔄 데이터 새로고침 (캐시 무시)
                                </button>
                                <p style={{ color: '#4b5563', fontSize: 11, margin: 0, textAlign: 'center' }}>
                                    본 서비스는 투자 참고용입니다. 투자 결정에 대한 책임은 본인에게 있습니다.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ── 종목 등록 모달 ── */}
            {showModal && result && (
                <StockRegisterModal
                    result={result}
                    onClose={() => setShowModal(false)}
                    onRegister={handleRegister}
                />
            )}
        </div>
    );
}

// ══════════════════════════════════════════════════════════
// 기업 개요 카드
// ══════════════════════════════════════════════════════════
function CompanyCard({ info }: { info: CompanyInfo }) {
    const isUs = info.market === 'US';
    return (
        <div style={{ margin: 16, padding: 16, background: '#0f172a', borderRadius: 8, border: '1px solid #1e3a5f' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h3 style={{ color: '#fff', margin: '0 0 4px', fontSize: 18 }}>{info.corp_name}</h3>
                    <span style={{ color: '#888', fontSize: 12 }}>
                        {isUs ? `${info.ticker} · ${info.exchange}` : `종목코드 ${info.stock_code}`}
                    </span>
                </div>
                <span style={{ background: '#1e3a5f', color: '#60a5fa', padding: '4px 10px', borderRadius: 20, fontSize: 12 }}>
                    {isUs ? info.sic_description : `업종 ${info.induty_code}`}
                </span>
            </div>
            <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {isUs ? (
                    <>
                        <InfoRow label="본사 주(State)" value={info.state ?? '-'} />
                        <InfoRow label="결산월"         value={info.fiscal_year_end ? `${info.fiscal_year_end.slice(0, 2)}월` : '-'} />
                    </>
                ) : (
                    <>
                        <InfoRow label="대표이사" value={info.ceo_nm ?? '-'} />
                        <InfoRow label="설립일"   value={formatDate(info.est_dt ?? null)} />
                    </>
                )}
            </div>
        </div>
    );
}

// ══════════════════════════════════════════════════════════
// 재무제표 탭
// ══════════════════════════════════════════════════════════
function FinancialTab({ data, baseYear }: { data: Record<string, YearFinancial>; baseYear: string }) {
    const years  = Object.keys(data).sort();
    const latest = data[baseYear] ?? data[years[years.length - 1]];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <SectionCard title="손익계산서 (3개년)" color="#00cc44">
                <IncomeChart data={data} years={years} />
                <div style={{ marginTop: 12 }}>
                    <FinRow label="매출액"   value={latest?.income_statement.revenue?.표시} />
                    <FinRow label="영업이익" value={latest?.income_statement.operating_profit?.표시} color={getColor(latest?.income_statement.operating_profit?.raw)} />
                    <FinRow label="순이익"   value={latest?.income_statement.net_income?.표시}       color={getColor(latest?.income_statement.net_income?.raw)} />
                </div>
            </SectionCard>

            <SectionCard title="재무상태표" color="#60a5fa">
                <BalanceChart data={latest?.balance_sheet} />
                <div style={{ marginTop: 12 }}>
                    <FinRow label="자산총계" value={latest?.balance_sheet.total_assets?.표시} />
                    <FinRow label="부채총계" value={latest?.balance_sheet.total_liabilities?.표시} />
                    <FinRow label="자본총계" value={latest?.balance_sheet.total_equity?.표시} />
                    <FinRow label="유동자산" value={latest?.balance_sheet.current_assets?.표시} />
                    <FinRow label="유동부채" value={latest?.balance_sheet.current_liabilities?.표시} />
                </div>
            </SectionCard>

            <SectionCard title="현금흐름표 (3개년)" color="#f59e0b">
                <CashFlowChart data={data} years={years} />
                <div style={{ marginTop: 12 }}>
                    <FinRow label="영업활동 CF" value={latest?.cash_flow.operating_cf?.표시} color={getColor(latest?.cash_flow.operating_cf?.raw)} />
                    <FinRow label="투자활동 CF" value={latest?.cash_flow.investing_cf?.표시} color={getColor(latest?.cash_flow.investing_cf?.raw)} />
                    <FinRow label="재무활동 CF" value={latest?.cash_flow.financing_cf?.표시} color={getColor(latest?.cash_flow.financing_cf?.raw)} />
                </div>
            </SectionCard>
        </div>
    );
}

// ── 차트 컴포넌트들 ────────────────────────────────────────
function IncomeChart({ data, years }: { data: Record<string, YearFinancial>; years: string[] }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (!canvasRef.current) return;
        const existing = Chart.getChart(canvasRef.current);
        if (existing) existing.destroy();

        const unit     = getChartUnit(data);
        const revenue  = years.map((y) => getChartValue(data[y]?.income_statement.revenue));
        const opProfit = years.map((y) => getChartValue(data[y]?.income_statement.operating_profit));
        const net      = years.map((y) => getChartValue(data[y]?.income_statement.net_income));

        const chart = new Chart(canvasRef.current, {
            type: 'bar',
            data: {
                labels: years,
                datasets: [
                    { label: '매출액',   data: revenue,  backgroundColor: '#1e40af' },
                    { label: '영업이익', data: opProfit, backgroundColor: '#00cc44' },
                    { label: '순이익',   data: net,      backgroundColor: '#60a5fa' },
                ],
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { labels: { color: '#9ca3af', font: { size: 11 } } },
                    tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${Number(ctx.raw).toLocaleString()}${unit}` } },
                },
                scales: {
                    x: { ticks: { color: '#9ca3af' }, grid: { color: '#1f2937' } },
                    y: { ticks: { color: '#9ca3af', callback: (v) => `${Number(v).toLocaleString()}${unit}` }, grid: { color: '#1f2937' } },
                },
            },
        });
        return () => { chart.destroy(); };
    }, [data, years]);

    return <canvas ref={canvasRef} style={{ width: '100%' }} />;
}

function BalanceChart({ data }: { data?: BalanceSheet }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (!canvasRef.current || !data) return;
        const existing = Chart.getChart(canvasRef.current);
        if (existing) existing.destroy();

        const chart = new Chart(canvasRef.current, {
            type: 'doughnut',
            data: {
                labels: ['부채', '자본'],
                datasets: [{
                    data: [getChartValue(data.total_liabilities), getChartValue(data.total_equity)],
                    backgroundColor: ['#f87171', '#00cc44'],
                    borderColor: '#111827', borderWidth: 2,
                }],
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { labels: { color: '#9ca3af', font: { size: 11 } } },
                    tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${Number(ctx.raw).toLocaleString()}` } },
                },
            },
        });
        return () => { chart.destroy(); };
    }, [data]);

    return <div style={{ maxWidth: 200, margin: '0 auto' }}><canvas ref={canvasRef} /></div>;
}

function CashFlowChart({ data, years }: { data: Record<string, YearFinancial>; years: string[] }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (!canvasRef.current) return;
        const existing = Chart.getChart(canvasRef.current);
        if (existing) existing.destroy();

        const unit  = getChartUnit(data);
        const chart = new Chart(canvasRef.current, {
            type: 'bar',
            data: {
                labels: years,
                datasets: [
                    { label: '영업활동', data: years.map((y) => getChartValue(data[y]?.cash_flow.operating_cf)), backgroundColor: '#f59e0b' },
                    { label: '투자활동', data: years.map((y) => getChartValue(data[y]?.cash_flow.investing_cf)), backgroundColor: '#60a5fa' },
                    { label: '재무활동', data: years.map((y) => getChartValue(data[y]?.cash_flow.financing_cf)), backgroundColor: '#a78bfa' },
                ],
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { labels: { color: '#9ca3af', font: { size: 11 } } },
                    tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${Number(ctx.raw).toLocaleString()}${unit}` } },
                },
                scales: {
                    x: { ticks: { color: '#9ca3af' }, grid: { color: '#1f2937' } },
                    y: { ticks: { color: '#9ca3af', callback: (v) => `${Number(v).toLocaleString()}${unit}` }, grid: { color: '#1f2937' } },
                },
            },
        });
        return () => { chart.destroy(); };
    }, [data, years]);

    return <canvas ref={canvasRef} style={{ width: '100%' }} />;
}

// ══════════════════════════════════════════════════════════
// 주가 탭
// ══════════════════════════════════════════════════════════
function StockTab({ data }: { data?: StockData }) {
    if (!data) return <Empty text="주가 데이터를 불러올 수 없습니다" />;

    const changeColor = data.change_pct >= 0 ? '#00cc44' : '#f87171';
    const changeSign  = data.change_pct >= 0 ? '+' : '';
    const trendColor  = data.trend_5d === '상승' ? '#00cc44' : data.trend_5d === '하락' ? '#f87171' : '#f59e0b';
    const volColor    = data.volume_trend === '증가' ? '#00cc44' : data.volume_trend === '감소' ? '#f87171' : '#f59e0b';

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ padding: 20, background: '#0f172a', borderRadius: 8, border: '1px solid #1e3a5f', textAlign: 'center' }}>
                {data.ticker && <p style={{ color: '#6b7280', fontSize: 12, margin: '0 0 4px' }}>{data.ticker}</p>}
                <p style={{ color: '#fff', fontSize: 32, fontWeight: 'bold', margin: '0 0 4px' }}>
                    {data.current_price.toLocaleString()}
                </p>
                <p style={{ color: changeColor, fontSize: 18, fontWeight: 'bold', margin: 0 }}>
                    {changeSign}{data.change_pct}%
                </p>
                <p style={{ color: '#6b7280', fontSize: 12, margin: '4px 0 0' }}>전일 {data.prev_close.toLocaleString()}</p>
            </div>

            <SectionCard title="최근 5거래일 (15분봉)" color="#f59e0b">
                <FinRow label="5일 고가"   value={data.high_5d.toLocaleString()} color="#f87171" />
                <FinRow label="5일 저가"   value={data.low_5d.toLocaleString()}  color="#00cc44" />
                <FinRow label="5일 추세"   value={data.trend_5d}   color={trendColor} />
                <FinRow label="거래량 추세" value={data.volume_trend} color={volColor} />
            </SectionCard>

            <SectionCard title="52주 범위" color="#a78bfa">
                <FinRow label="52주 고가" value={data.week52_high?.toLocaleString() ?? '-'} color="#f87171" />
                <FinRow label="52주 저가" value={data.week52_low?.toLocaleString()  ?? '-'} color="#00cc44" />
                {data.week52_high && data.week52_low && (
                    <div style={{ marginTop: 12 }}>
                        <div style={{ background: '#1f2937', borderRadius: 4, height: 6, position: 'relative' }}>
                            <div style={{
                                position: 'absolute',
                                left: `${((data.current_price - data.week52_low) / (data.week52_high - data.week52_low)) * 100}%`,
                                top: '50%', transform: 'translate(-50%, -50%)',
                                width: 12, height: 12, borderRadius: '50%',
                                background: '#a78bfa', border: '2px solid #fff',
                            }} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                            <span style={{ color: '#6b7280', fontSize: 11 }}>{data.week52_low.toLocaleString()}</span>
                            <span style={{ color: '#6b7280', fontSize: 11 }}>{data.week52_high.toLocaleString()}</span>
                        </div>
                    </div>
                )}
            </SectionCard>

            {data.market_cap_억원 && (
                <SectionCard title="시가총액" color="#888">
                    <p style={{ color: '#e2e8f0', fontSize: 18, fontWeight: 'bold', margin: 0, textAlign: 'center' }}>
                        {data.market_cap_억원.toLocaleString()}억원
                    </p>
                </SectionCard>
            )}

            <p style={{ color: '#4b5563', fontSize: 11, textAlign: 'center', margin: 0 }}>
                15분봉 데이터 · 실시간이 아닐 수 있습니다
            </p>
        </div>
    );
}

// ══════════════════════════════════════════════════════════
// 공시 탭
// ══════════════════════════════════════════════════════════
function DisclosureTab({ data }: { data: Disclosure[] }) {
    if (!data.length) return <Empty text="최근 1년간 주요 공시가 없습니다" />;
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {data.map((d) => (
                <div key={d.rcept_no} style={{ padding: '12px 14px', background: '#111827', borderRadius: 8, border: '1px solid #1f2937' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                        <p style={{ color: '#e2e8f0', fontSize: 13, margin: 0, flex: 1 }}>{d.title}</p>
                        <span style={{ color: '#6b7280', fontSize: 11, whiteSpace: 'nowrap' }}>{formatDisclosureDate(d.date)}</span>
                    </div>
                </div>
            ))}
        </div>
    );
}

// ══════════════════════════════════════════════════════════
// 주주 탭
// ══════════════════════════════════════════════════════════
function ShareholderTab({ data }: { data: Shareholder[] }) {
    if (!data || !data.length) return <Empty text="주주 현황 정보가 없습니다" />;
    const filtered = data.filter((s) => s.name && s.name.trim() !== '계');
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtered.map((s, i) => (
                <div key={i} style={{ padding: '12px 14px', background: '#111827', borderRadius: 8, border: '1px solid #1f2937' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <p style={{ color: '#fff', fontSize: 14, margin: '0 0 2px', fontWeight: 'bold' }}>{s.name}</p>
                            <p style={{ color: '#6b7280', fontSize: 12, margin: 0 }}>{s.relation}</p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <p style={{ color: '#60a5fa', fontSize: 16, margin: '0 0 2px', fontWeight: 'bold' }}>{s.ratio}%</p>
                            <p style={{ color: '#6b7280', fontSize: 11, margin: 0 }}>{Number(s.shares?.replace(/,/g, '')).toLocaleString()}주</p>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

// ══════════════════════════════════════════════════════════
// 배당 탭
// ══════════════════════════════════════════════════════════
function DividendTab({ data }: { data: Dividend[] }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (!canvasRef.current || !data.length) return;
        const existing = Chart.getChart(canvasRef.current);
        if (existing) existing.destroy();

        const sorted = [...data].sort((a, b) => Number(a.year) - Number(b.year));
        const chart  = new Chart(canvasRef.current, {
            type: 'line',
            data: {
                labels: sorted.map((d) => `${d.year}년`),
                datasets: [{
                    label: '배당금 총액 (백만원)',
                    data: sorted.map((d) => d.total_dividend ? Number(d.total_dividend.replace(/,/g, '')) : 0),
                    borderColor: '#a78bfa', backgroundColor: 'rgba(167,139,250,0.15)',
                    pointBackgroundColor: '#a78bfa', tension: 0.3, fill: true,
                }],
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { labels: { color: '#9ca3af', font: { size: 11 } } },
                    tooltip: { callbacks: { label: (ctx) => `배당금: ${Number(ctx.raw).toLocaleString()}백만원` } },
                },
                scales: {
                    x: { ticks: { color: '#9ca3af' }, grid: { color: '#1f2937' } },
                    y: { ticks: { color: '#9ca3af', callback: (v) => `${Number(v).toLocaleString()}` }, grid: { color: '#1f2937' } },
                },
            },
        });
        return () => { chart.destroy(); };
    }, [data]);

    if (!data.length) return <Empty text="배당 현황 정보가 없습니다" />;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <SectionCard title="배당금 추이" color="#a78bfa">
                <canvas ref={canvasRef} style={{ width: '100%' }} />
            </SectionCard>
            {[...data].sort((a, b) => Number(b.year) - Number(a.year)).map((d) => (
                <SectionCard key={d.year} title={`${d.year}년 배당`} color="#a78bfa">
                    <FinRow label="배당금 총액" value={d.total_dividend ? `${Number(d.total_dividend.replace(/,/g, '')).toLocaleString()}백만원` : '-'} />
                    <FinRow label="배당 성향"   value={d.dividend_ratio  ? `${d.dividend_ratio}%`  : '-'} />
                    <FinRow label="배당 수익률" value={d.dividend_yield  ? `${d.dividend_yield}%`  : '-'} />
                    <FinRow label="주당 배당금" value={d.dividend_per_share ? `${Number(d.dividend_per_share.replace(/,/g, '')).toLocaleString()}원` : '-'} />
                </SectionCard>
            ))}
        </div>
    );
}

// ══════════════════════════════════════════════════════════
// 인사이트 탭
// ══════════════════════════════════════════════════════════
function InsightTab({ insight, news }: { insight?: Insight; news?: SectorNews[] }) {
    if (!insight || (insight as any).error) return <Empty text="인사이트를 불러올 수 없습니다" />;

    const { score } = insight;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ padding: 16, background: '#0f172a', borderRadius: 8, border: '1px solid #1e3a5f' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <h4 style={{ color: '#60a5fa', margin: 0, fontSize: 14 }}>종합 점수</h4>
                    <span style={{ color: '#fff', fontSize: 28, fontWeight: 'bold' }}>{score.total}점</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <ScoreBar label="수익성"  value={score.profitability} max={25} color="#00cc44" />
                    <ScoreBar label="안정성"  value={score.stability}    max={25} color="#60a5fa" />
                    <ScoreBar label="성장성"  value={score.growth}       max={25} color="#f59e0b" />
                    <ScoreBar label="현금흐름" value={score.cashflow}    max={25} color="#a78bfa" />
                </div>
            </div>

            <SectionCard title="한줄 요약"        color="#00cc44"><p style={{ color: '#e2e8f0', fontSize: 14, margin: 0, lineHeight: 1.6 }}>{insight.summary}</p></SectionCard>
            <SectionCard title="지금 섹터 분위기"  color="#f59e0b"><p style={{ color: '#e2e8f0', fontSize: 14, margin: 0, lineHeight: 1.6 }}>{insight.sector_trend}</p></SectionCard>
            <SectionCard title="수익성"           color="#00cc44"><p style={{ color: '#e2e8f0', fontSize: 14, margin: 0, lineHeight: 1.6 }}>{insight.profitability}</p></SectionCard>
            <SectionCard title="안정성"           color="#60a5fa"><p style={{ color: '#e2e8f0', fontSize: 14, margin: 0, lineHeight: 1.6 }}>{insight.stability}</p></SectionCard>
            <SectionCard title="성장성"           color="#f59e0b"><p style={{ color: '#e2e8f0', fontSize: 14, margin: 0, lineHeight: 1.6 }}>{insight.growth}</p></SectionCard>
            <SectionCard title="긍정 포인트"       color="#00cc44"><p style={{ color: '#e2e8f0', fontSize: 14, margin: 0, lineHeight: 1.6 }}>{insight.positive}</p></SectionCard>

            {insight.price_analysis && (
                <SectionCard title="📈 주가 흐름 분석" color="#a78bfa">
                    <p style={{ color: '#e2e8f0', fontSize: 14, margin: 0, lineHeight: 1.6 }}>{insight.price_analysis}</p>
                </SectionCard>
            )}

            <SectionCard title="리스크" color="#f87171"><p style={{ color: '#e2e8f0', fontSize: 14, margin: 0, lineHeight: 1.6 }}>{insight.risk}</p></SectionCard>

            {news && news.length > 0 && (
                <SectionCard title="관련 뉴스" color="#888">
                    {news.map((n, i) => (
                        <div key={i} style={{ padding: '10px 0', borderBottom: '1px solid #1f2937' }}>
                            <p style={{ color: '#e2e8f0', fontSize: 13, margin: '0 0 4px' }}>{n.title}</p>
                            <p style={{ color: '#6b7280', fontSize: 11, margin: 0 }}>{n.pubDate.slice(0, 16)}</p>
                        </div>
                    ))}
                </SectionCard>
            )}

            <p style={{ color: '#4b5563', fontSize: 11, textAlign: 'center', margin: 0 }}>
                본 인사이트는 AI 생성 참고용입니다. 투자 결정의 책임은 본인에게 있습니다.
            </p>
        </div>
    );
}

// ══════════════════════════════════════════════════════════
// 공통 서브 컴포넌트
// ══════════════════════════════════════════════════════════
function ScoreBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
    const pct = Math.round((value / max) * 100);
    return (
        <div style={{ background: '#111827', borderRadius: 8, padding: '10px 12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ color: '#9ca3af', fontSize: 12 }}>{label}</span>
                <span style={{ color, fontSize: 12, fontWeight: 'bold' }}>{value}/{max}</span>
            </div>
            <div style={{ background: '#1f2937', borderRadius: 4, height: 6 }}>
                <div style={{ background: color, width: `${pct}%`, height: '100%', borderRadius: 4, transition: 'width 0.3s' }} />
            </div>
        </div>
    );
}

function SectionCard({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
    return (
        <div style={{ padding: 16, background: '#111827', borderRadius: 8, border: `1px solid ${color}33` }}>
            <h4 style={{ color, margin: '0 0 12px', fontSize: 14 }}>{title}</h4>
            {children}
        </div>
    );
}

function FinRow({ label, value, color }: { label: string; value?: string; color?: string }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #1f2937' }}>
            <span style={{ color: '#6b7280', fontSize: 13 }}>{label}</span>
            <span style={{ color: color ?? '#e2e8f0', fontSize: 13, fontWeight: 'bold' }}>{value ?? '-'}</span>
        </div>
    );
}

function InfoRow({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <p style={{ color: '#6b7280', fontSize: 11, margin: '0 0 2px' }}>{label}</p>
            <p style={{ color: '#e2e8f0', fontSize: 13, margin: 0 }}>{value}</p>
        </div>
    );
}

function Empty({ text }: { text: string }) {
    return (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <p style={{ color: '#6b7280', fontSize: 14, margin: 0 }}>{text}</p>
        </div>
    );
}
