import { useEffect, useState } from 'react';
import { postService } from '../services/post-service';
import type { Post } from '../types';

interface NoticeModalProps {
    onClose: () => void;
}

const DISMISS_KEY = 'noticeDismissedDate';

export function NoticeModal({ onClose }: NoticeModalProps) {
    const [post, setPost] = useState<Post | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // showModal=true인 공지만 가져옴 (isPinned 우선, 없으면 최신 1건)
        postService.getPosts('notice', 1, 10, { showModal: true })
            .then((res) => {
                const posts = res.data.data.posts;
                const pinned = posts.find((p) => p.isPinned);
                const found = pinned ?? posts[0] ?? null;
                setPost(found);
                if (!found) onClose(); // 팝업 공지 없으면 조용히 닫기
            })
            .catch(() => { setPost(null); onClose(); })
            .finally(() => setLoading(false));
    }, [onClose]);

    const handleDismissToday = () => {
        const today = new Date().toISOString().split('T')[0]; // 'YYYY-MM-DD'
        localStorage.setItem(DISMISS_KEY, today);
        onClose();
    };

    // 로딩 중이거나 공지 없으면 렌더링 안 함 (플래시 방지)
    if (loading || !post) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-[100]">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
                {/* 헤더 */}
                <div className="bg-indigo-600 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-white text-lg">📢</span>
                        <span className="text-white font-semibold">공지사항</span>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-white opacity-70 hover:opacity-100 text-xl leading-none"
                    >
                        ✕
                    </button>
                </div>

                {/* 내용 */}
                <div className="px-6 py-5 min-h-[120px]">
                    {loading ? (
                        <p className="text-gray-400 text-sm text-center py-6">불러오는 중...</p>
                    ) : post ? (
                        <>
                            <h3 className="font-bold text-gray-900 text-base mb-3">
                                {post.isPinned && <span className="text-red-500 mr-1">📌</span>}
                                <span>{post.title}</span>
                            </h3>
                            <p className="text-gray-600 text-sm whitespace-pre-wrap leading-relaxed">
                                {post.content}
                            </p>
                            <p className="text-xs text-gray-400 mt-4 text-right">
                                {new Date(post.createdAt).toLocaleDateString('ko-KR')}
                            </p>
                        </>
                    ) : null}
                </div>

                {/* 버튼 */}
                <div className="flex border-t border-gray-100">
                    <button
                        onClick={handleDismissToday}
                        className="flex-1 py-3 text-sm text-gray-400 hover:bg-gray-50 transition-colors"
                    >
                        오늘 하루 안보기
                    </button>
                    <div className="w-px bg-gray-100" />
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 text-sm font-medium text-indigo-600 hover:bg-indigo-50 transition-colors"
                    >
                        닫기
                    </button>
                </div>
            </div>
        </div>
    );
}