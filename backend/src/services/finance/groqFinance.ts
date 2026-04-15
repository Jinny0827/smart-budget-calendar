import axios from 'axios';

const GROQ_API_KEY = process.env.GROQ_API_KEY!;
const GROQ_URL     = 'https://api.groq.com/openai/v1/chat/completions';

async function callGroq(prompt: string) {
    const res = await axios.post(GROQ_URL, {
        model:           'llama-3.3-70b-versatile',
        messages: [
            { role: 'system', content: '당신은 주식 투자 전문 재무 분석가입니다. 반드시 JSON 형식으로만 응답하세요.' },
            { role: 'user',   content: prompt },
        ],
        temperature:     0.3,
        response_format: { type: 'json_object' },
    }, { headers: { Authorization: `Bearer ${GROQ_API_KEY}` }, timeout: 30000 });

    return JSON.parse(res.data.choices[0].message.content);
}

// 개별 종목 인사이트
export async function generateStockInsight(
    companyInfo: any, financial: any, disclosures: any[], sectorNews: any[], stockData: any
) {
    const isUs = companyInfo.market === 'US';
    const years = Object.keys(financial).sort();

    const financialSummary = years.map(year => {
        const is = financial[year].income_statement;
        const cf = financial[year].cash_flow;
        return `[${year}] 매출: ${is.revenue?.표시 ?? 'N/A'} | 영업이익: ${is.operating_profit?.표시 ?? 'N/A'} | 순이익: ${is.net_income?.표시 ?? 'N/A'} | 영업CF: ${cf.operating_cf?.표시 ?? 'N/A'}`;
    }).join('\n');

    const disclosureSummary = disclosures.slice(0, 10)
        .map(d => `- ${d.date}: ${d.title}`).join('\n') || '없음';

    const newsSummary = sectorNews
        .map(n => `- ${n.title}`).join('\n') || '없음';

    const stockSummary = stockData
        ? `현재가: ${stockData.current_price} (${stockData.change_pct >= 0 ? '+' : ''}${stockData.change_pct}%) | 5일추세: ${stockData.trend_5d} | 거래량: ${stockData.volume_trend}`
        : '데이터 없음';

    const prompt = `
너는 주식 재무 분석 전문가야. MZ세대한테 설명하는 스타일로 써. 딱딱한 표현 금지.
투자 추천은 절대 하지 말고 참고용임을 녹여줘.

분석 대상: ${companyInfo.corp_name} ${isUs ? `(${companyInfo.ticker})` : ''}

3개년 재무:
${financialSummary}

주요 공시:
${disclosureSummary}

섹터 뉴스:
${newsSummary}

주가 동향:
${stockSummary}

아래 JSON으로만 응답:
{
  "summary": "2~3줄 핵심 요약",
  "profitability": "수익성 분석",
  "stability": "안정성 분석",
  "growth": "성장성 분석",
  "sector_trend": "업황 분석",
  "price_analysis": "주가 분석",
  "risk": "리스크 요인",
  "positive": "긍정 포인트",
  "score": { "total": 0, "profitability": 0, "stability": 0, "growth": 0, "cashflow": 0 }
}`;

    return callGroq(prompt);
}

// 포트 폴리오 종합 인사이트
export async function generatePortfolioInsight(holdings: {
    corpName: string; ticker: string; market: string;
    quantity: number; avgPrice: number; currentPrice?: number;
    currency: string;
}[], usdKrw?: number) {
    // 비중 계산용: 모든 금액을 KRW로 통일 (USD는 환율 적용)
    const toKrw = (price: number, currency: string) =>
        currency === 'USD' ? price * (usdKrw ?? 1300) : price;

    const totalValueKrw = holdings.reduce((sum, h) => {
        const price = h.currentPrice ?? h.avgPrice;
        return sum + toKrw(price, h.currency) * h.quantity;
    }, 0);

    const holdingsSummary = holdings.map(h => {
        const currentPrice  = h.currentPrice ?? h.avgPrice;
        const returnPct     = ((currentPrice - h.avgPrice) / h.avgPrice * 100).toFixed(2);
        const valueKrw      = toKrw(currentPrice, h.currency) * h.quantity;
        const weight        = ((valueKrw / totalValueKrw) * 100).toFixed(1);
        const priceDisplay  = h.currency === 'USD'
            ? `$${currentPrice.toLocaleString()} (≈${Math.round(toKrw(currentPrice, h.currency)).toLocaleString()}원)`
            : `${currentPrice.toLocaleString()}원`;
        const avgDisplay    = h.currency === 'USD'
            ? `$${h.avgPrice.toLocaleString()}`
            : `${h.avgPrice.toLocaleString()}원`;
        return `- ${h.corpName} (${h.ticker}, ${h.market.toUpperCase()}): ${h.quantity}주 | 평균매입가 ${avgDisplay} | 현재가 ${priceDisplay} | 수익률 ${returnPct}% | 비중 ${weight}%`;
    }).join('\n');

    const totalDisplay = usdKrw
        ? `${Math.round(totalValueKrw).toLocaleString()}원 (환율 ${usdKrw.toLocaleString()}원/USD 기준)`
        : `${Math.round(totalValueKrw).toLocaleString()}원`;

    const prompt = `
너는 포트폴리오 전문 투자 분석가야. MZ세대 스타일로 써.
투자 추천 절대 금지.
아래 제공된 데이터만 사용해. 네가 알고 있는 외부 지식(뉴스, 시황 등)으로 수익률이나 손익을 임의로 바꾸지 마.
각 종목의 수익률은 반드시 아래 명시된 값 그대로 사용해. 수익률이 양수면 수익, 음수면 손실이야.
종목을 언급할 때는 반드시 티커 대신 회사명(corpName)을 사용해.

보유 종목 현황:
${holdingsSummary}

총 평가금액(KRW 환산): ${totalDisplay}

아래 JSON으로만 응답:
{
  "summary": "포트폴리오 전체 현황 요약 (2~3줄)",
  "riskLevel": "낮음/중간/높음 + 이유",
  "sectorBalance": "섹터 분산 평가",
  "rebalancingSuggestion": "리밸런싱 제안",
  "topPick": "현재 포트폴리오에서 주목할 종목 + 이유"
}`;

    return callGroq(prompt);
}

