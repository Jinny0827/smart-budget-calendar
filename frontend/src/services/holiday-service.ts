import api from './api';

export interface HolidayItem {
    date: string;
    name: string;
}

export const getHolidays = async (): Promise<HolidayItem[]> => {
    const response = await api.get('/holidays');
    // data가 배열로 바로 옴
    return response.data.data;
};