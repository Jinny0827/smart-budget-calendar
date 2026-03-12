import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser } from '../services/auth-service';
import {
    getMyGroups,
    createGroup,
    getPendingInvites,
    respondToInvite,
    joinByCode,
    getGroupById,
    updateSettings,
    refreshInviteCode,
    inviteMember,
    approveMember,
    removeMember,
} from '../services/group-service';
import type { Group, GroupSettings } from '../types';

type View = 'list' | 'detail' | 'create';

function GroupPage() {
    const navigate = useNavigate();
    const currentUser = getCurrentUser();

    const [view, setView] = useState<View>('list');
    const [groups, setGroups] = useState<Group[]>([]);
    const [pendingInvites, setPendingInvites] = useState<Group[]>([]);
    const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
    const [loading, setLoading] = useState(true);
    const [msg, setMsg] = useState('');
    const [isError, setIsError] = useState(false);

    // 그룹 생성
    const [newGroupName, setNewGroupName] = useState('');
    const [createLoading, setCreateLoading] = useState(false);

    // 코드 참가
    const [joinCode, setJoinCode] = useState('');
    const [joinLoading, setJoinLoading] = useState(false);

    // 멤버 초대 (그룹장)
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteLoading, setInviteLoading] = useState(false);

    // 설정 변경 (그룹장)
    const [settings, setSettings] = useState<GroupSettings>({
        shareSchedules: false,
        shareExpenses: false,
        showAmounts: false,
        showMemberNames: true,
        mergedInsights: false,
    });
    const [settingsLoading, setSettingsLoading] = useState(false);

    const showMsg = (text: string, error = false) => {
        setMsg(text);
        setIsError(error);
        setTimeout(() => setMsg(''), 3000);
    };

    // 목록 + 초대 로드
    const loadList = useCallback(async () => {
        setLoading(true);
        try {
            const [myGroups, invites] = await Promise.all([
                getMyGroups(),
                getPendingInvites(),
            ]);
            setGroups(myGroups);
            setPendingInvites(invites);
        } catch {
            showMsg('그룹 목록을 불러오는데 실패했습니다.', true);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (view === 'list') loadList();
    }, [view, loadList]);

    // 그룹 상세 로드
    const openGroup = async (groupId: string) => {
        try {
            const g = await getGroupById(groupId);
            setSelectedGroup(g);
            setSettings(g.settings);
            setView('detail');
        } catch {
            showMsg('그룹 정보를 불러오는데 실패했습니다.', true);
        }
    };

    // 그룹 생성
    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreateLoading(true);
        try {
            await createGroup(newGroupName);
            setNewGroupName('');
            showMsg('그룹 생성 요청이 접수되었습니다. 관리자 승인 후 활성화됩니다.');
            setView('list');
        } catch (err: any) {
            showMsg(err.response?.data?.message || '그룹 생성에 실패했습니다.', true);
        } finally {
            setCreateLoading(false);
        }
    };

    // 초대 응답
    const handleRespond = async (groupId: string, action: 'accept' | 'decline') => {
        try {
            await respondToInvite(groupId, action);
            showMsg(action === 'accept' ? '그룹에 참가했습니다.' : '초대를 거절했습니다.');
            loadList();
        } catch (err: any) {
            showMsg(err.response?.data?.message || '처리에 실패했습니다.', true);
        }
    };

    // 코드 참가
    const handleJoin = async (e: React.FormEvent) => {
        e.preventDefault();
        setJoinLoading(true);
        try {
            await joinByCode(joinCode.trim().toUpperCase());
            setJoinCode('');
            showMsg('참가 요청을 보냈습니다. 그룹장 승인 후 참가됩니다.');
            loadList();
        } catch (err: any) {
            showMsg(err.response?.data?.message || '코드가 올바르지 않습니다.', true);
        } finally {
            setJoinLoading(false);
        }
    };

    // 멤버 초대 (그룹장)
    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedGroup) return;
        setInviteLoading(true);
        try {
            await inviteMember(selectedGroup._id, inviteEmail);
            setInviteEmail('');
            showMsg('초대를 보냈습니다.');
        } catch (err: any) {
            showMsg(err.response?.data?.message || '초대에 실패했습니다.', true);
        } finally {
            setInviteLoading(false);
        }
    };

    // 코드 재생성
    const handleRefreshCode = async () => {
        if (!selectedGroup) return;
        try {
            const { inviteCode } = await refreshInviteCode(selectedGroup._id);
            setSelectedGroup((prev) => prev ? { ...prev, inviteCode } : prev);
            showMsg('초대 코드가 갱신되었습니다.');
        } catch {
            showMsg('코드 갱신에 실패했습니다.', true);
        }
    };

    // 설정 저장
    const handleSaveSettings = async () => {
        if (!selectedGroup) return;
        setSettingsLoading(true);
        try {
            const updated = await updateSettings(selectedGroup._id, settings);
            setSelectedGroup(updated);
            showMsg('설정이 저장되었습니다.');
        } catch {
            showMsg('설정 저장에 실패했습니다.', true);
        } finally {
            setSettingsLoading(false);
        }
    };

    // 멤버 승인 (그룹장)
    const handleApproveMember = async (userId: string) => {
        if (!selectedGroup) return;
        try {
            await approveMember(selectedGroup._id, userId);
            const updated = await getGroupById(selectedGroup._id);
            setSelectedGroup(updated);
            showMsg('멤버를 승인했습니다.');
        } catch {
            showMsg('승인에 실패했습니다.', true);
        }
    };

    // 멤버 강퇴/탈퇴
    const handleRemoveMember = async (userId: string) => {
        if (!selectedGroup) return;
        const isSelf = userId === currentUser?.id;
        if (!window.confirm(isSelf ? '그룹에서 탈퇴하시겠습니까?' : '이 멤버를 강퇴하시겠습니까?')) return;
        try {
            await removeMember(selectedGroup._id, userId);
            if (isSelf) {
                setView('list');
                loadList();
            } else {
                const updated = await getGroupById(selectedGroup._id);
                setSelectedGroup(updated);
            }
            showMsg(isSelf ? '그룹에서 탈퇴했습니다.' : '멤버를 강퇴했습니다.');
        } catch {
            showMsg('처리에 실패했습니다.', true);
        }
    };

    const isLeader = (group: Group) => {
        const lid = typeof group.leaderId === 'string'
            ? group.leaderId
            : (group.leaderId as any)?._id;
        return lid === currentUser?.id;
    };

    const getMemberId = (userId: any): string =>
        typeof userId === 'object' ? userId._id : userId;

    const getMemberName = (userId: any): string =>
        typeof userId === 'object' ? (userId.nickname || userId.name) : userId;


    const settingLabels: Record<keyof GroupSettings, string> = {
        shareSchedules: '일정 공유',
        shareExpenses: '지출 공유',
        showAmounts: '금액 공개',
        showMemberNames: '멤버 이름 공개',
        mergedInsights: '통합 AI 인사이트',
    };

    const memberStatusLabel: Record<string, string> = {
        active: '활성',
        leader_invited: '초대 대기',
        member_requested: '참가 요청',
        declined: '거절됨',
    };

    return (
        <div className="min-h-screen bg-gray-100 py-8 px-4">
            <div className="max-w-2xl mx-auto space-y-4">

                {/* 헤더 */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => view === 'list' ? navigate('/dashboard') : setView('list')}
                        className="text-gray-500 hover:text-gray-700 text-sm"
                    >
                        ← {view === 'list' ? '대시보드' : '목록으로'}
                    </button>
                    <h1 className="text-2xl font-bold">
                        {view === 'list' && '그룹'}
                        {view === 'create' && '그룹 만들기'}
                        {view === 'detail' && (selectedGroup?.name || '그룹 상세')}
                    </h1>
                </div>

                {msg && (
                    <div className={`p-3 rounded text-sm ${isError ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                        {msg}
                    </div>
                )}

                {/* ── 목록 뷰 ── */}
                {view === 'list' && (
                    <>
                        {/* 받은 초대 */}
                        {pendingInvites.length > 0 && (
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-3">
                                <h2 className="font-semibold text-yellow-800 text-sm">📩 받은 초대</h2>
                                {pendingInvites.map((g) => (
                                    <div key={g._id} className="flex items-center justify-between">
                                        <span className="text-sm font-medium">{g.name}</span>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleRespond(g._id, 'accept')}
                                                className="px-3 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600"
                                            >
                                                수락
                                            </button>
                                            <button
                                                onClick={() => handleRespond(g._id, 'decline')}
                                                className="px-3 py-1 bg-gray-300 text-gray-700 text-xs rounded hover:bg-gray-400"
                                            >
                                                거절
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* 코드로 참가 */}
                        <div className="bg-white rounded-lg shadow p-4">
                            <h2 className="font-semibold mb-3 text-sm">코드로 참가</h2>
                            <form onSubmit={handleJoin} className="flex gap-2">
                                <input
                                    type="text"
                                    value={joinCode}
                                    onChange={(e) => setJoinCode(e.target.value)}
                                    placeholder="초대 코드 입력"
                                    maxLength={6}
                                    className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                                />
                                <button
                                    type="submit"
                                    disabled={joinLoading || joinCode.length < 6}
                                    className="px-4 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 disabled:bg-gray-400"
                                >
                                    {joinLoading ? '...' : '참가'}
                                </button>
                            </form>
                        </div>

                        {/* 내 그룹 목록 */}
                        <div className="bg-white rounded-lg shadow">
                            <div className="flex items-center justify-between p-4 border-b">
                                <h2 className="font-semibold text-sm">내 그룹</h2>
                                <button
                                    onClick={() => setView('create')}
                                    className="px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
                                >
                                    + 그룹 만들기
                                </button>
                            </div>

                            {loading ? (
                                <p className="p-6 text-center text-gray-500 text-sm">불러오는 중...</p>
                            ) : groups.length === 0 ? (
                                <p className="p-6 text-center text-gray-400 text-sm">참여 중인 그룹이 없습니다.</p>
                            ) : (
                                <ul className="divide-y">
                                    {groups.map((g) => (
                                        <li key={g._id}>
                                            <button
                                                onClick={() => openGroup(g._id)}
                                                className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50"
                                            >
                                                <div>
                                                    <p className="font-medium text-sm">{g.name}</p>
                                                    <p className="text-xs text-gray-500">
                                                        멤버 {(g.members ?? []).filter(m => m.status === 'active').length}명
                                                        {isLeader(g) && <span className="ml-2 text-purple-600">그룹장</span>}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className={`px-2 py-0.5 rounded text-xs ${g.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                        {g.status === 'active' ? '활성' : '승인 대기'}
                                                    </span>
                                                    <span className="text-gray-400 text-sm">›</span>
                                                </div>
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </>
                )}

                {/* ── 그룹 생성 뷰 ── */}
                {view === 'create' && (
                    <div className="bg-white rounded-lg shadow p-6">
                        <p className="text-sm text-gray-500 mb-4">
                            그룹 생성 요청 후 관리자 승인이 필요합니다.
                        </p>
                        <form onSubmit={handleCreate} className="space-y-3">
                            <input
                                type="text"
                                value={newGroupName}
                                onChange={(e) => setNewGroupName(e.target.value)}
                                placeholder="그룹 이름"
                                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            />
                            <button
                                type="submit"
                                disabled={createLoading}
                                className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 disabled:bg-gray-400"
                            >
                                {createLoading ? '요청 중...' : '생성 요청'}
                            </button>
                        </form>
                    </div>
                )}

                {/* ── 그룹 상세 뷰 ── */}
                {view === 'detail' && selectedGroup && (
                    <>
                        {/* 멤버 목록 */}
                        <div className="bg-white rounded-lg shadow">
                            <h2 className="font-semibold p-4 border-b text-sm">멤버</h2>
                            <ul className="divide-y">
                                {selectedGroup.members.map((m) => (
                                    <li key={getMemberId(m.userId)} className="p-4 flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium">
                                                {getMemberName(m.userId)}   {/* ← 객체 → 이름 */}
                                                {getMemberId(m.userId) === getMemberId(selectedGroup.leaderId) && (
                                                    <span className="ml-2 text-xs text-purple-600">그룹장</span>
                                                )}
                                                {getMemberId(m.userId) === currentUser?.id && (
                                                    <span className="ml-2 text-xs text-blue-600">나</span>
                                                )}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                {memberStatusLabel[m.status] || m.status}
                                                {' · '}{m.method === 'invite' ? '초대' : '코드'}
                                            </p>
                                        </div>
                                        <div className="flex gap-2">
                                            {isLeader(selectedGroup) && m.status === 'member_requested' && (
                                                <button
                                                    onClick={() => handleApproveMember(getMemberId(m.userId))}
                                                    className="px-2 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600"
                                                >
                                                    승인
                                                </button>
                                            )}
                                            {(isLeader(selectedGroup) && getMemberId(m.userId) !== getMemberId(selectedGroup.leaderId)) ||
                                            (getMemberId(m.userId) === currentUser?.id && !isLeader(selectedGroup)) ? (
                                                <button
                                                    onClick={() => handleRemoveMember(getMemberId(m.userId))}
                                                    className="px-2 py-1 bg-red-100 text-red-600 text-xs rounded hover:bg-red-200"
                                                >
                                                    {getMemberId(m.userId) === currentUser?.id ? '탈퇴' : '강퇴'}
                                                </button>
                                            ) : null}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* 그룹장 전용 섹션 */}
                        {isLeader(selectedGroup) && (
                            <>
                                {/* 이메일 초대 */}
                                <div className="bg-white rounded-lg shadow p-4">
                                    <h2 className="font-semibold mb-3 text-sm">이메일로 초대</h2>
                                    <form onSubmit={handleInvite} className="flex gap-2">
                                        <input
                                            type="email"
                                            value={inviteEmail}
                                            onChange={(e) => setInviteEmail(e.target.value)}
                                            placeholder="초대할 이메일"
                                            className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                        <button
                                            type="submit"
                                            disabled={inviteLoading}
                                            className="px-4 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 disabled:bg-gray-400"
                                        >
                                            {inviteLoading ? '...' : '초대'}
                                        </button>
                                    </form>
                                </div>

                                {/* 초대 코드 */}
                                <div className="bg-white rounded-lg shadow p-4">
                                    <h2 className="font-semibold mb-3 text-sm">초대 코드</h2>
                                    <div className="flex items-center gap-3">
                                        <span className="font-mono text-2xl tracking-widest font-bold text-blue-600">
                                            {selectedGroup.inviteCode}
                                        </span>
                                        <button
                                            onClick={handleRefreshCode}
                                            className="px-3 py-1 bg-gray-100 text-gray-600 text-xs rounded hover:bg-gray-200"
                                        >
                                            코드 재생성
                                        </button>
                                    </div>
                                </div>

                                {/* 공유 설정 */}
                                <div className="bg-white rounded-lg shadow p-4">
                                    <h2 className="font-semibold mb-4 text-sm">공유 설정</h2>
                                    <div className="space-y-3">
                                        {(Object.keys(settingLabels) as (keyof GroupSettings)[]).map((key) => (
                                            <label key={key} className="flex items-center justify-between cursor-pointer">
                                                <span className="text-sm text-gray-700">{settingLabels[key]}</span>
                                                <input
                                                    type="checkbox"
                                                    checked={settings[key]}
                                                    onChange={(e) =>
                                                        setSettings((prev) => ({ ...prev, [key]: e.target.checked }))
                                                    }
                                                    className="w-4 h-4 accent-blue-500"
                                                />
                                            </label>
                                        ))}
                                    </div>
                                    <button
                                        onClick={handleSaveSettings}
                                        disabled={settingsLoading}
                                        className="mt-4 w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 disabled:bg-gray-400 text-sm"
                                    >
                                        {settingsLoading ? '저장 중...' : '설정 저장'}
                                    </button>
                                </div>
                            </>
                        )}
                    </>
                )}

            </div>
        </div>
    );
}

export default GroupPage;
