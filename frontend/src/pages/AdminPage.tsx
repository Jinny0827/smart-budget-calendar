import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser } from '../services/auth-service';
import {
    getUsers, approveUser, rejectUser,
    getGroups, approveGroup, rejectGroup,
    getAllCategories, createCategory, updateCategory, deleteCategory,
} from '../services/admin-service';
import type { Category } from '../services/admin-service';
import type { User, Group } from '../types';

type TabType = 'users' | 'groups' | 'categories';

function AdminPage() {
    const navigate = useNavigate();
    const [tab, setTab] = useState<TabType>('users');

    // 사용자 목록
    const [users, setUsers] = useState<User[]>([]);
    const [userFilter, setUserFilter] = useState<'pending' | 'approved' | 'rejected' | ''>('pending');
    const [usersLoading, setUsersLoading] = useState(false);

    // 그룹 목록
    const [groups, setGroups] = useState<Group[]>([]);
    const [groupFilter, setGroupFilter] = useState<'pending' | 'active' | ''>('pending');
    const [groupsLoading, setGroupsLoading] = useState(false);

    // 카테고리
    const [categories, setCategories] = useState<Category[]>([]);
    const [catLoading, setCatLoading] = useState(false);
    const [catForm, setCatForm] = useState({ name: '', color: '#B0BEC5' });
    const [editingCat, setEditingCat] = useState<Category | null>(null);

    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [msg, setMsg] = useState('');

    // 관리자 권한 확인
    useEffect(() => {
        const me = getCurrentUser();
        if (!me || me.role !== 'admin') {
            navigate('/dashboard');
        }
    }, [navigate]);

    // 사용자 목록 로드
    const loadUsers = async () => {
        setUsersLoading(true);
        setMsg('');
        try {
            const data = await getUsers(userFilter || undefined);
            setUsers(data);
        } catch {
            setMsg('사용자 목록을 불러오는데 실패했습니다.');
        } finally {
            setUsersLoading(false);
        }
    };

    // 그룹 목록 로드
    const loadGroups = async () => {
        setGroupsLoading(true);
        setMsg('');
        try {
            const data = await getGroups(groupFilter || undefined);
            setGroups(data);
        } catch {
            setMsg('그룹 목록을 불러오는데 실패했습니다.');
        } finally {
            setGroupsLoading(false);
        }
    };

    // 카테고리 목록 로드
    const loadCategories = async () => {
        setCatLoading(true);
        setMsg('');
        try {
            const data = await getAllCategories();
            setCategories(data);
        } catch {
            setMsg('카테고리 목록을 불러오는데 실패했습니다.');
        } finally {
            setCatLoading(false);
        }
    };

    useEffect(() => {
        if (tab === 'users') loadUsers();
        if (tab === 'groups') loadGroups();
        if (tab === 'categories') loadCategories();
    }, [tab, userFilter, groupFilter]);

    // 사용자 승인
    const handleApproveUser = async (userId: string) => {
        setActionLoading(userId);
        try {
            await approveUser(userId);
            setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, status: 'approved' } : u));
            setMsg('사용자를 승인했습니다.');
        } catch {
            setMsg('승인에 실패했습니다.');
        } finally {
            setActionLoading(null);
        }
    };

    // 사용자 거절
    const handleRejectUser = async (userId: string) => {
        setActionLoading(userId + '_reject');
        try {
            await rejectUser(userId);
            setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, status: 'rejected' } : u));
            setMsg('사용자를 거절했습니다.');
        } catch {
            setMsg('거절에 실패했습니다.');
        } finally {
            setActionLoading(null);
        }
    };

    // 그룹 승인
    const handleApproveGroup = async (groupId: string) => {
        setActionLoading(groupId);
        try {
            await approveGroup(groupId);
            setGroups((prev) => prev.map((g) => g._id === groupId ? { ...g, status: 'active' } : g));
            setMsg('그룹을 승인했습니다.');
        } catch {
            setMsg('승인에 실패했습니다.');
        } finally {
            setActionLoading(null);
        }
    };

    // 그룹 거절
    const handleRejectGroup = async (groupId: string) => {
        setActionLoading(groupId + '_reject');
        try {
            await rejectGroup(groupId);
            setGroups((prev) => prev.filter((g) => g._id !== groupId));
            setMsg('그룹을 거절했습니다.');
        } catch {
            setMsg('거절에 실패했습니다.');
        } finally {
            setActionLoading(null);
        }
    };

    // 카테고리 추가/수정 저장
    const handleSaveCategory = async () => {
        if (!catForm.name.trim()) return;
        setActionLoading('cat_save');
        try {
            if (editingCat) {
                const updated = await updateCategory(editingCat._id, { name: catForm.name, color: catForm.color });
                setCategories((prev) => prev.map((c) => c._id === editingCat._id ? updated : c));
                setMsg(`"${updated.name}" 카테고리가 수정되었습니다.`);
            } else {
                const created = await createCategory({ name: catForm.name, color: catForm.color });
                setCategories((prev) => [...prev, created]);
                setMsg(`"${created.name}" 카테고리가 추가되었습니다.`);
            }
            setCatForm({ name: '', color: '#B0BEC5' });
            setEditingCat(null);
        } catch (err: any) {
            setMsg(err.response?.data?.message || '저장에 실패했습니다.');
        } finally {
            setActionLoading(null);
        }
    };

    // 카테고리 활성/비활성 토글
    const handleToggleActive = async (cat: Category) => {
        setActionLoading('cat_toggle_' + cat._id);
        try {
            const updated = await updateCategory(cat._id, { isActive: !cat.isActive });
            setCategories((prev) => prev.map((c) => c._id === cat._id ? updated : c));
            setMsg(`"${updated.name}" ${updated.isActive ? '활성화' : '비활성화'}되었습니다.`);
        } catch {
            setMsg('변경에 실패했습니다.');
        } finally {
            setActionLoading(null);
        }
    };

    // 카테고리 삭제
    const handleDeleteCategory = async (cat: Category) => {
        if (!window.confirm(`"${cat.name}" 카테고리를 삭제하시겠습니까?`)) return;
        setActionLoading('cat_del_' + cat._id);
        try {
            await deleteCategory(cat._id);
            setCategories((prev) => prev.filter((c) => c._id !== cat._id));
            setMsg(`"${cat.name}" 카테고리가 삭제되었습니다.`);
        } catch {
            setMsg('삭제에 실패했습니다.');
        } finally {
            setActionLoading(null);
        }
    };

    const statusBadge = (status: string) => {
        const styles: Record<string, string> = {
            pending: 'bg-yellow-100 text-yellow-700',
            approved: 'bg-green-100 text-green-700',
            active: 'bg-green-100 text-green-700',
            rejected: 'bg-red-100 text-red-700',
        };
        const labels: Record<string, string> = {
            pending: '대기',
            approved: '승인됨',
            active: '활성',
            rejected: '거절됨',
        };
        return (
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-600'}`}>
                {labels[status] || status}
            </span>
        );
    };

    return (
        <div className="max-w-3xl mx-auto">

                <div className="flex items-center gap-3 mb-6">
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="text-gray-500 hover:text-gray-700 text-sm"
                    >
                        ← 대시보드
                    </button>
                    <h1 className="text-2xl font-bold">백오피스</h1>
                </div>

                {msg && (
                    <div className="mb-4 p-3 bg-blue-50 text-blue-700 rounded text-sm">
                        {msg}
                    </div>
                )}

                {/* 탭 */}
                <div className="flex border-b mb-6 overflow-x-auto whitespace-nowrap">
                    {([
                        { key: 'users',      label: '사용자 관리' },
                        { key: 'groups',     label: '그룹 관리' },
                        { key: 'categories', label: '카테고리 관리' },
                    ] as { key: TabType; label: string }[]).map(({ key, label }) => (
                        <button
                            key={key}
                            onClick={() => { setTab(key); setMsg(''); setEditingCat(null); setCatForm({ name: '', color: '#B0BEC5' }); }}
                            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                                tab === key ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                {/* 사용자 탭 */}
                {tab === 'users' && (
                    <div className="bg-white rounded-lg shadow">
                        <div className="flex gap-2 p-4 border-b">
                            {(['pending', 'approved', 'rejected', ''] as const).map((f) => (
                                <button
                                    key={f}
                                    onClick={() => setUserFilter(f)}
                                    className={`px-3 py-1 rounded text-sm ${userFilter === f ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                                >
                                    {f === '' ? '전체' : f === 'pending' ? '대기' : f === 'approved' ? '승인됨' : '거절됨'}
                                </button>
                            ))}
                        </div>

                        {usersLoading ? (
                            <p className="p-6 text-center text-gray-500 text-sm">불러오는 중...</p>
                        ) : users.length === 0 ? (
                            <p className="p-6 text-center text-gray-400 text-sm">해당 사용자가 없습니다.</p>
                        ) : (
                            <ul className="divide-y">
                                {users.map((u) => (
                                    <li key={u.id} className="p-4 flex items-center justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-sm truncate">{u.name}</p>
                                            <p className="text-xs text-gray-500 truncate">{u.email}</p>
                                            {u.nickname && (
                                                <p className="text-xs text-gray-400">닉네임: {u.nickname}</p>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            {statusBadge(u.status)}
                                            {u.status === 'pending' && (
                                                <>
                                                    <button
                                                        onClick={() => handleApproveUser(u.id)}
                                                        disabled={actionLoading === u.id}
                                                        className="px-3 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600 disabled:bg-gray-300"
                                                    >
                                                        {actionLoading === u.id ? '...' : '승인'}
                                                    </button>
                                                    <button
                                                        onClick={() => handleRejectUser(u.id)}
                                                        disabled={actionLoading === u.id + '_reject'}
                                                        className="px-3 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600 disabled:bg-gray-300"
                                                    >
                                                        {actionLoading === u.id + '_reject' ? '...' : '거절'}
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}

                {/* 그룹 탭 */}
                {tab === 'groups' && (
                    <div className="bg-white rounded-lg shadow">
                        <div className="flex gap-2 p-4 border-b">
                            {(['pending', 'active', ''] as const).map((f) => (
                                <button
                                    key={f}
                                    onClick={() => setGroupFilter(f)}
                                    className={`px-3 py-1 rounded text-sm ${groupFilter === f ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                                >
                                    {f === '' ? '전체' : f === 'pending' ? '승인 대기' : '활성'}
                                </button>
                            ))}
                        </div>

                        {groupsLoading ? (
                            <p className="p-6 text-center text-gray-500 text-sm">불러오는 중...</p>
                        ) : groups.length === 0 ? (
                            <p className="p-6 text-center text-gray-400 text-sm">해당 그룹이 없습니다.</p>
                        ) : (
                            <ul className="divide-y">
                                {groups.map((g) => (
                                    <li key={g._id} className="p-4 flex items-center justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-sm">{g.name}</p>
                                            <p className="text-xs text-gray-500">멤버 {g.members.length}명</p>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            {statusBadge(g.status)}
                                            {g.status === 'pending' && (
                                                <>
                                                    <button
                                                        onClick={() => handleApproveGroup(g._id)}
                                                        disabled={actionLoading === g._id}
                                                        className="px-3 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600 disabled:bg-gray-300"
                                                    >
                                                        {actionLoading === g._id ? '...' : '승인'}
                                                    </button>
                                                    <button
                                                        onClick={() => handleRejectGroup(g._id)}
                                                        disabled={actionLoading === g._id + '_reject'}
                                                        className="px-3 py-1 bg-red-100 text-red-600 text-xs rounded hover:bg-red-200 disabled:opacity-50"
                                                    >
                                                        {actionLoading === g._id + '_reject' ? '...' : '거절'}
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}

                {/* 카테고리 탭 */}
                {tab === 'categories' && (
                    <div className="space-y-4">
                        {/* 추가/수정 폼 */}
                        <div className="bg-white rounded-lg shadow p-4">
                            <h3 className="font-medium text-sm mb-3">
                                {editingCat ? `"${editingCat.name}" 수정` : '카테고리 추가'}
                            </h3>
                            <div className="flex flex-wrap gap-2 items-center">
                                <input
                                    className="flex-1 min-w-0 border rounded px-3 py-2 text-sm"
                                    placeholder="카테고리 이름"
                                    value={catForm.name}
                                    onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSaveCategory()}
                                />
                                <div className="flex items-center gap-1">
                                    <label className="text-xs text-gray-500">색상</label>
                                    <input
                                        type="color"
                                        value={catForm.color}
                                        onChange={(e) => setCatForm({ ...catForm, color: e.target.value })}
                                        className="w-8 h-8 rounded cursor-pointer border"
                                    />
                                </div>
                                <button
                                    onClick={handleSaveCategory}
                                    disabled={actionLoading === 'cat_save' || !catForm.name.trim()}
                                    className="px-4 py-2 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 disabled:bg-gray-300"
                                >
                                    {editingCat ? '수정' : '추가'}
                                </button>
                                {editingCat && (
                                    <button
                                        onClick={() => { setEditingCat(null); setCatForm({ name: '', color: '#B0BEC5' }); }}
                                        className="px-4 py-2 bg-gray-100 text-gray-600 text-sm rounded hover:bg-gray-200"
                                    >
                                        취소
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* 카테고리 목록 */}
                        <div className="bg-white rounded-lg shadow">
                            {catLoading ? (
                                <p className="p-6 text-center text-gray-500 text-sm">불러오는 중...</p>
                            ) : categories.length === 0 ? (
                                <p className="p-6 text-center text-gray-400 text-sm">카테고리가 없습니다.</p>
                            ) : (
                                <ul className="divide-y">
                                    {categories.map((cat) => (
                                        <li key={cat._id} className={`p-4 flex items-center justify-between gap-4 ${!cat.isActive ? 'opacity-50' : ''}`}>
                                            <div className="flex items-center gap-3">
                                                <span
                                                    className="w-4 h-4 rounded-full shrink-0"
                                                    style={{ backgroundColor: cat.color }}
                                                />
                                                <span className="text-sm font-medium">{cat.name}</span>
                                                {!cat.isActive && (
                                                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">비활성</span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <button
                                                    onClick={() => { setEditingCat(cat); setCatForm({ name: cat.name, color: cat.color }); setMsg(''); }}
                                                    className="px-3 py-1 bg-gray-100 text-gray-600 text-xs rounded hover:bg-gray-200"
                                                >
                                                    수정
                                                </button>
                                                <button
                                                    onClick={() => handleToggleActive(cat)}
                                                    disabled={!!actionLoading}
                                                    className={`px-3 py-1 text-xs rounded ${cat.isActive ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' : 'bg-green-100 text-green-700 hover:bg-green-200'} disabled:opacity-50`}
                                                >
                                                    {cat.isActive ? '비활성화' : '활성화'}
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteCategory(cat)}
                                                    disabled={!!actionLoading}
                                                    className="px-3 py-1 bg-red-100 text-red-600 text-xs rounded hover:bg-red-200 disabled:opacity-50"
                                                >
                                                    삭제
                                                </button>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                )}

        </div>
    );
}

export default AdminPage;
