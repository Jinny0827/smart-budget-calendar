import { useState } from 'react';
import { useChat } from '../hooks/useChat';
import type { Group, User } from '../types';

interface ChatPanelProps {
    onClose: () => void;
    currentUser: User;
    myGroups: Group[];
}

// 채팅방 목록에서 선택한 대상
interface ChatTarget {
    chatType: 'group' | 'direct';
    targetId: string;
    name: string;
}

export const ChatPanel = ({ onClose, currentUser, myGroups }: ChatPanelProps) => {
    const [selected, setSelected] = useState<ChatTarget | null>(null);
    const [tab, setTab] = useState<'group' | 'direct'>('group');
    const [input, setInput] = useState('');

    const { messages, loading, sending, sendMessage } = useChat(selected
            ? { chatType: selected.chatType, targetId: selected.targetId, myId: currentUser.id }
            : { chatType: 'group', targetId: '', myId: currentUser.id }
    );

    // 메시지 전송 핸들러
    const handleSend = async () => {
        if(!input.trim() || !selected) return;
        await sendMessage(input);
        setInput('');
    }
    
    // uid 추출 헬퍼 (컴포넌트 상단 또는 함수 내부)
    const getUid = (userId: any): string => {
        if(typeof userId === 'object' && userId) {
            return userId.id || userId._id?.toString() || '';
        }

        return userId || '';
    }
    

    // 그룹 멤버에 대한 아이디 필터 처리
    const contacts = myGroups
        .flatMap((g) => {
            const memberIds = new Set(g.members.map((m) => getUid(m.userId)));
            const leaderUid = getUid(g.leaderId);
            const extraLeader = !memberIds.has(leaderUid) && g.leaderId
                    ? [{ userId: g.leaderId, status: 'active' as const, method: 'invite' as const, requestedAt: '' }]
                    : [];
            return [...g.members, ...extraLeader];
        })
        .filter((m) => {
            const uid = getUid(m.userId);
            return m.status === 'active' && uid !== currentUser.id;
        })
        .filter((m, i, arr) => {
            const uid = getUid(m.userId);
            return arr.findIndex((x) => getUid(x.userId) === uid) === i
        });

    // 그룹장에 대한 뱃지 처리
    const currentGroup = selected?.chatType === 'group'
        ? myGroups.find(g => g._id === selected.targetId)
        : null;

    const getLeaderId = (leaderId: any) =>
        typeof leaderId === 'object' ? leaderId._id : leaderId;


    return (
        <div className="fixed bottom-24 right-6 z-50 w-80 h-[500px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200">

            {/* 헤더 */}
            <div className="flex items-center justify-between px-4 py-3 bg-blue-500 text-white">
            <span className="font-semibold">
                {selected ? selected.name : '채팅'}
            </span>
                <div className="flex gap-2">
                    {selected && (
                        <button onClick={() => setSelected(null)} className="text-sm opacity-80 hover:opacity-100">
                            ← 목록
                        </button>
                    )}
                    <button onClick={onClose} className="text-xl leading-none hover:opacity-80">×</button>
                </div>
            </div>

            {/* 탭 - 목록 화면일 때만 표시 */}
            {!selected && (
                <div className="flex border-b border-gray-100">
                    <button
                        onClick={() => setTab('group')}
                        className={`flex-1 py-2 text-sm font-medium ${tab === 'group' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-400'}`}
                    >
                        그룹
                    </button>
                    <button
                        onClick={() => setTab('direct')}
                        className={`flex-1 py-2 text-sm font-medium ${tab === 'direct' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-400'}`}
                    >
                        개인
                    </button>
                </div>
            )}

            {/* 그룹 목록 */}
            {!selected && tab === 'group' && (
                <div className="flex-1 overflow-y-auto">
                    {myGroups.length === 0 && (
                        <p className="text-center text-gray-400 mt-10 text-sm">참여 중인 그룹이 없습니다</p>
                    )}
                    {myGroups.map((group) => (
                        <button
                            key={group._id}
                            onClick={() => setSelected({ chatType: 'group', targetId: group._id, name: group.name })}
                            className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 flex items-center gap-3"
                        >
                            <span className="text-xl">👥</span>
                            <span className="text-sm font-medium">{group.name}</span>
                        </button>
                    ))}
                </div>
            )}

            {/* 개인 목록 */}
            {!selected && tab === 'direct' && (
                <div className="flex-1 overflow-y-auto">
                    {contacts.length === 0 && (
                        <p className="text-center text-gray-400 mt-10 text-sm">
                            그룹에 참여하면<br />대화 상대가 표시됩니다
                        </p>
                    )}
                    {contacts.map((contact) => {
                        const uid = getUid(contact.userId);
                        const name = typeof contact.userId === 'object'
                            ? ((contact.userId as any).nickname || (contact.userId as any).name || '알 수 없음')
                            : contact.userId;

                        return (
                            <button
                                key={uid}
                                onClick={() => setSelected({ chatType: 'direct', targetId: uid, name })}
                                className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 flex items-center gap-3"
                            >
                                <span className="text-xl">👤</span>
                                <span className="text-sm font-medium">{name}</span>
                            </button>
                        );
                    })}
                </div>
            )}

            {/* 메시지 목록 */}
            {selected && (
                <>
                    <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
                        {loading && (
                            <p className="text-center text-gray-400 text-sm mt-4">불러오는 중...</p>
                        )}
                        {messages.map((msg) => {

                            const isMine = (
                                typeof msg.senderId === 'object'
                                    ? msg.senderId._id
                                    : msg.senderId
                                ) === currentUser.id;

                            return (
                                <div key={msg._id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                                    {!isMine && (
                                        <span className="text-xs text-gray-400 mb-1 flex items-center gap-1">
                                            {msg.senderId.nickname ?? msg.senderId.name}
                                            {currentGroup && msg.senderId._id === getLeaderId(currentGroup.leaderId) && (
                                                <span className="text-[10px] bg-purple-100 text-purple-600 px-1 py-0.5 rounded-full">
                                                    👑 그룹장
                                                </span>
                                            )}
                                        </span>
                                    )}
                                    <div className={`max-w-[70%] px-3 py-2 rounded-2xl text-sm ${
                                        isMine
                                            ? 'bg-blue-500 text-white rounded-br-sm'
                                            : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                                    }`}>
                                        {msg.content}
                                    </div>
                                    <span className="text-[10px] text-gray-300 mt-1">
                                    {new Date(msg.createdAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                </div>
                            );
                        })}
                    </div>

                    {/* 입력창 */}
                    <div className="flex items-center gap-2 p-3 border-t border-gray-100">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            placeholder="메시지 입력..."
                            className="flex-1 text-sm px-3 py-2 rounded-full border border-gray-200 outline-none focus:border-blue-400"
                        />
                        <button
                            onClick={handleSend}
                            disabled={sending || !input.trim()}
                            className="w-9 h-9 bg-blue-500 hover:bg-blue-600 disabled:opacity-40 text-white rounded-full flex items-center justify-center transition-all"
                        >
                            ➤
                        </button>
                    </div>
                </>
            )}
        </div>
    );

}
