import axios from 'axios';

const API_KEY = decodeURIComponent(process.env.HOLIDAY_SERVICE_KEY!);
const BASE_URL = 'http://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService';

// ─── 연도별 공휴일 조회 (월 없이 연도 전체) ──────────────────
const fetchHolidaysByYear = async (year: number): Promise<{ date: string; name: string }[]> => {
    const response = await axios.get(`${BASE_URL}/getRestDeInfo`, {
        params: {
            serviceKey: API_KEY,
            solYear: String(year),
            _type: 'json',
            numOfRows: 100,
        },
    });

    const items = response.data?.response?.body?.items?.item;
    if (!items) return [];

    const list = Array.isArray(items) ? items : [items];
    return list.map((item: any) => ({
        date: String(item.locdate),
        name: item.dateName,
    }));
};

// ─── 메모리 캐시 (24시간) ────────────────────────────────────
let cache: { data: { date: string; name: string }[]; cachedAt: number } | null = null;
const CACHE_TTL = 1000 * 60 * 60 * 24;

export const getHolidaysByYear = async (): Promise<{ date: string; name: string }[]> => {
    if (cache && Date.now() - cache.cachedAt < CACHE_TTL) {
        return cache.data;
    }

    const year = new Date().getFullYear();
    // 3번만 호출
    const [prev, curr, next] = await Promise.all([
        fetchHolidaysByYear(year - 1),
        fetchHolidaysByYear(year),
        fetchHolidaysByYear(year + 1),
    ]);

    const data = [...prev, ...curr, ...next].map((h) => ({
        date: `${h.date.slice(0, 4)}-${h.date.slice(4, 6)}-${h.date.slice(6, 8)}`,
        name: h.name,
    }));

    cache = { data, cachedAt: Date.now() };
    return data;
};