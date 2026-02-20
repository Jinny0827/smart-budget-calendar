import api from './api';
import type { ApiResponse } from '../types';

export const importCardHistory = async (
    file: File
): Promise<{ count: number; skipped: number; cardName: string }> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post<ApiResponse<{ count: number; skipped: number; cardName: string }>>(
        '/import/card',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return response.data.data!;
};
