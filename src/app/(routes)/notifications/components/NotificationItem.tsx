'use client';

import { Archive, Check, ChevronDown, ChevronUp, MessageSquare, TrendingUp } from 'lucide-react';

import type { Notification, NotificationType } from '@/hooks/useNotifications';

import {
  formatDateFrench,
  formatDateTimeFrench,
  getNotificationStyle,
  getNotificationVisuals,
  parseMetadata,
} from '../notificationsUtils';

interface NotificationItemProps {
  notification: Notification;
  isThreadExpanded: boolean;
  onToggleThread: (notificationId: string) => void;
  onMarkAsRead: (id: string) => Promise<void>;
  onOpen: (notification: Notification) => Promise<void>;
  onArchive: (id: string) => Promise<void>;
  onReply: (notification: Notification) => void;
}

/**
 * Carte d'une notification (ou d'un message) avec ses réponses en thread
 */
export function NotificationItem({
  notification,
  isThreadExpanded,
  onToggleThread,
  onMarkAsRead,
  onOpen,
  onArchive,
  onReply,
}: NotificationItemProps) {
  const style = getNotificationStyle(notification.type);
  const metadata = parseMetadata(notification.metadata);
  const { Icon, iconColor, bgColor, borderColor } = getNotificationVisuals(notification, metadata);
  const isUnread = !notification.isRead;
  const projectName = notification.Project?.name || metadata?.projectName || '';
  const isSentMessage = metadata?.isSent === true;
  const hasReplies = notification.replies && notification.replies.length > 0;

  return (
    <div
      key={notification.id}
      onClick={async () => {
        // Pour les messages avec réponses, toggle le thread au clic sur la div
        if (
          (notification.type === 'ADMIN_MESSAGE' || notification.type === 'USER_MESSAGE') &&
          hasReplies
        ) {
          onToggleThread(notification.id);
          // Marquer comme lu si ce n'est pas déjà fait
          if (!notification.isRead) {
            try {
              await onMarkAsRead(notification.id);
            } catch (err) {
              console.error('Erreur lors de la mise à jour:', err);
            }
          }
        }
      }}
      className={`w-full p-3 sm:p-4 md:p-6 hover:bg-gray-800/50 transition-colors touch-manipulation focus:outline-none ${
        (notification.type === 'ADMIN_MESSAGE' || notification.type === 'USER_MESSAGE') &&
        hasReplies
          ? 'cursor-pointer'
          : ''
      } ${
        isUnread
          ? 'bg-purple-500/5 border-l-2 sm:border-l-4 border-purple-500'
          : isSentMessage
            ? 'bg-green-500/5 border-l-2 sm:border-l-4 border-green-500/50'
            : 'border-l-2 sm:border-l-4 border-transparent'
      }`}
    >
      <div className="flex items-start gap-2 sm:gap-3 md:gap-4">
        {/* Badge de type */}
        <div
          className={`flex-shrink-0 p-2 sm:p-2.5 md:p-3 rounded-lg ${bgColor} border ${borderColor}`}
        >
          <Icon className={`w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 ${iconColor}`} />
        </div>

        {/* Contenu */}
        <button
          onClick={async (e) => {
            // Pour les messages avec réponses, toggle le thread au clic sur le header
            if (
              (notification.type === 'ADMIN_MESSAGE' || notification.type === 'USER_MESSAGE') &&
              hasReplies
            ) {
              e.stopPropagation();
              onToggleThread(notification.id);
              // Marquer comme lu si ce n'est pas déjà fait
              if (!notification.isRead) {
                try {
                  await onMarkAsRead(notification.id);
                } catch (err) {
                  console.error('Erreur lors de la mise à jour:', err);
                }
              }
              return;
            }
            onOpen(notification);
          }}
          className="flex-1 min-w-0 text-left touch-manipulation focus:outline-none"
        >
          <div className="flex items-start justify-between gap-2 mb-1.5 sm:mb-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 mb-1 flex-wrap">
                <h3 className="text-sm sm:text-base md:text-lg font-semibold text-white line-clamp-2">
                  {notification.title}
                </h3>
                <span className="px-1.5 sm:px-2 py-0.5 text-xs font-medium rounded-full bg-gray-700/50 text-gray-300 flex-shrink-0">
                  {style.label}
                </span>
              </div>
              {notification.message && (
                <p className="text-xs sm:text-sm md:text-base text-gray-400 mb-1.5 sm:mb-2 line-clamp-3">
                  {notification.message}
                </p>
              )}
              {(notification.type === 'ADMIN_MESSAGE' || notification.type === 'USER_MESSAGE') &&
                (metadata?.isSent ? (
                  <p className="text-xs sm:text-sm text-green-400 mb-1.5 sm:mb-2 truncate">
                    <span className="font-medium">À:</span>{' '}
                    {String(metadata.recipientName || 'Utilisateur')}
                  </p>
                ) : (
                  metadata?.senderName && (
                    <p className="text-xs sm:text-sm text-blue-400 mb-1.5 sm:mb-2 truncate">
                      <span className="font-medium">De:</span> {String(metadata.senderName)}
                    </p>
                  )
                ))}
            </div>
            {isUnread && (
              <span className="flex-shrink-0 w-2 h-2 sm:w-2.5 sm:h-2.5 bg-purple-500 rounded-full mt-1" />
            )}
          </div>

          {/* Détails du projet */}
          {projectName && (
            <div className="mb-1.5 sm:mb-2">
              <p className="text-xs sm:text-sm text-gray-500 truncate">
                <span className="font-medium">Projet:</span> {projectName}
              </p>
            </div>
          )}

          {/* Métadonnées spécifiques */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 md:gap-4 mb-1.5 sm:mb-2">
            {notification.type === 'MILESTONE' && metadata?.streams !== undefined && (
              <div className="flex items-center gap-1 text-xs sm:text-sm text-purple-400">
                <TrendingUp className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 flex-shrink-0" />
                <span>{Number(metadata.streams).toLocaleString()} streams</span>
              </div>
            )}
            {notification.Project?.releaseDate && (
              <div className="text-xs sm:text-sm text-gray-500">
                <span className="font-medium">Sortie:</span>{' '}
                {formatDateFrench(notification.Project.releaseDate)}
              </div>
            )}
          </div>

          {/* Date */}
          <div className="flex items-center justify-between mt-2 sm:mt-3 pt-2 border-t border-gray-700/30">
            <p className="text-xs text-gray-500">{formatDateTimeFrench(notification.createdAt)}</p>
            {!isUnread && notification.readAt && (
              <p className="text-xs text-gray-600 hidden sm:inline">
                Lu le {formatDateTimeFrench(notification.readAt)}
              </p>
            )}
          </div>
        </button>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center gap-1.5 sm:gap-2 flex-shrink-0">
          {/* Bouton collapse/expand thread (si réponses existent) */}
          {hasReplies && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleThread(notification.id);
              }}
              className="p-2 text-gray-400 hover:text-purple-400 hover:bg-purple-500/10 rounded-lg transition-colors touch-manipulation focus:outline-none"
              title={isThreadExpanded ? 'Réduire le thread' : 'Développer le thread'}
              aria-label={isThreadExpanded ? 'Réduire le thread' : 'Développer le thread'}
            >
              {isThreadExpanded ? (
                <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5" />
              ) : (
                <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5" />
              )}
            </button>
          )}
          {/* Bouton répondre (pour les messages reçus uniquement) */}
          {(notification.type === 'ADMIN_MESSAGE' || notification.type === 'USER_MESSAGE') &&
            !isSentMessage && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onReply(notification);
                }}
                className="p-2 text-gray-400 hover:text-green-400 hover:bg-green-500/10 rounded-lg transition-colors touch-manipulation focus:outline-none"
                title="Répondre"
                aria-label="Répondre au message"
              >
                <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            )}
          {/* Bouton archiver */}
          <button
            onClick={async (e) => {
              e.stopPropagation();
              await onArchive(notification.id);
            }}
            className="p-2 text-gray-400 hover:text-orange-400 hover:bg-orange-500/10 rounded-lg transition-colors touch-manipulation focus:outline-none"
            title="Archiver"
            aria-label="Archiver la notification"
          >
            <Archive className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          {/* Icône de statut */}
          {isUnread ? (
            <div className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 rounded-full bg-purple-500/20 flex items-center justify-center">
              <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-purple-500 rounded-full" />
            </div>
          ) : (
            <div className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 rounded-full bg-gray-700/50 flex items-center justify-center">
              <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-600" />
            </div>
          )}
        </div>
      </div>

      {/* Afficher les réponses en thread (collapse/expand) */}
      {hasReplies && notification.replies && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            onToggleThread(notification.id);
          }}
          className="mt-2 flex items-center gap-2 text-xs text-gray-500 cursor-pointer hover:text-gray-400 transition-colors"
        >
          <span>
            {notification.replies.length}{' '}
            {notification.replies.length === 1 ? 'réponse' : 'réponses'}
          </span>
          {!isThreadExpanded && (
            <span className="text-purple-400 hover:text-purple-300 underline">Afficher</span>
          )}
        </div>
      )}
      {hasReplies && isThreadExpanded && notification.replies && (
        <div className="mt-4 ml-4 sm:ml-6 md:ml-8 pl-4 sm:pl-6 border-l-2 border-gray-700/50 space-y-3">
          {notification.replies.map((reply) => {
            const replyMetadata = parseMetadata(reply.metadata);
            const replyStyle = getNotificationStyle(reply.type as NotificationType);
            const ReplyIcon = replyStyle.icon;

            return (
              <div
                key={reply.id}
                className="p-3 sm:p-4 bg-gray-800/30 rounded-lg border border-gray-700/30"
              >
                <div className="flex items-start gap-2 sm:gap-3">
                  <div
                    className={`flex-shrink-0 p-1.5 sm:p-2 rounded-lg ${replyStyle.bgColor} border ${replyStyle.borderColor}`}
                  >
                    <ReplyIcon className={`w-3 h-3 sm:w-4 sm:h-4 ${replyStyle.iconColor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-xs sm:text-sm font-semibold text-white">{reply.title}</h4>
                      {replyMetadata?.isSent ? (
                        <span className="text-xs text-green-400">
                          à {String(replyMetadata.recipientName || 'Utilisateur')}
                        </span>
                      ) : (
                        replyMetadata?.senderName && (
                          <span className="text-xs text-gray-400">
                            par {String(replyMetadata.senderName)}
                          </span>
                        )
                      )}
                    </div>
                    {reply.message && (
                      <p className="text-xs sm:text-sm text-gray-400 mb-2">{reply.message}</p>
                    )}
                    <p className="text-xs text-gray-500">{formatDateTimeFrench(reply.createdAt)}</p>
                  </div>
                  {(reply.type === 'ADMIN_MESSAGE' || reply.type === 'USER_MESSAGE') &&
                    !replyMetadata?.isSent && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onReply(reply);
                        }}
                        className="p-1.5 text-gray-500 hover:text-green-400 hover:bg-green-500/10 rounded transition-colors"
                        title="Répondre"
                        aria-label="Répondre"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                      </button>
                    )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
