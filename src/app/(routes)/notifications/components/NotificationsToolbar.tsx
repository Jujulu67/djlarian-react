'use client';

import { CheckCheck, Filter, Send, X } from 'lucide-react';
import type { Dispatch, SetStateAction } from 'react';

import {
  NOTIFICATION_FILTER_OPTIONS,
  type NotificationFilter,
  type NotificationView,
} from '../notificationsUtils';

interface NotificationsToolbarProps {
  activeView: NotificationView;
  filter: NotificationFilter;
  setFilter: Dispatch<SetStateAction<NotificationFilter>>;
  showFilters: boolean;
  setShowFilters: Dispatch<SetStateAction<boolean>>;
  unreadCount: number;
  onNewMessage: () => void;
  onMarkAllAsRead: () => Promise<void>;
}

/**
 * Barre d'actions (filtres, nouveau message, tout marquer comme lu) et panneau des filtres
 */
export function NotificationsToolbar({
  activeView,
  filter,
  setFilter,
  showFilters,
  setShowFilters,
  unreadCount,
  onNewMessage,
  onMarkAllAsRead,
}: NotificationsToolbarProps) {
  return (
    <>
      {/* Actions */}
      <div className="flex flex-col gap-2 sm:gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg border transition-colors touch-manipulation v2:rounded-full v2:active:scale-[0.98] ${
              showFilters
                ? 'bg-purple-500/20 border-purple-500/50 text-purple-300 v2:bg-white v2:text-zinc-950 v2:border-transparent'
                : 'bg-gray-800/50 border-gray-700/50 text-gray-300 hover:bg-gray-700/50 v2:bg-white/[0.04] v2:text-white/70 v2:border-transparent v2:ring-1 v2:ring-inset v2:ring-white/10 v2:hover:bg-white/[0.04] v2:hover:text-white'
            }`}
          >
            <Filter className="w-4 h-4 flex-shrink-0" />
            <span className="text-xs sm:text-sm font-medium">Filtres</span>
          </button>
          {filter !== 'all' && (
            <button
              onClick={() => setFilter('all')}
              className="flex items-center gap-1 px-2 sm:px-3 py-1.5 text-xs text-gray-400 hover:text-white bg-gray-800/50 hover:bg-gray-700/50 rounded-lg transition-colors touch-manipulation v2:rounded-full v2:bg-white/[0.04] v2:hover:bg-white/[0.08] v2:text-white/70"
            >
              <X className="w-3 h-3" />
              <span className="hidden sm:inline">Réinitialiser</span>
            </button>
          )}
          {activeView === 'messages' && (
            <button
              onClick={onNewMessage}
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 rounded-lg text-blue-300 text-xs sm:text-sm font-medium transition-colors touch-manipulation v2:rounded-xl v2:border-transparent v2:bg-white/[0.04] v2:ring-1 v2:ring-inset v2:ring-white/10 v2:text-white/80 v2:hover:bg-white/[0.08] v2:hover:text-white v2:active:scale-[0.98]"
            >
              <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="hidden sm:inline">Envoyer un message</span>
              <span className="sm:hidden">Message</span>
            </button>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={onMarkAllAsRead}
            className="flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 rounded-lg text-purple-300 text-xs sm:text-sm font-medium transition-colors touch-manipulation w-full sm:w-auto v2:rounded-xl v2:border-transparent v2:bg-gradient-to-b v2:from-brand v2:to-purple-600 v2:text-white v2:shadow-[inset_0_1px_0_rgb(255_255_255/0.22)] v2:hover:brightness-110 v2:active:scale-[0.98]"
          >
            <CheckCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
            <span className="hidden sm:inline">Tout marquer comme lu</span>
            <span className="sm:hidden">Tout lu</span>
          </button>
        )}
      </div>

      {/* Filtres */}
      {showFilters && (
        <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-gray-800/50 border border-gray-700/50 rounded-lg v2:surface-1 v2:rounded-2xl">
          <div className="flex flex-wrap gap-2">
            {NOTIFICATION_FILTER_OPTIONS.map((type) => (
              <button
                key={type.value}
                onClick={() => {
                  setFilter(type.value);
                  setShowFilters(false);
                }}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors touch-manipulation v2:rounded-full ${
                  filter === type.value
                    ? 'bg-purple-500/30 text-purple-300 border border-purple-500/50 v2:bg-white v2:text-zinc-950 v2:border-transparent'
                    : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700 border border-gray-600/50 v2:bg-white/[0.04] v2:text-white/70 v2:border-transparent v2:ring-1 v2:ring-inset v2:ring-white/10 v2:hover:bg-white/[0.04] v2:hover:text-white'
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
