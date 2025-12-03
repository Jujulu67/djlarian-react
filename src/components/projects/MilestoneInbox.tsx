'use client';

import {
  Bell,
  X,
  Check,
  CheckCheck,
  Loader2,
  Calendar,
  TrendingUp,
  ExternalLink,
  MessageSquare,
  Info,
  AlertCircle,
  Archive,
  ChevronDown,
  ChevronUp,
  UserPlus,
  UserCheck,
  UserX,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import {
  useNotifications,
  Notification,
  NotificationType,
  NotificationMetadata,
} from '@/hooks/useNotifications';

interface MilestoneInboxProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Formate une date ISO en format français (DD/MM/YYYY)
 */
function formatDateFrench(dateString: string | null): string {
  if (!dateString) return '';

  try {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return dateString;
  }
}

/**
 * Obtient l'icône et les couleurs pour un type de notification
 */
function getNotificationStyle(type: NotificationType): {
  icon: React.ComponentType<{ className?: string }>;
  bgColor: string;
  borderColor: string;
  iconColor: string;
} {
  switch (type) {
    case 'MILESTONE':
      return {
        icon: Calendar,
        bgColor: 'bg-purple-500/20',
        borderColor: 'border-purple-500/30',
        iconColor: 'text-purple-400',
      };
    case 'ADMIN_MESSAGE':
    case 'USER_MESSAGE':
      return {
        icon: MessageSquare,
        bgColor: 'bg-blue-500/20',
        borderColor: 'border-blue-500/30',
        iconColor: 'text-blue-400',
      };
    case 'RELEASE_UPCOMING':
      return {
        icon: Calendar,
        bgColor: 'bg-orange-500/20',
        borderColor: 'border-orange-500/30',
        iconColor: 'text-orange-400',
      };
    case 'WARNING':
      return {
        icon: AlertCircle,
        bgColor: 'bg-yellow-500/20',
        borderColor: 'border-yellow-500/30',
        iconColor: 'text-yellow-400',
      };
    case 'INFO':
      return {
        icon: Info,
        bgColor: 'bg-blue-500/20',
        borderColor: 'border-blue-500/30',
        iconColor: 'text-blue-400',
      };
    case 'FRIEND_REQUEST':
      return {
        icon: UserPlus,
        bgColor: 'bg-purple-500/20',
        borderColor: 'border-purple-500/30',
        iconColor: 'text-purple-400',
      };
    case 'FRIEND_ACCEPTED':
      return {
        icon: UserCheck,
        bgColor: 'bg-green-500/20',
        borderColor: 'border-green-500/30',
        iconColor: 'text-green-400',
      };
    case 'FRIEND_REJECTED':
      return {
        icon: UserX,
        bgColor: 'bg-red-500/20',
        borderColor: 'border-red-500/30',
        iconColor: 'text-red-400',
      };
    default:
      return {
        icon: Bell,
        bgColor: 'bg-gray-500/20',
        borderColor: 'border-gray-500/30',
        iconColor: 'text-gray-400',
      };
  }
}

/**
 * Parse les métadonnées d'une notification
 */
function parseMetadata(metadata: string | null): NotificationMetadata | null {
  if (!metadata) return null;
  try {
    return JSON.parse(metadata);
  } catch {
    return null;
  }
}

export function MilestoneInbox({ isOpen, onClose }: MilestoneInboxProps) {
  const router = useRouter();
  const inboxRef = useRef<HTMLDivElement>(null);
  const {
    notifications,
    unreadCount,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
    archive,
    refresh,
  } = useNotifications({
    unreadOnly: false,
    autoRefresh: false,
  });

  // État pour gérer l'ouverture/fermeture des threads
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set());

  // Détecter si on est sur mobile
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Variantes d'animation selon la taille d'écran
  const variants = isMobile
    ? {
        initial: { opacity: 0, y: '100%' },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: '100%' },
      }
    : {
        initial: { opacity: 0, x: '100%' },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: '100%' },
      };

  // Fermer quand on clique en dehors (mais pas sur le bouton de notifications)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      // Ne pas fermer si on clique sur le bouton de notifications ou ses enfants
      if (
        target.closest('button[aria-label="Notifications"]') ||
        target.closest('.mobile-user-button')
      ) {
        return;
      }
      if (inboxRef.current && !inboxRef.current.contains(target)) {
        onClose();
      }
    };

    if (isOpen) {
      // Utiliser un petit délai pour éviter les conflits avec le toggle
      const timeoutId = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 100);
      return () => {
        clearTimeout(timeoutId);
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen, onClose]);

  // Fermer avec Escape
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Rafraîchir les notifications quand la popup s'ouvre
  useEffect(() => {
    if (isOpen) {
      // Attendre un peu pour éviter les requêtes multiples
      const timeoutId = setTimeout(() => {
        refresh();
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [isOpen, refresh]);

  // Rafraîchir quand on revient sur l'onglet si la popup est ouverte
  useEffect(() => {
    if (!isOpen) return;

    const handleFocus = () => {
      // Rafraîchir quand on revient sur l'onglet et que la popup est ouverte
      refresh();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [isOpen, refresh]);

  const toggleThread = (threadId: string | null) => {
    if (!threadId) return;
    setExpandedThreads((prev) => {
      const next = new Set(prev);
      if (next.has(threadId)) {
        next.delete(threadId);
      } else {
        next.add(threadId);
      }
      return next;
    });
  };

  const handleNotificationClick = async (notification: Notification) => {
    // Vérifier que l'ID existe
    if (!notification.id) {
      console.error('Notification sans ID:', notification);
      return;
    }

    // Pour les messages, toggle le thread au lieu de rediriger
    if (
      (notification.type === 'ADMIN_MESSAGE' || notification.type === 'USER_MESSAGE') &&
      notification.replies &&
      notification.replies.length > 0
    ) {
      toggleThread(notification.threadId || notification.id);
      return;
    }

    // Marquer comme lue si ce n'est pas déjà fait
    if (!notification.isRead) {
      try {
        await markAsRead(notification.id);
      } catch (err) {
        console.error('Erreur lors de la mise à jour:', err);
        // Ne pas empêcher la redirection en cas d'erreur
      }
    }

    // Fermer le burger avant de naviguer
    onClose();

    // Rediriger selon le type de notification
    if (notification.type === 'ADMIN_MESSAGE' || notification.type === 'USER_MESSAGE') {
      router.push('/notifications?view=messages');
    } else if (
      notification.type === 'FRIEND_REQUEST' ||
      notification.type === 'FRIEND_ACCEPTED' ||
      notification.type === 'FRIEND_REJECTED'
    ) {
      // Rediriger vers l'onglet amis pour les notifications d'amis
      router.push('/notifications?view=friends');
    } else {
      router.push('/notifications?view=notifications');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
    } catch (err) {
      console.error('Erreur lors de la mise à jour:', err);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Inbox Panel */}
          <motion.div
            ref={inboxRef}
            initial={variants.initial}
            animate={variants.animate}
            exit={variants.exit}
            transition={{
              type: 'spring',
              damping: 25,
              stiffness: 300,
              duration: 0.3,
            }}
            className="fixed top-16 left-0 right-0 sm:left-auto sm:right-4 w-full sm:w-auto sm:max-w-md bg-gradient-to-br from-gray-900/95 via-gray-800/95 to-gray-900/95 backdrop-blur-xl border border-purple-500/30 rounded-none sm:rounded-xl shadow-2xl z-50 max-h-[calc(100vh-4rem)] sm:max-h-[calc(100vh-5rem)] flex flex-col"
            role="dialog"
            aria-labelledby="inbox-title"
            aria-modal="true"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-3 sm:p-4 border-b border-gray-700/50 bg-gray-900/80 backdrop-blur-sm">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                <div className="p-1.5 sm:p-2 bg-purple-500/20 rounded-lg flex-shrink-0">
                  <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2
                    id="inbox-title"
                    className="text-base sm:text-lg font-semibold text-white truncate"
                  >
                    Notifications
                  </h2>
                  {unreadCount > 0 && (
                    <p className="text-xs text-gray-400">
                      {unreadCount} non {unreadCount === 1 ? 'lue' : 'lues'}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    className="p-2 text-gray-400 hover:text-purple-400 hover:bg-purple-500/10 rounded-lg transition-colors touch-manipulation"
                    title="Tout marquer comme lu"
                    aria-label="Tout marquer comme lu"
                  >
                    <CheckCheck className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="p-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors touch-manipulation"
                  aria-label="Fermer"
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
                </div>
              ) : error ? (
                <div className="p-6 text-center">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-6 text-center">
                  <Bell className="w-12 h-12 mx-auto mb-3 text-gray-500" />
                  <p className="text-gray-400 text-sm">Aucune notification</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-700/50">
                  {notifications.map((notification) => {
                    const style = getNotificationStyle(notification.type);
                    const Icon = style.icon;
                    const metadata = parseMetadata(notification.metadata);
                    const isUnread = !notification.isRead;
                    const projectName = notification.Project?.name || metadata?.projectName || '';
                    const hasReplies = notification.replies && notification.replies.length > 0;
                    const threadId = notification.threadId || notification.id;
                    const isThreadExpanded = expandedThreads.has(threadId);

                    return (
                      <div
                        key={notification.id}
                        className={`w-full p-3 sm:p-4 hover:bg-gray-800/50 transition-colors touch-manipulation ${
                          isUnread ? 'bg-purple-500/5 border-l-2 border-purple-500' : ''
                        }`}
                      >
                        <div className="flex items-start gap-2 sm:gap-3">
                          {/* Badge de type */}
                          <div
                            className={`flex-shrink-0 p-1.5 sm:p-2 rounded-lg ${style.bgColor} border ${style.borderColor}`}
                          >
                            <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${style.iconColor}`} />
                          </div>

                          {/* Contenu */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <button
                                onClick={() => handleNotificationClick(notification)}
                                className="flex-1 text-left touch-manipulation"
                                title={isUnread ? 'Cliquer pour marquer comme lu' : ''}
                              >
                                <h3 className="text-sm sm:text-base font-semibold text-white line-clamp-2">
                                  {notification.title}
                                </h3>
                                {notification.message && (
                                  <p className="text-xs sm:text-sm text-gray-400 mb-2 mt-1 line-clamp-3">
                                    {notification.message}
                                  </p>
                                )}
                                {notification.type === 'ADMIN_MESSAGE' && metadata?.senderName && (
                                  <p className="text-xs text-blue-400 mb-2 truncate">
                                    De: {String(metadata.senderName)}
                                  </p>
                                )}
                                {notification.type === 'USER_MESSAGE' && metadata?.senderName && (
                                  <p className="text-xs text-green-400 mb-2 truncate">
                                    De: {String(metadata.senderName)}
                                  </p>
                                )}
                                {projectName && (
                                  <p className="text-xs text-gray-500 mb-2 truncate">
                                    Projet: {projectName}
                                  </p>
                                )}
                                {notification.type === 'MILESTONE' &&
                                  metadata?.streams !== undefined && (
                                    <div className="flex items-center gap-1 text-xs text-purple-400">
                                      <TrendingUp className="w-3 h-3 flex-shrink-0" />
                                      <span>
                                        {Number(metadata.streams).toLocaleString()} streams
                                      </span>
                                    </div>
                                  )}
                                {notification.Project?.releaseDate && (
                                  <p className="text-xs text-gray-500 mb-2">
                                    Sortie: {formatDateFrench(notification.Project.releaseDate)}
                                  </p>
                                )}
                                <p className="text-xs text-gray-500 mt-2">
                                  {formatDateFrench(notification.createdAt)}
                                </p>
                                {hasReplies && notification.replies && (
                                  <p className="text-xs text-gray-400 mt-1">
                                    {notification.replies.length}{' '}
                                    {notification.replies.length === 1 ? 'réponse' : 'réponses'}
                                  </p>
                                )}
                              </button>
                              {hasReplies && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleThread(threadId);
                                  }}
                                  className="p-1 text-gray-400 hover:text-white transition-colors flex-shrink-0"
                                  title={
                                    isThreadExpanded
                                      ? 'Masquer les réponses'
                                      : 'Afficher les réponses'
                                  }
                                >
                                  {isThreadExpanded ? (
                                    <ChevronUp className="w-4 h-4" />
                                  ) : (
                                    <ChevronDown className="w-4 h-4" />
                                  )}
                                </button>
                              )}
                            </div>

                            {/* Afficher les réponses si le thread est développé */}
                            {hasReplies && isThreadExpanded && notification.replies && (
                              <div className="mt-3 ml-2 pl-3 border-l-2 border-gray-700/50 space-y-2">
                                {notification.replies.map((reply) => {
                                  const replyMetadata = parseMetadata(reply.metadata);
                                  const replyStyle = getNotificationStyle(
                                    reply.type as NotificationType
                                  );
                                  const ReplyIcon = replyStyle.icon;

                                  return (
                                    <div
                                      key={reply.id}
                                      className="p-2 bg-gray-800/30 rounded-lg border border-gray-700/30"
                                    >
                                      <div className="flex items-start gap-2">
                                        <div
                                          className={`flex-shrink-0 p-1 rounded-lg ${replyStyle.bgColor} border ${replyStyle.borderColor}`}
                                        >
                                          <ReplyIcon
                                            className={`w-3 h-3 ${replyStyle.iconColor}`}
                                          />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-2 mb-1">
                                            <h4 className="text-xs font-semibold text-white">
                                              {reply.title}
                                            </h4>
                                            {replyMetadata?.isSent ? (
                                              <span className="text-xs text-green-400">
                                                à{' '}
                                                {String(
                                                  replyMetadata.recipientName || 'Utilisateur'
                                                )}
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
                                            <p className="text-xs text-gray-400 mb-1">
                                              {reply.message}
                                            </p>
                                          )}
                                          <p className="text-xs text-gray-500">
                                            {formatDateFrench(reply.createdAt)}
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex flex-col items-center gap-1.5 sm:gap-2 flex-shrink-0">
                            {/* Bouton marquer comme lu/non lu */}
                            {isUnread ? (
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  try {
                                    await markAsRead(notification.id);
                                  } catch (err) {
                                    console.error('Erreur lors de la mise à jour:', err);
                                  }
                                }}
                                className="p-2 sm:p-1.5 text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 rounded-lg transition-colors touch-manipulation"
                                title="Marquer comme lu"
                                aria-label="Marquer comme lu"
                              >
                                <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-purple-500/20 flex items-center justify-center border border-purple-500/30">
                                  <div className="w-2.5 h-2.5 bg-purple-500 rounded-full" />
                                </div>
                              </button>
                            ) : (
                              <div className="p-2 sm:p-1.5" title="Notification lue">
                                <Check className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                              </div>
                            )}

                            {/* Bouton archiver */}
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                try {
                                  await archive(notification.id);
                                } catch (err) {
                                  console.error("Erreur lors de l'archivage:", err);
                                }
                              }}
                              className="p-2 sm:p-1.5 text-gray-400 hover:text-orange-400 hover:bg-orange-500/10 rounded-lg transition-colors touch-manipulation"
                              title="Archiver"
                              aria-label="Archiver la notification"
                            >
                              <Archive className="w-4 h-4 sm:w-5 sm:h-5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 sm:p-4 border-t border-gray-700/50 bg-gray-900/50">
              <button
                onClick={() => {
                  onClose();
                  router.push('/notifications?view=messages');
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 sm:py-2 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 rounded-lg text-purple-300 text-sm font-medium transition-colors touch-manipulation"
              >
                <ExternalLink className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="sm:hidden">Messagerie</span>
                <span className="hidden sm:inline">Ouvrir la messagerie</span>
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
