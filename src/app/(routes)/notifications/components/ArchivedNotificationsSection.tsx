'use client';

import { Archive, ArchiveRestore, Trash2 } from 'lucide-react';
import type { Dispatch, SetStateAction } from 'react';

import type { Notification } from '@/hooks/useNotifications';

import {
  formatDateTimeFrench,
  getNotificationStyle,
  type NotificationView,
  parseMetadata,
} from '../notificationsUtils';

interface ArchivedNotificationsSectionProps {
  notifications: Notification[];
  activeView: NotificationView;
  showArchived: boolean;
  setShowArchived: Dispatch<SetStateAction<boolean>>;
  onUnarchive: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

/**
 * Section des notifications archivées (repliable), avec désarchivage et suppression
 */
export function ArchivedNotificationsSection({
  notifications,
  activeView,
  showArchived,
  setShowArchived,
  onUnarchive,
  onDelete,
}: ArchivedNotificationsSectionProps) {
  return (
    <div className="mt-6 sm:mt-8">
      <div
        className="flex items-center justify-between mb-3 sm:mb-4 gap-2 cursor-pointer hover:opacity-80 transition-opacity"
        onClick={() => setShowArchived(!showArchived)}
      >
        <h2 className="text-lg sm:text-xl font-semibold text-white flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
          <Archive className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 flex-shrink-0" />
          <span className="truncate">
            {activeView === 'messages' ? 'Messages archivés' : 'Notifications archivées'} (
            {notifications.length})
          </span>
        </h2>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowArchived(!showArchived);
          }}
          className="px-3 sm:px-4 py-1.5 sm:py-2 bg-gray-800/50 hover:bg-gray-700/50 border border-gray-700/50 rounded-lg text-gray-300 text-xs sm:text-sm font-medium transition-colors touch-manipulation flex-shrink-0 v2:rounded-full v2:border-transparent v2:bg-white/[0.04] v2:ring-1 v2:ring-inset v2:ring-white/10 v2:text-white/70 v2:hover:bg-white/[0.04] v2:hover:text-white"
        >
          {showArchived ? 'Masquer' : 'Afficher'}
        </button>
      </div>

      {showArchived && (
        <div className="bg-gradient-to-br from-gray-900/95 via-gray-800/95 to-gray-900/95 backdrop-blur-xl border border-gray-700/50 rounded-lg sm:rounded-xl shadow-2xl overflow-hidden v2:bg-none v2:surface-1 v2:rounded-2xl">
          <div className="divide-y divide-gray-700/50 v2:divide-white/[0.06] max-h-[calc(100vh-24rem)] sm:max-h-[calc(100vh-30rem)] overflow-y-auto">
            {notifications.map((notification) => {
              const style = getNotificationStyle(notification.type);
              const Icon = style.icon;
              const metadata = parseMetadata(notification.metadata);
              const projectName = notification.Project?.name || metadata?.projectName || '';

              return (
                <div
                  key={notification.id}
                  className="w-full p-3 sm:p-4 md:p-6 hover:bg-gray-800/50 transition-colors border-l-2 sm:border-l-4 border-gray-600/50 opacity-75 touch-manipulation"
                >
                  <div className="flex items-start gap-2 sm:gap-3 md:gap-4">
                    {/* Badge de type */}
                    <div
                      className={`flex-shrink-0 p-2 sm:p-2.5 md:p-3 rounded-lg v2:rounded-xl ${style.bgColor} border ${style.borderColor}`}
                    >
                      <Icon className={`w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 ${style.iconColor}`} />
                    </div>

                    {/* Contenu */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1.5 sm:mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 sm:gap-2 mb-1 flex-wrap">
                            <h3 className="text-sm sm:text-base md:text-lg font-semibold text-gray-400 line-clamp-2">
                              {notification.title}
                            </h3>
                            <span className="px-1.5 sm:px-2 py-0.5 text-xs font-medium rounded-full bg-gray-700/50 text-gray-400 flex-shrink-0">
                              {style.label}
                            </span>
                          </div>
                          {notification.message && (
                            <p className="text-xs sm:text-sm md:text-base text-gray-500 mb-1.5 sm:mb-2 line-clamp-3">
                              {notification.message}
                            </p>
                          )}
                          {(notification.type === 'ADMIN_MESSAGE' ||
                            notification.type === 'USER_MESSAGE') &&
                            (metadata?.isSent ? (
                              <p className="text-xs sm:text-sm text-green-400 mb-1.5 sm:mb-2 truncate">
                                <span className="font-medium">À:</span>{' '}
                                {String(metadata.recipientName || 'Utilisateur')}
                              </p>
                            ) : (
                              metadata?.senderName && (
                                <p className="text-xs sm:text-sm text-blue-400 mb-1.5 sm:mb-2 truncate">
                                  <span className="font-medium">De:</span>{' '}
                                  {String(metadata.senderName)}
                                </p>
                              )
                            ))}
                        </div>
                      </div>

                      {/* Détails du projet */}
                      {projectName && (
                        <div className="mb-1.5 sm:mb-2">
                          <p className="text-xs sm:text-sm text-gray-600 truncate">
                            <span className="font-medium">Projet:</span> {projectName}
                          </p>
                        </div>
                      )}

                      {/* Date */}
                      <div className="flex items-center justify-between mt-2 sm:mt-3 pt-2 border-t border-gray-700/30">
                        <p className="text-xs text-gray-600">
                          {formatDateTimeFrench(notification.createdAt)}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col sm:flex-row items-center gap-1.5 sm:gap-2 flex-shrink-0">
                      {/* Bouton désarchiver */}
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          await onUnarchive(notification.id);
                        }}
                        className="p-2 text-gray-500 hover:text-green-400 hover:bg-green-500/10 rounded-lg transition-colors touch-manipulation v2:rounded-xl v2:hover:bg-white/[0.06] v2:hover:text-white"
                        title="Désarchiver"
                        aria-label="Désarchiver la notification"
                      >
                        <ArchiveRestore className="w-4 h-4 sm:w-5 sm:h-5" />
                      </button>
                      {/* Bouton supprimer définitivement */}
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          await onDelete(notification.id);
                        }}
                        className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors touch-manipulation v2:rounded-xl"
                        title="Supprimer définitivement"
                        aria-label="Supprimer définitivement"
                      >
                        <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
