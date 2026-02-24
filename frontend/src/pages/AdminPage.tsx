import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser } from '../services/auth-service';
import { getUsers, approveUser, rejectUser, getGroups, approveGroup } from '../services/admin-service';
import type { User, Group } from '../types';

type TabType = 'users' | 'groups';

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

    useEffect(() => {
        if (tab === 'users') loadUsers();
        if (tab === 'groups') loadGroups();
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
        <div className="min-h-screen bg-gray-100 py-8 px-4">
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
                <div className="flex border-b mb-6">
                    <button
                        onClick={() => { setTab('users'); setMsg(''); }}
                        className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${tab === 'users' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        사용자 관리
                    </button>
                    <button
                        onClick={() => { setTab('groups'); setMsg(''); }}
                        className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${tab === 'groups' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        그룹 관리
                    </button>
                </div>

                {/* 사용자 탭 */}
                {tab === 'users' && (
                    <div className="bg-white rounded-lg shadow">
                        {/* 필터 */}
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
                        {/* 필터 */}
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
                                                <button
                                                    onClick={() => handleApproveGroup(g._id)}
                                                    disabled={actionLoading === g._id}
                                                    className="px-3 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600 disabled:bg-gray-300"
                                                >
                                                    {actionLoading === g._id ? '...' : '승인'}
                                                </button>
                                            )}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}

            </div>
        </div>
    );
}

export default AdminPage;
