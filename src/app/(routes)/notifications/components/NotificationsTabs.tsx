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
        className={`flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg border transition-colors touch-manipulation ${
          activeView === 'notifications'
            ? 'bg-purple-500/20 border-purple-500/50 text-purple-300'
            : 'bg-gray-800/50 border-gray-700/50 text-gray-300 hover:bg-gray-700/50'
        }`}
      >
        <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
        <span className="text-sm sm:text-base font-medium">
          Notifications {otherCount > 0 && `(${otherCount})`}
        </span>
      </button>
      <button
        onClick={() => onSelectView('messages')}
        className={`flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg border transition-colors touch-manipulation ${
          activeView === 'messages'
            ? 'bg-blue-500/20 border-blue-500/50 text-blue-300'
            : 'bg-gray-800/50 border-gray-700/50 text-gray-300 hover:bg-gray-700/50'
        }`}
      >
        <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5" />
        <span className="text-sm sm:text-base font-medium">
          Messages {messagesCount > 0 && `(${messagesCount})`}
        </span>
      </button>
      <button
        onClick={() => onSelectView('friends')}
        className={`flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg border transition-colors touch-manipulation ${
          activeView === 'friends'
            ? 'bg-green-500/20 border-green-500/50 text-green-300'
            : 'bg-gray-800/50 border-gray-700/50 text-gray-300 hover:bg-gray-700/50'
        }`}
      >
        <UserPlus className="w-4 h-4 sm:w-5 sm:h-5" />
        <span className="text-sm sm:text-base font-medium">Amis</span>
      </button>
    </div>
  );
}
