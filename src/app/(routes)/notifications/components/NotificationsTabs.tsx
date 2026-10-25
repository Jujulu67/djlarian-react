'use client';

import { Bell, MessageSquare, UserPlus } from 'lucide-react';

import type { NotificationView } from '../notificationsUtils';

interface NotificationsTabsProps {
  activeView: NotificationView;
  onSelectView: (view: NotificationView) => void;
  otherCount: number;
  messagesCount: number;
}

/**
 * Onglets Notifications / Messages / Amis
 */
export function NotificationsTabs({
  activeView,
  onSelectView,
  otherCount,
  messagesCount,
}: NotificationsTabsProps) {
  return (
    <div className="flex items-center gap-2 mb-4 sm:mb-6 flex-wrap">
      <button
        onClick={() => onSelectView('notifications')}
        className={`flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg border transition-colors touch-manipulation v2:rounded-full v2:active:scale-[0.98] ${
          activeView === 'notifications'
            ? 'bg-purple-500/20 border-purple-500/50 text-purple-300 v2:bg-white v2:text-zinc-950 v2:border-transparent'
            : 'bg-gray-800/50 border-gray-700/50 text-gray-300 hover:bg-gray-700/50 v2:bg-white/[0.04] v2:text-white/70 v2:border-transparent v2:ring-1 v2:ring-inset v2:ring-white/10 v2:hover:bg-white/[0.04] v2:hover:text-white'
        }`}
      >
        <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
        <span className="text-sm sm:text-base font-medium">
          Notifications {otherCount > 0 && `(${otherCount})`}
        </span>
      </button>
      <button
        onClick={() => onSelectView('messages')}
        className={`flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg border transition-colors touch-manipulation v2:rounded-full v2:active:scale-[0.98] ${
          activeView === 'messages'
            ? 'bg-blue-500/20 border-blue-500/50 text-blue-300 v2:bg-white v2:text-zinc-950 v2:border-transparent'
            : 'bg-gray-800/50 border-gray-700/50 text-gray-300 hover:bg-gray-700/50 v2:bg-white/[0.04] v2:text-white/70 v2:border-transparent v2:ring-1 v2:ring-inset v2:ring-white/10 v2:hover:bg-white/[0.04] v2:hover:text-white'
        }`}
      >
        <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5" />
        <span className="text-sm sm:text-base font-medium">
          Messages {messagesCount > 0 && `(${messagesCount})`}
        </span>
      </button>
      <button
        onClick={() => onSelectView('friends')}
        className={`flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg border transition-colors touch-manipulation v2:rounded-full v2:active:scale-[0.98] ${
          activeView === 'friends'
            ? 'bg-green-500/20 border-green-500/50 text-green-300 v2:bg-white v2:text-zinc-950 v2:border-transparent'
            : 'bg-gray-800/50 border-gray-700/50 text-gray-300 hover:bg-gray-700/50 v2:bg-white/[0.04] v2:text-white/70 v2:border-transparent v2:ring-1 v2:ring-inset v2:ring-white/10 v2:hover:bg-white/[0.04] v2:hover:text-white'
        }`}
      >
        <UserPlus className="w-4 h-4 sm:w-5 sm:h-5" />
        <span className="text-sm sm:text-base font-medium">Amis</span>
      </button>
    </div>
  );
}
