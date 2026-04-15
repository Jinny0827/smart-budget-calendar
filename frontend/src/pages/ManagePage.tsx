import { useState } from 'react';
import AccountPage from './AccountPage';
import GroupPage from './GroupPage';

type Tab = 'account' | 'group';

const MENU_ITEMS: { key: Tab; label: string; icon: string }[] = [
    { key: 'account', label: '계정 관리', icon: '👤' },
    { key: 'group',   label: '그룹 관리', icon: '👥' },
];

function ManagePage() {
    const [tab, setTab] = useState<Tab>('account');

    return (
        <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-start">

            {/* ── 사이드바 ── */}
            <aside className="w-full md:w-52 shrink-0">
                <div className="bg-white rounded-2xl overflow-hidden">
                    <div className="px-5 py-4 border-b border-[#F2F4F6]">
                        <p className="text-xs font-semibold text-[#8B95A1] uppercase tracking-widest">관리</p>
                    </div>
                    <nav className="flex md:flex-col p-2 gap-1">
                        {MENU_ITEMS.map(({ key, label, icon }) => (
                            <button
                                key={key}
                                onClick={() => setTab(key)}
                                className={`
                                    flex-1 md:flex-none flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm text-left
                                    transition-colors duration-150 font-medium
                                    ${tab === key
                                        ? 'bg-[#EBF3FE] text-[#3182F6]'
                                        : 'text-[#8B95A1] hover:bg-[#F2F4F6] hover:text-[#191F28]'
                                    }
                                `}
                            >
                                <span className="text-base">{icon}</span>
                                <span>{label}</span>
                            </button>
                        ))}
                    </nav>
                </div>
            </aside>

            {/* ── 콘텐츠 ── */}
            <div className="flex-1 min-w-0">
                {tab === 'account' && <AccountPage standalone={false} />}
                {tab === 'group'   && <GroupPage   standalone={false} />}
            </div>
        </div>
    );
}

export default ManagePage;
