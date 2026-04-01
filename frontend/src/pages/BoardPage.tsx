import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { logout, getCurrentUser } from "../services/auth-service";
import { postService } from '../services/post-service.ts';
import type { Post, PostListResponse } from "../types";

type BoardType = 'notice' | 'free';

export default function BoardPage() {
    const navigate = useNavigate();
    const user = getCurrentUser();

    const [boardType, setBoardType]   = useState<BoardType>('notice');
    const [posts, setPosts]           = useState<Post[]>([]);
    const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
    const [selectedPost, setSelectedPost] = useState<Post | null>(null);
    const [isWriting, setIsWriting]   = useState(false);
    const [form, setForm]             = useState({ title: '', content: '', isPinned: false, showModal: false });
    const [editingId, setEditingId]   = useState<string | null>(null);
    const [loading, setLoading]       = useState(false);

    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    const isAdmin = currentUser?.role === 'admin';

    const handleLogout = () => { logout(); window.location.href = '/login'; };


    const fetchPosts = useCallback(async (page = 1) => {
        setLoading(true);
        try {
            const res = await postService.getPosts(boardType, page);
            const data: PostListResponse = res.data.data;
            setPosts(data.posts);
            setPagination({ page: data.page, totalPages: data.totalPages, total: data.total });
        } finally {
            setLoading(false);
        }
    }, [boardType]);

    const handleSelectPost = async (post: Post) => {
        const res = await postService.getPost(post._id);
        setSelectedPost(res.data.data);
        setIsWriting(false);
    };

    useEffect(() => {
        fetchPosts(1);
        setSelectedPost(null);
        setIsWriting(false);
    }, [boardType, fetchPosts]);

    const handleSubmit = async () => {
        if(!form.title.trim() || !form.content.trim()) return;
        if(editingId) {
            await postService.updatePost(editingId!, form);
        } else {
            await postService.createPost(boardType, form);
        }
        setForm({ title: '', content: '', isPinned: false, showModal: false });
        setIsWriting(false);
        setEditingId(null);
        fetchPosts(1);
    }

    const handleEdit = () => {
        if (!selectedPost) return;
        setForm({ title: selectedPost.title, content: selectedPost.content, isPinned: selectedPost.isPinned, showModal: selectedPost.showModal });
        setEditingId(selectedPost._id);
        setIsWriting(true);
        setSelectedPost(null);
    }

    const handleDelete = async () => {
        if (!selectedPost || !window.confirm('삭제하시겠습니까?')) return;
        await postService.deletePost(selectedPost._id);
        setSelectedPost(null);
        fetchPosts(pagination.page);
    };

    const canWrite = boardType === 'free' || isAdmin;
    const canManage = (post: Post) =>
        isAdmin || (!!currentUser && post.authorId?._id === currentUser.id);

    return (
        <div className="min-h-screen bg-gray-100">
            <header className="bg-white shadow">
                <div className="max-w-7xl mx-auto px-4 py-4 flex flex-wrap justify-between items-center gap-2">
                    <h1 className="text-2xl font-bold text-gray-900">스마트 가계부</h1>
                    <div className="flex items-center gap-2">
                        <span className="text-gray-700 hidden sm:inline">{user?.name}님</span>
                        <button onClick={handleLogout} className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 text-sm">
                            로그아웃
                        </button>
                    </div>
                </div>
            </header>

            <nav className="bg-white shadow-sm">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="flex gap-2 py-4 overflow-x-auto whitespace-nowrap">
                        <button onClick={() => navigate('/dashboard')} className="px-4 py-2 text-gray-600 hover:text-blue-600">대시보드</button>
                        <button onClick={() => navigate('/schedules')} className="px-4 py-2 text-gray-600 hover:text-blue-600">일정 관리</button>
                        <button onClick={() => navigate('/expenses')} className="px-4 py-2 text-gray-600 hover:text-blue-600">지출 관리</button>
                        <button onClick={() => navigate('/groups')} className="px-4 py-2 text-gray-600 hover:text-blue-600">그룹</button>
                        <button onClick={() => navigate('/board')} className="px-4 py-2 text-blue-600 border-b-2 border-blue-600 font-medium">게시판</button>
                        {isAdmin && (
                            <button onClick={() => navigate('/admin')} className="px-4 py-2 text-purple-600 hover:text-purple-800 font-medium">백오피스</button>
                        )}
                    </div>
                </div>
            </nav>

        <div className="max-w-4xl mx-auto p-6">
            {/* 탭 */}
            <div className="flex gap-2 mb-6">
                {(['notice', 'free'] as BoardType[]).map((type) => (
                    <button
                        key={type}
                        onClick={() => setBoardType(type)}
                        className={`px-4 py-2 rounded-lg font-medium ${
                            boardType === type ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
                        }`}
                    >
                        {type === 'notice' ? '📢 공지사항' : '💬 자유게시판'}
                    </button>
                ))}
            </div>

            {/* 상세 보기 */}
            {selectedPost ? (
                <div className="bg-white rounded-xl border p-6">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            {selectedPost.isPinned && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded mr-2">📌 고정</span>}
                            <h2 className="text-xl font-bold inline">{selectedPost.title}</h2>
                        </div>
                        <button onClick={() => setSelectedPost(null)} className="text-gray-400 hover:text-gray-600">✕</button>
                    </div>
                    <div className="text-sm text-gray-500 mb-4 flex items-center gap-2 flex-wrap">
                        <span>{selectedPost.authorId?.nickname ?? '(탈퇴한 회원)'}</span>
                        <span>·</span>
                        <span>{new Date(selectedPost.createdAt).toLocaleDateString()}</span>
                        <span>·</span>
                        <span>조회 {selectedPost.views}</span>
                        {selectedPost.showModal && (
                            <span className="text-xs bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded">📢 팝업 공지</span>
                        )}
                    </div>
                    <div className="whitespace-pre-wrap text-gray-800 mb-6">{selectedPost.content}</div>
                    {canManage(selectedPost) && (
                        <div className="flex gap-2 justify-end">
                            <button onClick={handleEdit} className="px-3 py-1.5 bg-gray-100 rounded hover:bg-gray-200 text-sm">수정</button>
                            <button onClick={handleDelete} className="px-3 py-1.5 bg-red-100 text-red-600 rounded hover:bg-red-200 text-sm">삭제</button>
                        </div>
                    )}
                </div>

                /* 작성/수정 폼 */
            ) : isWriting ? (
                <div className="bg-white rounded-xl border p-6">
                    <h3 className="font-bold text-lg mb-4">{editingId ? '게시글 수정' : '게시글 작성'}</h3>
                    <input
                        className="w-full border rounded p-2 mb-3"
                        placeholder="제목"
                        value={form.title}
                        onChange={(e) => setForm({ ...form, title: e.target.value })}
                    />
                    {isAdmin && boardType === 'notice' && (
                        <div className="flex flex-col gap-2 mb-3">
                            <label className="flex items-center gap-2 text-sm">
                                <input type="checkbox" checked={form.isPinned} onChange={(e) => setForm({ ...form, isPinned: e.target.checked })} />
                                상단 고정
                            </label>
                            <label className="flex items-center gap-2 text-sm">
                                <input type="checkbox" checked={form.showModal} onChange={(e) => setForm({ ...form, showModal: e.target.checked })} />
                                로그인 시 팝업으로 표시
                            </label>
                        </div>
                    )}
                    <textarea
                        className="w-full border rounded p-2 mb-4 h-40 resize-none"
                        placeholder="내용"
                        value={form.content}
                        onChange={(e) => setForm({ ...form, content: e.target.value })}
                    />
                    <div className="flex gap-2 justify-end">
                        <button onClick={() => { setIsWriting(false); setEditingId(null); }} className="px-4 py-2 bg-gray-100 rounded">취소</button>
                        <button onClick={handleSubmit} className="px-4 py-2 bg-blue-600 text-white rounded">등록</button>
                    </div>
                </div>

                /* 목록 */
            ) : (
                <>
                    <div className="flex justify-end mb-3">
                        {canWrite && (
                            <button onClick={() => setIsWriting(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">
                                + 글쓰기
                            </button>
                        )}
                    </div>
                    {loading ? (
                        <div className="text-center py-10 text-gray-400">로딩 중...</div>
                    ) : posts.length === 0 ? (
                        <div className="text-center py-10 text-gray-400">게시글이 없습니다.</div>
                    ) : (
                        <div className="bg-white rounded-xl border divide-y">
                            {posts.map((post) => (
                                <div
                                    key={post._id}
                                    onClick={() => handleSelectPost(post)}
                                    className="flex items-center px-4 py-3 cursor-pointer hover:bg-gray-50"
                                >
                                    {post.isPinned && <span className="text-xs text-red-500 mr-2">📌</span>}
                                    <span className="flex-1 font-medium truncate">{post.title}</span>
                                    <span className="text-xs text-gray-400 ml-4 hidden sm:inline">{post.authorId?.nickname ?? '(탈퇴한 회원)'}</span>
                                    <span className="text-xs text-gray-300 ml-3 hidden sm:inline">{new Date(post.createdAt).toLocaleDateString()}</span>
                                    <span className="text-xs text-gray-300 ml-3">👁 {post.views}</span>
                                </div>
                            ))}
                        </div>
                    )}
                    {/* 페이지네이션 */}
                    <div className="flex justify-center gap-2 mt-4">
                        {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((p) => (
                            <button
                                key={p}
                                onClick={() => fetchPosts(p)}
                                className={`w-8 h-8 rounded ${p === pagination.page ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
                            >
                                {p}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
        </div>
    );
}