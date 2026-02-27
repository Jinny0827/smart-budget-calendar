import api from './api';
import type { ApiResponse, Group, GroupSettings } from '../types';

// 그룹 생성 요청 (관리자 승인 대기)
export const createGroup = async (name: string): Promise<Group> => {
    const response = await api.post<ApiResponse<{ group: Group }>>('/groups', { name });
    return response.data.data!.group;
};

// 내가 속한 그룹 목록 조회
export const getMyGroups = async (): Promise<Group[]> => {
    const response = await api.get<ApiResponse<{ groups: Group[] }>>('/groups');
    return response.data.data!.groups;
};

// 특정 그룹 상세 조회
export const getGroupById = async (groupId: string): Promise<Group> => {
    const response = await api.get<ApiResponse<{ group: Group }>>(`/groups/${groupId}`);
    return response.data.data!.group;
};

// 그룹 설정 변경 (그룹장 전용)
export const updateSettings = async (
    groupId: string,
    settings: Partial<GroupSettings>,
): Promise<Group> => {
    const response = await api.patch<ApiResponse<{ group: Group }>>(
        `/groups/${groupId}/settings`,
        settings,
    );
    return response.data.data!.group;
};

// 초대 코드 재생성 (그룹장 전용)
export const refreshInviteCode = async (groupId: string): Promise<{ inviteCode: string }> => {
    const response = await api.patch<ApiResponse<{ inviteCode: string }>>(
        `/groups/${groupId}/invite-code/refresh`,
    );
    return response.data.data!;
};

// 멤버 초대 — 이메일로 초대 (그룹장 전용)
export const inviteMember = async (groupId: string, email: string): Promise<void> => {
    await api.post(`/groups/${groupId}/invite`, { email });
};

// 초대 응답 — 수락(accept) 또는 거절(decline)
export const respondToInvite = async (
    groupId: string,
    action: 'accept' | 'decline',
): Promise<void> => {
    await api.post(`/groups/${groupId}/respond`, { action });
};

// 코드 입력으로 참가 요청
export const joinByCode = async (inviteCode: string): Promise<void> => {
    await api.post('/groups/join', { inviteCode });
};

// 참가 요청 승인 (그룹장 전용)
export const approveMember = async (groupId: string, userId: string): Promise<void> => {
    await api.post(`/groups/${groupId}/approve`, { userId });
};

// 멤버 강퇴 / 본인 탈퇴 (그룹장 or 본인)
export const removeMember = async (groupId: string, userId: string): Promise<void> => {
    await api.delete(`/groups/${groupId}/members/${userId}`);
};

// 받은 초대 목록 조회 (나에게 온 대기 중인 초대)
export const getPendingInvites = async (): Promise<Group[]> => {
    const response = await api.get<ApiResponse<{ invites: Group[] }>>('/groups/invites');
    return response.data.data!.invites;
};