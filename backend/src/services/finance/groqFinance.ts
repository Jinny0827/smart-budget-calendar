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
}[]) {
    const totalValue = holdings.reduce((sum, h) => {
        return sum + (h.currentPrice ?? h.avgPrice) * h.quantity;
    }, 0);

    const holdingsSummary = holdings.map(h => {
        const currentPrice  = h.currentPrice ?? h.avgPrice;
        const returnPct     = ((currentPrice - h.avgPrice) / h.avgPrice * 100).toFixed(2);
        const weight        = ((currentPrice * h.quantity / totalValue) * 100).toFixed(1);
        return `- ${h.corpName} (${h.ticker}, ${h.market.toUpperCase()}): ${h.quantity}주 | 평균매입가 ${h.avgPrice.toLocaleString()} | 현재가 ${currentPrice.toLocaleString()} | 수익률 ${returnPct}% | 비중 ${weight}%`;
    }).join('\n');

    const prompt = `
너는 포트폴리오 전문 투자 분석가야. MZ세대 스타일로 써.
투자 추천 절대 금지. 데이터에 없는 내용 지어내지 마.

보유 종목 현황:
${holdingsSummary}

총 평가금액: ${totalValue.toLocaleString()}

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
