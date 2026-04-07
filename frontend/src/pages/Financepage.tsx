import { useState, useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';

// ── 상수 ──────────────────────────────────────────────────
const API_BASE = import.meta.env.VITE_FINANCE_API_URL
    ?? 'https://api.finance.bowling-manager.com';

// ── 타입 ──────────────────────────────────────────────────
interface CompanyInfo {
    corp_name: string;
    corp_code: string;
    stock_code: string;
    ceo_nm: string;
    induty_code: string;
    est_dt: string;
    listing_dt: string | null;
}

interface AmountData {
    raw: number;
    억원: number;
    표시: string;
}

interface IncomeStatement {
    revenue?: AmountData;
    operating_profit?: AmountData;
    net_income?: AmountData;
}

interface BalanceSheet {
    total_assets?: AmountData;
    total_liabilities?: AmountData;
    total_equity?: AmountData;
    current_assets?: AmountData;
    current_liabilities?: AmountData;
}

interface CashFlow {
    operating_cf?: AmountData;
    investing_cf?: AmountData;
    financing_cf?: AmountData;
}

interface YearFinancial {
    income_statement: IncomeStatement;
    balance_sheet: BalanceSheet;
    cash_flow: CashFlow;
}

interface Disclosure {
    date: string;
    title: string;
    rcept_no: string;
}

interface Shareholder {
    name: string;
    relation: string;
    stock_type: string;
    shares: string;
    ratio: string;
}

interface Dividend {
    year: string;
    dividend_per_share?: string;
    total_dividend?: string;
    dividend_ratio?: string;
    dividend_yield?: string;
}

interface SectorNews {
    title: string;
    pubDate: string;
    description: string;
}

interface Insight {
    summary: string;
    profitability: string;
    stability: string;
    growth: string;
    sector_trend: string;
    risk: string;
    positive: string;
    score: {
        total: number;
        profitability: number;
        stability: number;
        growth: number;
        cashflow: number;
    };
}

interface AnalyzeResult {
    company_info: CompanyInfo;
    financial: Record<string, YearFinancial>;
    disclosures: Disclosure[];
    shareholders: { shareholders: Shareholder[] };
    dividend: Dividend[];
    insight?: Insight;
    sector_news?: SectorNews[];
}



type Step = 'search' | 'loading' | 'result';
type TabKey = 'financial' | 'disclosure' | 'shareholder' | 'dividend' | 'insight';

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

// ── 메인 컴포넌트 ──────────────────────────────────────────
export default function FinancePage() {
    const [step,   setStep]   = useState<Step>('search');
    const [query,  setQuery]  = useState('');
    const [year,   setYear]   = useState(String(new Date().getFullYear() - 1));
    const [result, setResult] = useState<AnalyzeResult | null>(null);
    const [error,  setError]  = useState<string | null>(null);
    const [tab,    setTab]    = useState<TabKey>('financial');

    // ── API 호출 ──
    const handleSearch = async () => {
        if (!query.trim()) return;
        setError(null);
        setStep('loading');

        try {
            const res  = await fetch(`${API_BASE}/analyze?query=${encodeURIComponent(query)}&year=${year}`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || '조회 실패');
            setResult(data);
            setStep('result');
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
        setTab('financial');
    };

    return (
        <div style={{ maxWidth: 480, margin: '0 auto', background: '#000', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

            {/* 헤더 */}
            <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ color: '#888', fontSize: 13 }}>
          {step === 'search' ? '기업 검색' : step === 'loading' ? '조회 중' : '분석 결과'}
        </span>
                <h2 style={{ color: '#fff', margin: 0, fontSize: 17, fontWeight: 'bold' }}>재무 분석</h2>
                {step === 'result'
                    ? <button onClick={handleReset} style={{ color: '#60a5fa', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13 }}>다시 검색</button>
                    : <span style={{ width: 56 }} />
                }
            </div>

            {/* ── 검색 화면 ── */}
            {step === 'search' && (
                <div style={{ padding: 16, flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <p style={{ color: '#888', fontSize: 13, margin: 0 }}>회사명 또는 종목코드를 입력하세요</p>

                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        placeholder="예: 삼성전자 또는 005930"
                        style={{
                            width: '100%', padding: '14px 16px', background: '#111827',
                            color: '#fff', border: '1px solid #374151', borderRadius: 8,
                            fontSize: 16, boxSizing: 'border-box', outline: 'none',
                        }}
                    />

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
                            {Array.from({length: 5}, (_, i) => String(new Date().getFullYear() - 1 - i))
                                .map((y) => (
                                <option key={y} value={y}>{y}년</option>
                            ))}
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

                    <div style={{ marginTop: 8 }}>
                        <p style={{ color: '#555', fontSize: 12, margin: '0 0 8px' }}>예시</p>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            {['삼성전자', 'SK하이닉스', '카카오', 'NAVER'].map((name) => (
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

            {/* ── 로딩 화면 ── */}
            {step === 'loading' && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
                    <div style={{ color: '#60a5fa', fontSize: 40 }}>📊</div>
                    <p style={{ color: '#fff', fontSize: 16, margin: 0 }}>{query} 분석 중...</p>
                    <p style={{ color: '#888', fontSize: 13, margin: 0 }}>DART API에서 데이터를 가져오고 있어요</p>
                </div>
            )}

            {/* ── 결과 화면 ── */}
            {step === 'result' && result && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>

                    <CompanyCard info={result.company_info} />

                    {/* 탭 메뉴 */}
                    <div style={{ display: 'flex', borderBottom: '1px solid #1f2937', padding: '0 16px' }}>
                        {([
                            { key: 'financial',   label: '재무제표' },
                            { key: 'disclosure',  label: '공시' },
                            { key: 'shareholder', label: '주주' },
                            { key: 'dividend',    label: '배당' },
                            { key: 'insight', label: '인사이트' },
                        ] as const).map(({ key, label }) => (
                            <button
                                key={key}
                                onClick={() => setTab(key)}
                                style={{
                                    flex: 1, padding: '12px 0', background: 'none', border: 'none',
                                    color: tab === key ? '#60a5fa' : '#6b7280',
                                    borderBottom: tab === key ? '2px solid #60a5fa' : '2px solid transparent',
                                    fontSize: 13, cursor: 'pointer',
                                    fontWeight: tab === key ? 'bold' : 'normal',
                                }}
                            >
                                {label}
                            </button>
                        ))}
                    </div>

                    {/* 탭 컨텐츠 */}
                    <div style={{ padding: 16, flex: 1 }}>
                        {tab === 'financial'   && <FinancialTab data={result.financial} baseYear={year} />}
                        {tab === 'disclosure'  && <DisclosureTab data={result.disclosures} />}
                        {tab === 'shareholder' && <ShareholderTab data={result.shareholders.shareholders} />}
                        {tab === 'dividend'    && <DividendTab data={result.dividend} />}
                        {tab === 'insight' && <InsightTab insight={result.insight} news={result.sector_news} />}
                    </div>

                    <div style={{ padding: '12px 16px', borderTop: '1px solid #1f2937' }}>
                        <p style={{ color: '#4b5563', fontSize: 11, margin: 0, textAlign: 'center' }}>
                            본 서비스는 투자 참고용입니다. 투자 결정에 대한 책임은 본인에게 있습니다.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}

// ── 기업 개요 카드 ─────────────────────────────────────────
function CompanyCard({ info }: { info: CompanyInfo }) {
    return (
        <div style={{ margin: 16, padding: 16, background: '#0f172a', borderRadius: 8, border: '1px solid #1e3a5f' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h3 style={{ color: '#fff', margin: '0 0 4px', fontSize: 18 }}>{info.corp_name}</h3>
                    <span style={{ color: '#888', fontSize: 12 }}>종목코드 {info.stock_code}</span>
                </div>
                <span style={{ background: '#1e3a5f', color: '#60a5fa', padding: '4px 10px', borderRadius: 20, fontSize: 12 }}>
          업종 {info.induty_code}
        </span>
            </div>
            <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <InfoRow label="대표이사" value={info.ceo_nm} />
                <InfoRow label="설립일"   value={formatDate(info.est_dt)} />
            </div>
        </div>
    );
}

// ── 재무제표 탭 ────────────────────────────────────────────
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

// ── 손익 막대 차트 ─────────────────────────────────────────
function IncomeChart({ data, years }: { data: Record<string, YearFinancial>; years: string[] }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const chartRef  = useRef<Chart | null>(null);

    useEffect(() => {
        if (!canvasRef.current) return;

        const existingChart = Chart.getChart(canvasRef.current);
        if (existingChart) existingChart.destroy();
        chartRef.current = null;

        const revenue  = years.map((y) => data[y]?.income_statement.revenue?.억원 ?? 0);
        const opProfit = years.map((y) => data[y]?.income_statement.operating_profit?.억원 ?? 0);
        const net      = years.map((y) => data[y]?.income_statement.net_income?.억원 ?? 0);

        chartRef.current = new Chart(canvasRef.current, {
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
                    tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${Number(ctx.raw).toLocaleString()}억원` } },
                },
                scales: {
                    x: { ticks: { color: '#9ca3af' }, grid: { color: '#1f2937' } },
                    y: { ticks: { color: '#9ca3af', callback: (v) => `${Number(v).toLocaleString()}억` }, grid: { color: '#1f2937' } },
                },
            },
        });

        return () => { chartRef.current?.destroy(); };
    }, [data, years]);

    return <canvas ref={canvasRef} style={{ width: '100%' }} />;
}

// ── 재무상태 도넛 차트 ─────────────────────────────────────
function BalanceChart({ data }: { data?: BalanceSheet }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const chartRef  = useRef<Chart | null>(null);

    useEffect(() => {
        if (!canvasRef.current || !data) return;

        const existingChart = Chart.getChart(canvasRef.current);
        if (existingChart) existingChart.destroy();
        chartRef.current = null;

        chartRef.current = new Chart(canvasRef.current, {
            type: 'doughnut',
            data: {
                labels: ['부채', '자본'],
                datasets: [{
                    data: [data.total_liabilities?.억원 ?? 0, data.total_equity?.억원 ?? 0],
                    backgroundColor: ['#f87171', '#00cc44'],
                    borderColor: '#111827',
                    borderWidth: 2,
                }],
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { labels: { color: '#9ca3af', font: { size: 11 } } },
                    tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${Number(ctx.raw).toLocaleString()}억원` } },
                },
            },
        });

        return () => { chartRef.current?.destroy(); };
    }, [data]);

    return <div style={{ maxWidth: 200, margin: '0 auto' }}><canvas ref={canvasRef} /></div>;
}

// ── 현금흐름 막대 차트 ─────────────────────────────────────
function CashFlowChart({ data, years }: { data: Record<string, YearFinancial>; years: string[] }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const chartRef  = useRef<Chart | null>(null);

    useEffect(() => {
        if (!canvasRef.current) return;

        const existingChart = Chart.getChart(canvasRef.current);
        if (existingChart) existingChart.destroy();
        chartRef.current = null;

        chartRef.current = new Chart(canvasRef.current, {
            type: 'bar',
            data: {
                labels: years,
                datasets: [
                    { label: '영업활동', data: years.map((y) => data[y]?.cash_flow.operating_cf?.억원 ?? 0), backgroundColor: '#f59e0b' },
                    { label: '투자활동', data: years.map((y) => data[y]?.cash_flow.investing_cf?.억원 ?? 0), backgroundColor: '#60a5fa' },
                    { label: '재무활동', data: years.map((y) => data[y]?.cash_flow.financing_cf?.억원 ?? 0), backgroundColor: '#a78bfa' },
                ],
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { labels: { color: '#9ca3af', font: { size: 11 } } },
                    tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${Number(ctx.raw).toLocaleString()}억원` } },
                },
                scales: {
                    x: { ticks: { color: '#9ca3af' }, grid: { color: '#1f2937' } },
                    y: { ticks: { color: '#9ca3af', callback: (v) => `${Number(v).toLocaleString()}억` }, grid: { color: '#1f2937' } },
                },
            },
        });

        return () => { chartRef.current?.destroy(); };
    }, [data, years]);

    return <canvas ref={canvasRef} style={{ width: '100%' }} />;
}

// ── 공시 탭 ───────────────────────────────────────────────
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

// ── 주주 탭 ───────────────────────────────────────────────
function ShareholderTab({ data }: { data: Shareholder[] }) {
    if (!data.length) return <Empty text="주주 현황 정보가 없습니다" />;
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

// ── 배당 탭 ───────────────────────────────────────────────
function DividendTab({ data }: { data: Dividend[] }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const chartRef  = useRef<Chart | null>(null);

    useEffect(() => {
        if (!canvasRef.current || !data.length) return;

        const existingChart = Chart.getChart(canvasRef.current);
        if (existingChart) existingChart.destroy();
        chartRef.current = null;

        const sorted = [...data].sort((a, b) => Number(a.year) - Number(b.year));

        chartRef.current = new Chart(canvasRef.current, {
            type: 'line',
            data: {
                labels: sorted.map((d) => `${d.year}년`),
                datasets: [{
                    label: '배당금 총액 (백만원)',
                    data: sorted.map((d) => d.total_dividend ? Number(d.total_dividend.replace(/,/g, '')) : 0),
                    borderColor: '#a78bfa',
                    backgroundColor: 'rgba(167,139,250,0.15)',
                    pointBackgroundColor: '#a78bfa',
                    tension: 0.3,
                    fill: true,
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

        return () => { chartRef.current?.destroy(); };
    }, [data]);

    if (!data.length) return <Empty text="배당 현황 정보가 없습니다" />;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <SectionCard title="배당금 추이" color="#a78bfa">
                <canvas ref={canvasRef} style={{ width: '100%' }} />
            </SectionCard>
            {[...data].sort((a, b) => Number(b.year) - Number(a.year)).map((d) => (
                <SectionCard key={d.year} title={`${d.year}년 배당`} color="#a78bfa">
                    <FinRow label="배당금 총액" value={d.total_dividend ? `${Number(d.total_dividend.replace(/,/g,'')).toLocaleString()}백만원` : '-'} />
                    <FinRow label="배당 성향"   value={d.dividend_ratio  ? `${d.dividend_ratio}%`  : '-'} />
                    <FinRow label="배당 수익률" value={d.dividend_yield  ? `${d.dividend_yield}%`  : '-'} />
                    <FinRow label="주당 배당금" value={d.dividend_per_share ? `${Number(d.dividend_per_share.replace(/,/g,'')).toLocaleString()}원` : '-'} />
                </SectionCard>
            ))}
        </div>
    );
}

function InsightTab({ insight, news }: { insight?: Insight; news?: SectorNews[] }) {
    if (!insight || (insight as any).error) return <Empty text="인사이트를 불러올 수 없습니다" />;

    const { score } = insight;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* 적합도 점수 */}
            <div style={{ padding: 16, background: '#0f172a', borderRadius: 8, border: '1px solid #1e3a5f' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <h4 style={{ color: '#60a5fa', margin: 0, fontSize: 14 }}>종합 점수</h4>
                    <span style={{ color: '#fff', fontSize: 28, fontWeight: 'bold' }}>{score.total}점</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <ScoreBar label="수익성" value={score.profitability} max={25} color="#00cc44" />
                    <ScoreBar label="안정성" value={score.stability}    max={25} color="#60a5fa" />
                    <ScoreBar label="성장성" value={score.growth}       max={25} color="#f59e0b" />
                    <ScoreBar label="현금흐름" value={score.cashflow}   max={25} color="#a78bfa" />
                </div>
            </div>

            {/* 종합 요약 */}
            <SectionCard title="한줄 요약" color="#00cc44">
                <p style={{ color: '#e2e8f0', fontSize: 14, margin: 0, lineHeight: 1.6 }}>{insight.summary}</p>
            </SectionCard>

            {/* 섹터 트렌드 */}
            <SectionCard title="지금 섹터 분위기" color="#f59e0b">
                <p style={{ color: '#e2e8f0', fontSize: 14, margin: 0, lineHeight: 1.6 }}>{insight.sector_trend}</p>
            </SectionCard>

            {/* 분석 카드들 */}
            <SectionCard title="수익성" color="#00cc44">
                <p style={{ color: '#e2e8f0', fontSize: 14, margin: 0, lineHeight: 1.6 }}>{insight.profitability}</p>
            </SectionCard>

            <SectionCard title="안정성" color="#60a5fa">
                <p style={{ color: '#e2e8f0', fontSize: 14, margin: 0, lineHeight: 1.6 }}>{insight.stability}</p>
            </SectionCard>

            <SectionCard title="성장성" color="#f59e0b">
                <p style={{ color: '#e2e8f0', fontSize: 14, margin: 0, lineHeight: 1.6 }}>{insight.growth}</p>
            </SectionCard>

            <SectionCard title="긍정 포인트" color="#00cc44">
                <p style={{ color: '#e2e8f0', fontSize: 14, margin: 0, lineHeight: 1.6 }}>{insight.positive}</p>
            </SectionCard>

            <SectionCard title="리스크" color="#f87171">
                <p style={{ color: '#e2e8f0', fontSize: 14, margin: 0, lineHeight: 1.6 }}>{insight.risk}</p>
            </SectionCard>

            {/* 섹터 뉴스 */}
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

            {/* 면책 */}
            <p style={{ color: '#4b5563', fontSize: 11, textAlign: 'center', margin: 0 }}>
                본 인사이트는 AI 생성 참고용입니다. 투자 결정의 책임은 본인에게 있습니다.
            </p>
        </div>
    );
}

// 점수 바 컴포넌트
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

// ── 공통 서브 컴포넌트 ─────────────────────────────────────
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