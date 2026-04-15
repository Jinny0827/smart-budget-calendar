import axios from 'axios';

const GROQ_API_KEY = process.env.GROQ_API_KEY!;
const GROQ_URL     = 'https://api.groq.com/openai/v1/chat/completions';

async function callGroq(prompt: string) {
    const res = await axios.post(GROQ_URL, {
        model:           'llama-3.3-70b-versatile',
        messages: [
            {
                role: 'system',
                content: `너는 주식이랑 재무를 잘 아는 친한 친구야. 반드시 JSON 형식으로만 응답해.
톤 규칙:
- 짧고 직접적으로. 한 문장에 하나의 포인트만.
- 숫자를 반드시 넣어. "매출이 증가했어" 말고 "매출이 작년 대비 12% 늘었어".
- 금지 표현: "~할 것으로 판단됩니다", "~에 유의할 필요가 있습니다", "지속적인", "안정적인 재무구조", "불확실성", "~를 고려해야 합니다", "본 종목".
- 좋으면 좋다고, 나쁘면 나쁘다고 솔직하게. 중립적인 말 늘어놓지 마.
- 구어체. "~해", "~야", "~네", "~거든" 자연스럽게.`
            },
            { role: 'user',   content: prompt },
        ],
        temperature:     0.7,
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
분석 대상: ${companyInfo.corp_name} ${isUs ? `(${companyInfo.ticker})` : ''}

3개년 재무:
${financialSummary}

주요 공시:
${disclosureSummary}

섹터 뉴스:
${newsSummary}

주가 동향:
${stockSummary}

각 필드 작성 가이드:
- summary: 이 회사 지금 어때? 핵심만 2문장. 재무 수치 1개 이상 언급 필수.
- profitability: 영업이익률/순이익 추이가 실제로 좋아지고 있어 나빠지고 있어? 수치로.
- stability: 부채비율이나 현금흐름이 버틸 수 있는 구조야? 구체적으로.
- growth: 매출 성장이 실제로 일어나고 있어? 정체야? 수치 기반으로.
- sector_trend: 지금 이 업종 분위기가 어때? 뉴스 기반으로 한두 줄.
- price_analysis: 지금 주가 흐름이 오르는 중이야 내리는 중이야? 최근 등락률 언급.
- risk: 진짜 걱정되는 거 하나만. 구체적으로.
- positive: 솔직히 잘 하고 있는 거 하나만. 구체적으로.
- score: total(0-100), 나머지(0-100 각각). 데이터가 좋으면 높게, 나쁘면 낮게. 후하게 주지 마.

JSON으로만 응답:
{
  "summary": "",
  "profitability": "",
  "stability": "",
  "growth": "",
  "sector_trend": "",
  "price_analysis": "",
  "risk": "",
  "positive": "",
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
보유 종목 현황:
${holdingsSummary}

총 평가금액(KRW 환산): ${totalDisplay}

규칙: 수익률은 위 데이터 그대로만 써. 임의로 바꾸지 마. 종목명으로만 언급해(티커 X).

각 필드 작성 가이드:
- summary: 지금 포트폴리오 전체가 어떤 상태야? 총 평가금액이랑 전체 수익/손실 상황 언급. 2문장.
- riskLevel: "낮음/중간/높음" + 왜 그런지 한 문장. 종목 집중도나 변동성 기반으로.
- sectorBalance: 특정 섹터에 몰려있어 분산이 잘 돼있어? 솔직하게.
- rebalancingSuggestion: 수익률 기반으로 지금 포트폴리오에서 비중 조절이 필요한 부분이 있어? 구체적으로.
- topPick: 현재 포트 중 가장 눈여겨볼 종목 하나. 왜인지 수치로.

JSON으로만 응답:
{
  "summary": "",
  "riskLevel": "",
  "sectorBalance": "",
  "rebalancingSuggestion": "",
  "topPick": ""
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

## 보유 포트폴리오 (KRW 환산)
${portfolioLine}

각 필드 작성 가이드:
- summary: 이번 달 재무 상황 한 줄 요약. 지출이 늘었으면 얼마나, 잔액이 어떤지 수치 포함. 40자 이내.
- score: 지출 습관 + 일정 관리 + 포트폴리오 종합 점수 0-100. 데이터 없으면 중간값.
- expense.comment: 지난 달 대비 지출이 어떻게 달라졌어? 가장 많이 쓴 카테고리 언급. 칭찬할 거면 구체적 수치로, 지적할 거면 직접적으로.
- schedule.comment: 예정 일정 중 재정에 영향 줄 것 있으면 언급. 없으면 "이번 달 일정은 가볍네".
- portfolio.comment: 포트폴리오 없으면 "아직 주식은 없네". 있으면 수익/손실 상황 한 줄.
- overall: 위 세 가지 보고 솔직한 한마디. 잘 하고 있으면 인정, 아니면 뭘 바꿔야 할지. 2문장.

JSON으로만 응답:
{
  "summary": "",
  "score": 0,
  "expense":   { "score": 0, "comment": "" },
  "schedule":  { "score": 0, "comment": "" },
  "portfolio": { "score": 0, "comment": "" },
  "overall": ""
}`;

    return callGroq(prompt);
}