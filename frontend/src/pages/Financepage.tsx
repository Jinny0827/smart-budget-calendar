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
    return raw >= 0 ? '#22c55e' : '#ef4444'; // Tailwind green-500, red-500
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

    // 쿨 다운 관련 상태 값 추가
    const [refreshCooldownEnd, setRefreshCooldownEnd] = useState<number | null>(null);
    const [cooldownText, setCooldownText] = useState('');
    
    // 종목 등록 모달
    const [showModal,   setShowModal]   = useState(false);
    const [refreshKey,  setRefreshKey]  = useState(0);

    // 환율 상태 추가
    const [usdKrw, setUsdKrw] = useState<number | null>(null);

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
    
    // 쿨다운 타이머를 위한 useEffect 추가
    useEffect(() => {
        if (!refreshCooldownEnd) {
            setCooldownText('');
            return;
        }

        const interval = setInterval(()=> {
            const now = Date.now();
            const timeLeft = Math.round((refreshCooldownEnd - now) / 1000);

            if(timeLeft <= 0) {
                setRefreshCooldownEnd(null);
            } else {
                const minutes = Math.floor(timeLeft / 60);
                const seconds = timeLeft % 60;

                setCooldownText(`(${minutes}:${seconds.toString().padStart(2, '0')})`);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [refreshCooldownEnd]);

    useEffect(() => {
        fetch(`${API_BASE}/exchange-rate`)
            .then(r => r.ok ? r.json() : null)
            .then(d => { if (d?.usdKrw) setUsdKrw(d.usdKrw); })
            .catch(() => {});
    }, [])

    // 렌더링 시 사용할 변수
    const isRefreshing = refreshCooldownEnd !== null;

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
        <div className="bg-white rounded-lg shadow p-6 flex flex-col h-full">

            {/* ── 헤더 ── */}
            <div className="flex items-center justify-between pb-4 mb-4">
                <h2 className="text-2xl font-bold text-gray-900">주식 분석</h2>
                {pageTab === 'analyze' && step === 'result' &&
                    (<button onClick={handleReset} className="text-blue-600 text-sm hover:underline">다시 검색</button>)
                }
            </div>

            {/* ── 페이지 탭: py-3으로 터치 타겟 확보 (모바일 최소 44px) ── */}
            <div className="flex border-b border-gray-200 mb-4">
                {([['mystock', '내 종목'], ['analyze', '기업 분석']] as const).map(([key, label]) => (
                    <button
                        key={key}
                        onClick={() => setPageTab(key)}
                        className={`flex-1 sm:flex-none px-4 py-3 text-sm font-medium ${
                            pageTab === key ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-blue-600 border-b-2 border-transparent'
                        }`}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {/* ── 탭 콘텐츠 영역 (이 부분이 남은 공간을 채우도록 수정) ── */}
            <div className="flex-1 flex flex-col">
                {pageTab === 'mystock' && (
                    <StockList
                        onRegisterClick={() => setPageTab('analyze')}
                        refreshKey={refreshKey}
                    />
                )}

                {pageTab === 'analyze' && (
                    <div className="flex-1 flex flex-col">

                        {/* 검색 화면 */}
                        {step === 'search' && (
                            <div className="p-4 flex-1 flex flex-col gap-4">

                                {/* 마켓 토글 */}
                                <div className="flex bg-gray-100 rounded-lg p-1 gap-1">
                                    {([['kr', '🇰🇷 한국'], ['us', '🇺🇸 미국']] as const).map(([key, label]) => (
                                        <button
                                            key={key}
                                            onClick={() => { setMarket(key); setQuery(''); setSuggestions([]); }}
                                            className={`flex-1 py-2 text-sm rounded-md ${
                                                market === key ? 'bg-blue-600 text-white font-semibold' : 'text-gray-700 hover:bg-gray-200'
                                            }`}
                                        >
                                            {label}
                                        </button>
                                    ))}
                                </div>

                                <p className="text-gray-500 text-sm">
                                    {market === 'us' ? '회사명 또는 티커를 입력하세요' : '회사명 또는 종목코드를 입력하세요'}
                                </p>

                                {/* 검색 입력 */}
                                <div className="relative">
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
                                        className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />

                                    {suggestions.length > 0 && (
                                        <div className="absolute top-full left-0 right-0 z-10 bg-white border border-gray-300 rounded-lg mt-1 overflow-hidden shadow-lg">
                                            {suggestions.map((name, idx) => (
                                                <button
                                                    key={name}
                                                    onMouseDown={() => { setQuery(name); setSuggestions([]); setSelectedIndex(-1); }}
                                                    onMouseEnter={() => setSelectedIndex(idx)}
                                                    onMouseLeave={() => setSelectedIndex(-1)}
                                                    className={`block w-full px-4 py-3 text-sm text-gray-800 text-left hover:bg-gray-100 ${selectedIndex === idx ? 'bg-gray-100' : ''} border-b border-gray-200 last:border-b-0`}
                                                >
                                                    {name}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* 사업연도 */}
                                <div className="flex items-center gap-2">
                                    <span className="text-gray-500 text-sm">사업연도</span>
                                    <select
                                        value={year}
                                        onChange={(e) => setYear(e.target.value)}
                                        className="p-2 border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        {Array.from({ length: 5 }, (_, i) => String(new Date().getFullYear() - 1 - i))
                                            .map((y) => <option key={y} value={y}>{y}년</option>)}
                                    </select>
                                </div>

                                {error && <p className="text-red-500 text-sm mt-0">{error}</p>}

                                <button
                                    onClick={() => {
                                        handleSearch();
                                    }}
                                    disabled={!query.trim()}
                                    className="mt-4 w-full py-3 bg-blue-600 text-white rounded-lg text-base font-bold hover:bg-blue-700 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
                                >
                                    주식 분석 시작
                                </button>

                                {/* 예시 버튼 */}
                                <div className="mt-4">
                                    <p className="text-gray-500 text-xs mb-2">예시</p>
                                    <div className="flex flex-wrap gap-2">
                                        {(market === 'us'
                                            ? ['테슬라', '애플', '엔비디아', '알파벳']
                                            : ['삼성전자', 'SK하이닉스', '카카오', 'NAVER']
                                        ).map((name) => (
                                            <button
                                                key={name}
                                                onClick={() => setQuery(name)}
                                                className="px-3 py-1.5 bg-gray-100 text-gray-700 border border-gray-300 rounded-full text-sm hover:bg-gray-200"
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
                            <div className="flex-1 flex flex-col items-center justify-center gap-4 py-12">
                                <div className="text-blue-500 text-4xl">📊</div>
                                <p className="text-gray-900 text-base font-medium">{query} 분석 중...</p>
                                <p className="text-gray-500 text-sm">데이터를 가져오고 있어요</p>
                            </div>
                        )}

                        {/* 결과 화면 */}
                        {step === 'result' && result && (
                            <div className="flex-1 flex flex-col">

                                <CompanyCard info={result.company_info} />

                                {/* 종목 추가 버튼 */}
                                <div className="px-4 pb-2">
                                    <button
                                        onClick={() => setShowModal(true)}
                                        className="w-full py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700"
                                    >
                                        ＋ 내 종목에 추가
                                    </button>
                                </div>

                                {/* 분석 탭 메뉴 */}
                                <div className="flex border-b border-gray-200 overflow-x-auto whitespace-nowrap">
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
                                            className={`flex-shrink-0 px-3 py-3 text-xs font-medium ${
                                                tab === key ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-blue-600 border-b-2 border-transparent'
                                            }`}
                                        >
                                            {label}
                                        </button>
                                    ))}
                                </div>

                                {/* 탭 컨텐츠 */}
                                <div className="p-4 flex-1">
                                    {tab === 'financial'   && <FinancialTab data={result.financial} baseYear={year} />}
                                    {tab === 'stock'       && <StockTab data={result.stock_data} />}
                                    {tab === 'disclosure'  && <DisclosureTab data={result.disclosures} />}
                                    {tab === 'shareholder' && <ShareholderTab data={result.shareholders?.shareholders ?? []} />}
                                    {tab === 'dividend'    && <DividendTab data={result.dividend ?? []} />}
                                    {tab === 'insight'     && <InsightTab insight={result.insight} news={result.sector_news} />}
                                </div>

                                <div className="p-4 border-t border-gray-200 flex flex-col items-center gap-2">
                                    <button
                                        onClick={() => {
                                            handleSearch(true);
                                            // 5분 (300,000 밀리초) 후로 쿨다운 설정
                                            setRefreshCooldownEnd(Date.now() + 300000);
                                        }}
                                        disabled={isRefreshing}
                                        className={`px-3.5 py-1.5 border border-gray-300 rounded-md text-gray-600 text-xs hover:bg-gray-50 ${isRefreshing ? 'opacity-60 cursor-not-allowed' : ''}`}
                                    >
                                        🔄 데이터 새로고침 {cooldownText}
                                    </button>
                                    <p className="text-gray-500 text-xs text-center mt-0">
                                        본 서비스는 투자 참고용입니다. 투자 결정에 대한 책임은 본인에게 있습니다.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ── 종목 등록 모달 ── */}
            {showModal && result && (
                <StockRegisterModal
                    result={result}
                    onClose={() => setShowModal(false)}
                    onRegister={handleRegister}
                    usdKrw={usdKrw ?? undefined}
                />
            )}
        </div>
    );
}

// ... (The rest of the sub-components remain the same)
// ══════════════════════════════════════════════════════════
// 기업 개요 카드
// ══════════════════════════════════════════════════════════
function CompanyCard({ info }: { info: CompanyInfo }) {
    const isUs = info.market === 'US';
    return (
        <div className="m-4 p-4 bg-white rounded-lg shadow border border-gray-200">
            <div className="flex justify-between items-start">
                <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-1">{info.corp_name}</h3>
                    <span className="text-gray-500 text-xs">
                        {isUs ? `${info.ticker} · ${info.exchange}` : `종목코드 ${info.stock_code}`}
                    </span>
                </div>
                <span className="bg-blue-100 text-blue-600 px-2.5 py-1 rounded-full text-xs">
                    {isUs ? info.sic_description : `업종 ${info.induty_code}`}
                </span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
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
        <div className="flex flex-col gap-4">
            <SectionCard title="손익계산서 (3개년)" color="#22c55e"> {/* green-500 */}
                <IncomeChart data={data} years={years} />
                <div className="mt-3">
                    <FinRow label="매출액"   value={latest?.income_statement.revenue?.표시} />
                    <FinRow label="영업이익" value={latest?.income_statement.operating_profit?.표시} color={getColor(latest?.income_statement.operating_profit?.raw)} />
                    <FinRow label="순이익"   value={latest?.income_statement.net_income?.표시}       color={getColor(latest?.income_statement.net_income?.raw)} />
                </div>
            </SectionCard>

            <SectionCard title="재무상태표" color="#3b82f6"> {/* blue-500 */}
                <BalanceChart data={latest?.balance_sheet} />
                <div className="mt-3">
                    <FinRow label="자산총계" value={latest?.balance_sheet.total_assets?.표시} />
                    <FinRow label="부채총계" value={latest?.balance_sheet.total_liabilities?.표시} />
                    <FinRow label="자본총계" value={latest?.balance_sheet.total_equity?.표시} />
                    <FinRow label="유동자산" value={latest?.balance_sheet.current_assets?.표시} />
                    <FinRow label="유동부채" value={latest?.balance_sheet.current_liabilities?.표시} />
                </div>
            </SectionCard>

            <SectionCard title="현금흐름표 (3개년)" color="#f59e0b"> {/* amber-500 */}
                <CashFlowChart data={data} years={years} />
                <div className="mt-3">
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
                    { label: '매출액',   data: revenue,  backgroundColor: '#1e40af' }, // blue-800
                    { label: '영업이익', data: opProfit, backgroundColor: '#22c55e' }, // green-500
                    { label: '순이익',   data: net,      backgroundColor: '#3b82f6' }, // blue-500
                ],
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { labels: { color: '#4b5563', font: { size: 11 } } }, // gray-700
                    tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${Number(ctx.raw).toLocaleString()}${unit}` } },
                },
                scales: {
                    x: { ticks: { color: '#4b5563' }, grid: { color: '#e5e7eb' } }, // gray-700, gray-200
                    y: { ticks: { color: '#4b5563', callback: (v) => `${Number(v).toLocaleString()}${unit}` }, grid: { color: '#e5e7eb' } }, // gray-700, gray-200
                },
            },
        });
        return () => { chart.destroy(); };
    }, [data, years]);

    return <canvas ref={canvasRef} className="w-full" />;
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
                    backgroundColor: ['#ef4444', '#22c55e'], // red-500, green-500
                    borderColor: '#ffffff', borderWidth: 2, // white
                }],
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { labels: { color: '#4b5563', font: { size: 11 } } }, // gray-700
                    tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${Number(ctx.raw).toLocaleString()}` } },
                },
            },
        });
        return () => { chart.destroy(); };
    }, [data]);

    return <div className="max-w-xs mx-auto"><canvas ref={canvasRef} /></div>;
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
                    { label: '영업활동', data: years.map((y) => getChartValue(data[y]?.cash_flow.operating_cf)), backgroundColor: '#f59e0b' }, // amber-500
                    { label: '투자활동', data: years.map((y) => getChartValue(data[y]?.cash_flow.investing_cf)), backgroundColor: '#3b82f6' }, // blue-500
                    { label: '재무활동', data: years.map((y) => getChartValue(data[y]?.cash_flow.financing_cf)), backgroundColor: '#a78bfa' }, // violet-400
                ],
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { labels: { color: '#4b5563', font: { size: 11 } } }, // gray-700
                    tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${Number(ctx.raw).toLocaleString()}${unit}` } },
                },
                scales: {
                    x: { ticks: { color: '#4b5563' }, grid: { color: '#e5e7eb' } }, // gray-700, gray-200
                    y: { ticks: { color: '#4b5563', callback: (v) => `${Number(v).toLocaleString()}${unit}` }, grid: { color: '#e5e7eb' } }, // gray-700, gray-200
                },
            },
        });
        return () => { chart.destroy(); };
    }, [data, years]);

    return <canvas ref={canvasRef} className="w-full" />;
}

// ══════════════════════════════════════════════════════════
// 주가 탭
// ══════════════════════════════════════════════════════════
function StockTab({ data }: { data?: StockData }) {
    if (!data) return <Empty text="주가 데이터를 불러올 수 없습니다" />;

    const changeColor = data.change_pct >= 0 ? '#22c55e' : '#ef4444'; // green-500, red-500
    const changeSign  = data.change_pct >= 0 ? '+' : '';
    const trendColor  = data.trend_5d === '상승' ? '#22c55e' : data.trend_5d === '하락' ? '#ef4444' : '#f59e0b'; // green-500, red-500, amber-500
    const volColor    = data.volume_trend === '증가' ? '#22c55e' : data.volume_trend === '감소' ? '#ef4444' : '#f59e0b'; // green-500, red-500, amber-500

    return (
        <div className="flex flex-col gap-4">
            <div className="p-5 bg-white rounded-lg shadow border border-gray-200 text-center">
                {data.ticker && <p className="text-gray-600 text-xs mb-1">{data.ticker}</p>}
                <p className="text-3xl font-bold text-gray-900 mb-1">
                    {data.current_price.toLocaleString()}
                </p>
                <p style={{ color: changeColor }} className="text-lg font-bold mb-0">
                    {changeSign}{data.change_pct}%
                </p>
                <p className="text-gray-600 text-xs mt-1">전일 {data.prev_close.toLocaleString()}</p>
            </div>

            <SectionCard title="최근 5거래일 (15분봉)" color="#f59e0b"> {/* amber-500 */}
                <FinRow label="5일 고가"   value={data.high_5d.toLocaleString()} color="#ef4444" /> {/* red-500 */}
                <FinRow label="5일 저가"   value={data.low_5d.toLocaleString()}  color="#22c55e" /> {/* green-500 */}
                <FinRow label="5일 추세"   value={data.trend_5d}   color={trendColor} />
                <FinRow label="거래량 추세" value={data.volume_trend} color={volColor} />
            </SectionCard>

            <SectionCard title="52주 범위" color="#a78bfa"> {/* violet-400 */}
                <FinRow label="52주 고가" value={data.week52_high?.toLocaleString() ?? '-'} color="#ef4444" /> {/* red-500 */}
                <FinRow label="52주 저가" value={data.week52_low?.toLocaleString()  ?? '-'} color="#22c55e" /> {/* green-500 */}
                {data.week52_high && data.week52_low && (
                    <div className="mt-3">
                        <div className="bg-gray-200 rounded-md h-1.5 relative">
                            <div style={{
                                position: 'absolute',
                                left: `${((data.current_price - data.week52_low) / (data.week52_high - data.week52_low)) * 100}%`,
                                top: '50%', transform: 'translate(-50%, -50%)',
                                width: 12, height: 12, borderRadius: '50%',
                                background: '#a78bfa', border: '2px solid #fff',
                            }} />
                        </div>
                        <div className="flex justify-between mt-1">
                            <span className="text-gray-600 text-xs">{data.week52_low.toLocaleString()}</span>
                            <span className="text-gray-600 text-xs">{data.week52_high.toLocaleString()}</span>
                        </div>
                    </div>
                )}
            </SectionCard>

            {data.market_cap_억원 && (
                <SectionCard title="시가총액" color="#6b7280"> {/* gray-600 */}
                    <p className="text-lg font-bold text-gray-900 text-center mb-0">
                        {data.market_cap_억원.toLocaleString()}억원
                    </p>
                </SectionCard>
            )}

            <p className="text-gray-600 text-xs text-center mt-0">
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
        <div className="flex flex-col gap-2">
            {data.map((d) => (
                <div key={d.rcept_no} className="p-3.5 bg-white rounded-lg border border-gray-200">
                    <div className="flex justify-between items-start gap-2">
                        <p className="text-gray-800 text-sm mb-0 flex-1">{d.title}</p>
                        <span className="text-gray-600 text-xs whitespace-nowrap">{formatDisclosureDate(d.date)}</span>
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
        <div className="flex flex-col gap-2">
            {filtered.map((s, i) => (
                <div key={i} className="p-3.5 bg-white rounded-lg border border-gray-200">
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="text-base font-bold text-gray-900 mb-0.5">{s.name}</p>
                            <p className="text-gray-600 text-sm mb-0">{s.relation}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-blue-600 text-lg font-bold mb-0.5">{s.ratio}%</p>
                            <p className="text-gray-600 text-xs mb-0">{Number(s.shares?.replace(/,/g, '')).toLocaleString()}주</p>
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
                    borderColor: '#a78bfa', backgroundColor: 'rgba(167,139,250,0.15)', // violet-400
                    pointBackgroundColor: '#a78bfa', tension: 0.3, fill: true,
                }],
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { labels: { color: '#4b5563', font: { size: 11 } } }, // gray-700
                    tooltip: { callbacks: { label: (ctx) => `배당금: ${Number(ctx.raw).toLocaleString()}백만원` } },
                },
                scales: {
                    x: { ticks: { color: '#4b5563' }, grid: { color: '#e5e7eb' } }, // gray-700, gray-200
                    y: { ticks: { color: '#4b5563', callback: (v) => `${Number(v).toLocaleString()}` }, grid: { color: '#e5e7eb' } }, // gray-700, gray-200
                },
            },
        });
        return () => { chart.destroy(); };
    }, [data]);

    if (!data.length) return <Empty text="배당 현황 정보가 없습니다" />;

    return (
        <div className="flex flex-col gap-4">
            <SectionCard title="배당금 추이" color="#a78bfa"> {/* violet-400 */}
                <canvas ref={canvasRef} className="w-full" />
            </SectionCard>
            {[...data].sort((a, b) => Number(b.year) - Number(a.year)).map((d) => (
                <SectionCard key={d.year} title={`${d.year}년 배당`} color="#a78bfa"> {/* violet-400 */}
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
        <div className="flex flex-col gap-4">
            <div className="p-4 bg-white rounded-lg shadow border border-gray-200">
                <div className="flex justify-between items-center mb-3">
                    <h4 className="text-blue-600 text-base font-semibold mb-0">종합 점수</h4>
                    <span className="text-3xl font-bold text-gray-900">{score.total}점</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <ScoreBar label="수익성"  value={score.profitability} max={25} color="#22c55e" /> {/* green-500 */}
                    <ScoreBar label="안정성"  value={score.stability}    max={25} color="#3b82f6" /> {/* blue-500 */}
                    <ScoreBar label="성장성"  value={score.growth}       max={25} color="#f59e0b" /> {/* amber-500 */}
                    <ScoreBar label="현금흐름" value={score.cashflow}    max={25} color="#a78bfa" /> {/* violet-400 */}
                </div>
            </div>

            <SectionCard title="한줄 요약"        color="#22c55e"><p className="text-gray-800 text-sm mb-0 leading-relaxed">{insight.summary}</p></SectionCard>
            <SectionCard title="지금 섹터 분위기"  color="#f59e0b"><p className="text-gray-800 text-sm mb-0 leading-relaxed">{insight.sector_trend}</p></SectionCard>
            <SectionCard title="수익성"           color="#22c55e"><p className="text-gray-800 text-sm mb-0 leading-relaxed">{insight.profitability}</p></SectionCard>
            <SectionCard title="안정성"           color="#3b82f6"><p className="text-gray-800 text-sm mb-0 leading-relaxed">{insight.stability}</p></SectionCard>
            <SectionCard title="성장성"           color="#f59e0b"><p className="text-gray-800 text-sm mb-0 leading-relaxed">{insight.growth}</p></SectionCard>
            <SectionCard title="긍정 포인트"       color="#22c55e"><p className="text-gray-800 text-sm mb-0 leading-relaxed">{insight.positive}</p></SectionCard>

            {insight.price_analysis && (
                <SectionCard title="📈 주가 흐름 분석" color="#a78bfa"> {/* violet-400 */}
                    <p className="text-gray-800 text-sm mb-0 leading-relaxed">{insight.price_analysis}</p>
                </SectionCard>
            )}

            <SectionCard title="리스크" color="#ef4444"><p className="text-gray-800 text-sm mb-0 leading-relaxed">{insight.risk}</p></SectionCard>

            {news && news.length > 0 && (
                <SectionCard title="관련 뉴스" color="#6b7280"> {/* gray-600 */}
                    {news.map((n, i) => (
                        <div key={i} className="py-2.5 border-b border-gray-200 last:border-b-0">
                            <p className="text-gray-800 text-sm mb-1">{n.title}</p>
                            <p className="text-gray-600 text-xs mb-0">{n.pubDate.slice(0, 16)}</p>
                        </div>
                    ))}
                </SectionCard>
            )}

            <p className="text-gray-500 text-xs text-center mt-0">
                본 인사이트는 AI 생성 참고용입니다. 투자 결정에 대한 책임은 본인에게 있습니다.
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
        <div className="bg-gray-50 rounded-lg p-2.5">
            <div className="flex justify-between mb-1.5">
                <span className="text-gray-600 text-xs">{label}</span>
                <span style={{ color }} className="text-xs font-bold">{value}/{max}</span>
            </div>
            <div className="bg-gray-200 rounded-md h-1.5">
                <div style={{ background: color, width: `${pct}%` }} className="h-full rounded-md transition-all duration-300" />
            </div>
        </div>
    );
}

function SectionCard({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
    return (
        <div className="p-4 bg-white rounded-lg shadow border border-gray-200">
            <h4 style={{ color }} className="text-base font-semibold mb-3">{title}</h4>
            {children}
        </div>
    );
}

function FinRow({ label, value, color }: { label: string; value?: string; color?: string }) {
    return (
        <div className="flex justify-between py-1.5 border-b border-gray-200 last:border-b-0">
            <span className="text-gray-600 text-sm">{label}</span>
            <span style={{ color: color ?? '#1f2937' }} className="text-sm font-semibold">{value ?? '-'}</span>
        </div>
    );
}

function InfoRow({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <p className="text-gray-500 text-xs mb-0.5">{label}</p>
            <p className="text-gray-800 text-sm mt-0">{value}</p>
        </div>
    );
}

function Empty({ text }: { text: string }) {
    return (
        <div className="text-center py-10">
            <p className="text-gray-500 text-sm">{text}</p>
        </div>
    );
}
