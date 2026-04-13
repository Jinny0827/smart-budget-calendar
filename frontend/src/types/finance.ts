export interface CompanyInfo {
    corp_name: string;
    corp_code?: string;
    stock_code?: string;
    ceo_nm?: string;
    induty_code?: string;
    est_dt?: string;
    listing_dt?: string | null;
    market?: string;
    cik?: string;
    ticker?: string;
    exchange?: string;
    sic?: string;
    sic_description?: string;
    state?: string;
    fiscal_year_end?: string;
}

export interface AmountData {
    raw: number;
    억원?: number;
    백만달러?: number;
    표시: string;
}

export interface IncomeStatement {
    revenue?: AmountData;
    operating_profit?: AmountData;
    net_income?: AmountData;
}

export interface BalanceSheet {
    total_assets?: AmountData;
    total_liabilities?: AmountData;
    total_equity?: AmountData;
    current_assets?: AmountData;
    current_liabilities?: AmountData;
}

export interface CashFlow {
    operating_cf?: AmountData;
    investing_cf?: AmountData;
    financing_cf?: AmountData;
}

export interface YearFinancial {
    income_statement: IncomeStatement;
    balance_sheet: BalanceSheet;
    cash_flow: CashFlow;
}

export interface Disclosure {
    date: string;
    title: string;
    rcept_no: string;
}

export interface Shareholder {
    name: string;
    relation: string;
    stock_type: string;
    shares: string;
    ratio: string;
}

export interface Dividend {
    year: string;
    dividend_per_share?: string;
    total_dividend?: string;
    dividend_ratio?: string;
    dividend_yield?: string;
}

export interface SectorNews {
    title: string;
    pubDate: string;
    description: string;
}

export interface StockData {
    current_price: number;
    prev_close: number;
    change_pct: number;
    high_5d: number;
    low_5d: number;
    week52_high: number | null;
    week52_low: number | null;
    trend_5d: '상승' | '하락' | '횡보';
    volume_trend: '증가' | '감소' | '보합';
    market_cap_억원: number | null;
    ticker?: string;
    symbol?: string;
    suffix?: string;
}

export interface Insight {
    summary: string;
    profitability: string;
    stability: string;
    growth: string;
    sector_trend: string;
    price_analysis?: string;
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

export interface AnalyzeResult {
    company_info: CompanyInfo;
    financial: Record<string, YearFinancial>;
    disclosures: Disclosure[];
    shareholders?: { shareholders: Shareholder[] };
    dividend?: Dividend[];
    stock_data?: StockData;
    insight?: Insight;
    sector_news?: SectorNews[];
}

export interface UserStock {
    _id: string;
    userId: string;
    corpName: string;
    ticker: string;
    stock_code: string;
    suffix?: string;
    corp_code?: string;
    market: 'kr' | 'us';
    type: 'watchlist' | 'portfolio';
    quantity?: number;
    avgPrice?: number;
    currency?: 'KRW' | 'USD';
    addedAt: string;
    updatedAt: string;
}

export interface PortfolioInsight {
    summary: string;
    riskLevel: string;
    sectorBalance: string;
    rebalancingSuggestion: string;
    topPick: string;
    basedOn: string[];
    generatedAt: string;
}

export interface BatchPrice {
    symbol: string;
    current_price: number;
    prev_close: number;
    change_pct: number;
    market_cap_억원: number | null;
    week52_high: number | null;
    week52_low: number | null;
}