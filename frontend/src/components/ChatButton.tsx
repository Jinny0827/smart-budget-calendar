interface ChatButtonProps {
    onClick: () => void;
    unreadCount: number;
}

export const ChatButton = ({ onClick, unreadCount }: ChatButtonProps) => {
    return (
        <button
            onClick={onClick}
            className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center transition-all"
        >
            <span className="text-2xl">💬</span>
            {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {unreadCount > 99 ? '99+' : unreadCount}
                </span>
            )}
        </button>
    );
};