// 대시보드 종합 인사이트 (지출 + 일정 + 포트폴리오)
export async function generateDashboardInsight(params: {
    thisMonthIncome:      number;
    thisMonthExpense:     number;
    thisMonthByCategory: Record<string, number>;
    lastMonthIncome:      number;
    lastMonthExpense:     number;
    lastMonthByCategory: Record<string, number>;
    upcomingSchedules:    { title: string; category: string; date: string }[];
    portfolio: {
        corpName: string; quantity: number;
        avgPrice: number; currentPrice?: number; currency: string;
    }[] | null;
    usdKrw?: number;
}) {
    const {
        thisMonthIncome, thisMonthExpense, thisMonthByCategory,
        lastMonthIncome, lastMonthExpense, lastMonthByCategory,
        upcomingSchedules, portfolio, usdKrw,
    } = params;

    const toKrw = (price: number, currency: string) =>
        currency === 'USD' ? price * (usdKrw ?? 1300) : price;

    const balance   = thisMonthIncome - thisMonthExpense;
    const lastBalance = lastMonthIncome - lastMonthExpense;

    const categoryLines = Object.entries(thisMonthByCategory)
        .map(([cat, amt]) => `${cat}: ${amt.toLocaleString()}원`)
        .join(', ') || '없음';

    const lastCategoryLines = Object.entries(lastMonthByCategory)
        .map(([cat, amt]) => `${cat}: ${amt.toLocaleString()}원`)
        .join(', ') || '없음';

    const scheduleLine = upcomingSchedules.length
        ? upcomingSchedules.map(s => `${s.title}(${s.category}, ${s.date})`).join(', ')
        : '예정된 일정 없음';

    const portfolioLine = portfolio && portfolio.length
        ? portfolio.map(h => {
            const cur = h.currentPrice ?? h.avgPrice;
            const ret = ((cur - h.avgPrice) / h.avgPrice * 100).toFixed(1);
            const krw = toKrw(cur, h.currency) * h.quantity;
            return `${h.corpName} ${h.quantity}주 수익률${ret}% (${Math.round(krw).toLocaleString()}원)`;
        }).join(', ')
        : '포트폴리오 없음';

    const prompt = `
너는 개인 재무 종합 분석 전문가야. MZ세대 스타일로 써. 투자 추천 절대 금지.
제공된 데이터만 사용해. 수익률 등 수치는 절대 임의로 변경하지 마.

## 이번 달
- 수입: ${thisMonthIncome.toLocaleString()}원
- 지출: ${thisMonthExpense.toLocaleString()}원
- 잔액: ${balance.toLocaleString()}원
- 카테고리별 지출: ${categoryLines}

## 지난 달
- 수입: ${lastMonthIncome.toLocaleString()}원
- 지출: ${lastMonthExpense.toLocaleString()}원
- 잔액: ${lastBalance.toLocaleString()}원
- 카테고리별 지출: ${lastCategoryLines}

## 30일 내 예정 일정
${scheduleLine}

## 보유 포트폴리오 (KRW 환산 기준)
${portfolioLine}

아래 JSON으로만 응답:
{
  "summary": "전체를 한 줄로 요약 (40자 이내)",
  "score": 전체_점수_0_100,
  "expense":   { "score": 별점_1_5, "comment": "지출 관련 한 줄 코멘트" },
  "schedule":  { "score": 별점_1_5, "comment": "일정 관련 한 줄 코멘트" },
  "portfolio": { "score": 별점_1_5, "comment": "포트폴리오 관련 한 줄 코멘트 (포트폴리오 없으면 '포트폴리오 없음')" },
  "overall": "세 가지를 종합한 2~3줄 조언"
}`;

    return callGroq(prompt);
}