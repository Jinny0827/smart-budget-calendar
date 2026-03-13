import api from './api';
import type { Post, PostListResponse } from '../types';

export const postService = {
    getPosts: (boardType: 'notice' | 'free', page = 1, limit = 10) =>
        api.get<{ success: boolean; data: PostListResponse }>(`/posts/${boardType}`, { params: { page, limit } }),

    getPost: (id: string) =>
        api.get<{ success: boolean; data: Post }>(`/posts/detail/${id}`),

    createPost: (boardType: 'notice' | 'free', data: { title: string; content: string; isPinned?: boolean }) =>
        api.post<{ success: boolean; data: Post }>(`/posts/${boardType}`, data),

    updatePost: (id: string, data: { title?: string; content?: string; isPinned?: boolean }) =>
        api.put<{ success: boolean; data: Post }>(`/posts/${id}`, data),

    deletePost: (id: string) =>
        api.delete<{ success: boolean }>(`/posts/${id}`),
};