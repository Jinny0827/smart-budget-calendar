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
        <div className="flex flex-col md:flex-row gap-6 items-start">

            {/* ── 사이드바 ── */}
            <aside className="w-full md:w-48 shrink-0">
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="px-4 py-3 border-b bg-gray-50">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">관리</p>
                    </div>
                    <nav className="flex md:flex-col">
                        {MENU_ITEMS.map(({ key, label, icon }) => (
                            <button
                                key={key}
                                onClick={() => setTab(key)}
                                className={`
                                    flex-1 md:flex-none flex items-center gap-2 px-4 py-3 text-sm text-left
                                    transition-colors duration-150
                                    ${tab === key
                                        ? 'bg-blue-50 text-blue-700 font-semibold border-b-2 md:border-b-0 md:border-l-2 border-blue-500'
                                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
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
