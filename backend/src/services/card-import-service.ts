import * as XLSX from 'xlsx';

export interface ParsedTransaction {
    date: string;        // ISO 문자열
    description: string; // 가맹점명
    amount: number;
    type: 'expense' | 'income';
    category: string;
}

// ─── 카드사 파서 인터페이스 (여기에 추가하면 자동 감지) ──────────
interface CardParser {
    cardName: string;
    detect(headers: string[]): boolean;
    parse(workbook: XLSX.WorkBook): ParsedTransaction[];
}

// ─── 키워드 기반 카테고리 자동 분류 ─────────────────────────────
function guessCategory(merchant: string): string {
    const n = merchant.toLowerCase();
    if (/이츠|식당|음식|카페|커피|베이커리|베이글|치킨|피자|버거|국밥|밥|면|짜장|초밥|스시|고기|삼겹|족발|떡볶이|분식|편의점|gs25|cu|세븐/.test(n)) return '식비';
    if (/지하철|버스|택시|주유|주차|고속|ktx|korail|카카오택시|우버|티머니/.test(n)) return '교통';
    if (/병원|의원|약국|치과|한의원|클리닉|의료|건강/.test(n)) return '의료';
    if (/볼링|헬스|피트니스|pt|수영|요가|스포츠|운동|짐|gym/.test(n)) return '운동';
    if (/항공|호텔|여행|투어|숙박|펜션|에어비앤비|모텔/.test(n)) return '여행';
    if (/무신사|쿠팡|11번가|지마켓|옥션|마켓컬리|배달의민족|배민|요기요|올리브영|다이소|이마트|홈플러스|롯데마트/.test(n)) return '쇼핑';
    if (/영화|cgv|롯데시네마|메가박스|공연|전시|넷플릭스|spotify|유튜브|멜론/.test(n)) return '문화';
    if (/학원|과외|교육|어학|강의|서점|교보|영풍/.test(n)) return '교육';
    return '기타';
}

// ─── 삼성카드 파서 ────────────────────────────────────────────
// 컬럼: [0]카드번호 [1]본인가족구분 [2]승인일자 [3]승인시각
//       [4]가맹점명 [5]승인금액(원) [6]일시불할부구분 [7]할부개월
//       [8]승인번호 [9]취소여부 [10]사용포인트 [11]결제일
const samsungCardParser: CardParser = {
    cardName: '삼성카드',

    detect(headers: string[]): boolean {
        return headers.includes('승인일자')
            && headers.includes('가맹점명')
            && headers.includes('승인금액(원)');
    },

    parse(workbook: XLSX.WorkBook): ParsedTransaction[] {
        // 삼성카드: 2번째 시트(상세 이용내역) 사용
        const ws = workbook.Sheets[workbook.SheetNames[1]];
        const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });
        const result: ParsedTransaction[] = [];

        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            if (!row || row.length < 10) continue;

            const dateStr  = String(row[2] ?? '');  // 승인일자 YYYY.MM.DD
            const timeStr  = String(row[3] ?? '');  // 승인시각 HH:MM:SS
            const merchant = String(row[4] ?? '');  // 가맹점명
            const amount   = Number(row[5]);         // 승인금액(원)
            const cancelled = String(row[9] ?? ''); // 취소여부

            // 취소거래(음수 or 취소여부 값 있음) 제외
            if (!dateStr || !merchant || amount <= 0 || cancelled !== '-') continue;

            const parts = dateStr.split('.');
            if (parts.length !== 3) continue;
            const [y, m, d] = parts;
            const isoDate = timeStr ? `${y}-${m}-${d}T${timeStr}` : `${y}-${m}-${d}`;

            result.push({
                date: isoDate,
                description: merchant,
                amount: Math.round(amount),
                type: 'expense',
                category: guessCategory(merchant),
            });
        }
        return result;
    },
};

// ─── 등록된 파서 목록 (다른 카드사 추가 시 여기에만 push) ────────
const CARD_PARSERS: CardParser[] = [
    samsungCardParser,
    // 신한카드, KB카드, 현대카드 등 추후 추가
];

// ─── 메인 파서 함수 ──────────────────────────────────────────
export function parseCardExcel(buffer: Buffer): {
    cardName: string;
    transactions: ParsedTransaction[];
} {
    const workbook = XLSX.read(buffer, { type: 'buffer' });

    // 각 시트 헤더를 순회하며 파서 자동 감지
    for (const parser of CARD_PARSERS) {
        for (const sheetName of workbook.SheetNames) {
            const ws = workbook.Sheets[sheetName];
            const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });
            if (!rows[0]) continue;

            const headers = rows[0].map((h: any) => String(h ?? '').trim());
            if (parser.detect(headers)) {
                return { cardName: parser.cardName, transactions: parser.parse(workbook) };
            }
        }
    }

    const supported = CARD_PARSERS.map(p => p.cardName).join(', ');
    throw new Error(`지원하지 않는 카드사 형식입니다. 현재 지원: ${supported}`);
}
