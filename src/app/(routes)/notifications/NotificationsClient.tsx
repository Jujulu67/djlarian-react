'use client';

import {
  Bell,
  Check,
  CheckCheck,
  Loader2,
  Calendar,
  TrendingUp,
  MessageSquare,
  Info,
  AlertCircle,
  Filter,
  X,
  ArrowLeft,
  Trash2,
  Archive,
  ArchiveRestore,
  Send,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useState, useMemo, useEffect } from 'react';

import {
  useNotifications,
  Notification,
  NotificationType,
  NotificationMetadata,
} from '@/hooks/useNotifications';
import { SendMessageModal } from '@/components/notifications/SendMessageModal';
import { fetchWithAuth } from '@/lib/api/fetchWithAuth';

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
 * Formate une date ISO en format français avec heure (DD/MM/YYYY HH:MM)
 */
function formatDateTimeFrench(dateString: string | null): string {
  if (!dateString) return '';

  try {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
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
  label: string;
} {
  switch (type) {
    case 'MILESTONE':
      return {
        icon: Calendar,
        bgColor: 'bg-purple-500/20',
        borderColor: 'border-purple-500/30',
        iconColor: 'text-purple-400',
        label: 'Jalon',
      };
    case 'ADMIN_MESSAGE':
      return {
        icon: MessageSquare,
        bgColor: 'bg-blue-500/20',
        borderColor: 'border-blue-500/30',
        iconColor: 'text-blue-400',
        label: 'Message',
      };
    case 'RELEASE_UPCOMING':
      return {
        icon: Calendar,
        bgColor: 'bg-orange-500/20',
        borderColor: 'border-orange-500/30',
        iconColor: 'text-orange-400',
        label: 'Sortie',
      };
    case 'WARNING':
      return {
        icon: AlertCircle,
        bgColor: 'bg-yellow-500/20',
        borderColor: 'border-yellow-500/30',
        iconColor: 'text-yellow-400',
        label: 'Alerte',
      };
    case 'INFO':
    default:
      return {
        icon: Info,
        bgColor: 'bg-gray-500/20',
        borderColor: 'border-gray-500/30',
        iconColor: 'text-gray-400',
        label: 'Info',
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

export default function NotificationsClient() {
  const router = useRouter();
  const { data: session } = useSession();
  const [filter, setFilter] = useState<'all' | 'unread' | NotificationType>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);

  const isAdmin = session?.user?.role === 'ADMIN';

  const {
    notifications,
    unreadCount,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
    archive,
    unarchive,
    delete: deleteNotification,
    refresh,
  } = useNotifications({
    unreadOnly: false,
    autoRefresh: true,
    refreshInterval: 300000, // 5 minutes (optimisé pour quotas gratuits)
    refreshOnPageChange: true, // Activé uniquement sur la page notifications
  });

  // Charger les notifications archivées séparément
  const [archivedNotifications, setArchivedNotifications] = useState<Notification[]>([]);
  const [showArchived, setShowArchived] = useState(false);

  const fetchArchivedNotifications = async () => {
    try {
      const response = await fetchWithAuth('/api/notifications?includeArchived=true&limit=100');
      if (response.ok) {
        const data = await response.json();
        const result = data?.data || data;
        const archived = (result.notifications || []).filter(
          (n: Notification) => n.isArchived && !n.deletedAt
        );
        setArchivedNotifications(archived);
      }
    } catch (err) {
      console.error('Erreur lors du chargement des notifications archivées:', err);
    }
  };

  useEffect(() => {
    fetchArchivedNotifications();
  }, []);

  const handleArchive = async (id: string) => {
    try {
      await archive(id);
      await fetchArchivedNotifications();
      await refresh();
    } catch (err) {
      console.error("Erreur lors de l'archivage:", err);
    }
  };

  const handleUnarchive = async (id: string) => {
    try {
      await unarchive(id);
      await fetchArchivedNotifications();
      await refresh();
    } catch (err) {
      console.error('Erreur lors du désarchivage:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer définitivement cette notification ?')) {
      return;
    }
    try {
      await deleteNotification(id);
      setArchivedNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      console.error('Erreur lors de la suppression:', err);
    }
  };

  // Filtrer les notifications
  const filteredNotifications = useMemo(() => {
    if (filter === 'all') return notifications;
    if (filter === 'unread') return notifications.filter((n) => !n.isRead);
    return notifications.filter((n) => n.type === filter);
  }, [notifications, filter]);

  const handleNotificationClick = async (notification: Notification) => {
    // Marquer comme lu
    if (!notification.isRead) {
      try {
        await markAsRead(notification.id);
      } catch (err) {
        console.error('Erreur lors de la mise à jour:', err);
      }
    }

    // Rediriger selon le type de notification avec paramètre pour animation dorée
    const projectId =
      notification.projectId ||
      (notification.metadata
        ? (() => {
            try {
              const meta = parseMetadata(notification.metadata);
              return meta?.projectId;
            } catch {
              return null;
            }
          })()
        : null);

    if (projectId) {
      router.push(`/projects?highlight=${projectId}&fromNotification=true`);
    } else if (notification.type === 'MILESTONE' || notification.type === 'RELEASE_UPCOMING') {
      router.push('/projects');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
    } catch (err) {
      console.error('Erreur lors de la mise à jour:', err);
    }
  };

  const notificationTypes: Array<{ value: 'all' | 'unread' | NotificationType; label: string }> = [
    { value: 'all', label: 'Toutes' },
    { value: 'unread', label: 'Non lues' },
    { value: 'MILESTONE', label: 'Jalons' },
    { value: 'RELEASE_UPCOMING', label: 'Sorties' },
    { value: 'ADMIN_MESSAGE', label: 'Messages' },
    { value: 'WARNING', label: 'Alertes' },
    { value: 'INFO', label: 'Infos' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 pb-4">
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 md:py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-4 sm:mb-6 md:mb-8">
          <div className="flex items-center gap-2 sm:gap-4 mb-3 sm:mb-4">
            <button
              onClick={() => router.back()}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-800/50 rounded-lg transition-colors touch-manipulation"
              aria-label="Retour"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <div className="p-1.5 sm:p-2 bg-purple-500/20 rounded-lg flex-shrink-0">
                <Bell className="w-5 h-5 sm:w-6 sm:h-7 text-purple-400" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white truncate">
                  Notifications
                </h1>
                {unreadCount > 0 && (
                  <p className="text-xs sm:text-sm text-gray-400 mt-0.5 sm:mt-1">
                    {unreadCount} non {unreadCount === 1 ? 'lue' : 'lues'}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 sm:gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg border transition-colors touch-manipulation ${
                  showFilters
                    ? 'bg-purple-500/20 border-purple-500/50 text-purple-300'
                    : 'bg-gray-800/50 border-gray-700/50 text-gray-300 hover:bg-gray-700/50'
                }`}
              >
                <Filter className="w-4 h-4 flex-shrink-0" />
                <span className="text-xs sm:text-sm font-medium">Filtres</span>
              </button>
              {filter !== 'all' && (
                <button
                  onClick={() => setFilter('all')}
                  className="flex items-center gap-1 px-2 sm:px-3 py-1.5 text-xs text-gray-400 hover:text-white bg-gray-800/50 hover:bg-gray-700/50 rounded-lg transition-colors touch-manipulation"
                >
                  <X className="w-3 h-3" />
                  <span className="hidden sm:inline">Réinitialiser</span>
                </button>
              )}
              {isAdmin && (
                <button
                  onClick={() => setIsSendModalOpen(true)}
                  className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 rounded-lg text-blue-300 text-xs sm:text-sm font-medium transition-colors touch-manipulation"
                >
                  <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                  <span className="hidden sm:inline">Envoyer un message</span>
                  <span className="sm:hidden">Message</span>
                </button>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 rounded-lg text-purple-300 text-xs sm:text-sm font-medium transition-colors touch-manipulation w-full sm:w-auto"
              >
                <CheckCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                <span className="hidden sm:inline">Tout marquer comme lu</span>
                <span className="sm:hidden">Tout lu</span>
              </button>
            )}
          </div>

          {/* Filtres */}
          {showFilters && (
            <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-gray-800/50 border border-gray-700/50 rounded-lg">
              <div className="flex flex-wrap gap-2">
                {notificationTypes.map((type) => (
                  <button
                    key={type.value}
                    onClick={() => {
                      setFilter(type.value);
                      setShowFilters(false);
                    }}
                    className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors touch-manipulation ${
                      filter === type.value
                        ? 'bg-purple-500/30 text-purple-300 border border-purple-500/50'
                        : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700 border border-gray-600/50'
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="bg-gradient-to-br from-gray-900/95 via-gray-800/95 to-gray-900/95 backdrop-blur-xl border border-purple-500/30 rounded-lg sm:rounded-xl shadow-2xl overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-8 sm:py-12">
              <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
            </div>
          ) : error ? (
            <div className="p-4 sm:p-6 text-center">
              <p className="text-red-400 text-xs sm:text-sm">{error}</p>
              <button
                onClick={() => refresh()}
                className="mt-3 sm:mt-4 px-3 sm:px-4 py-2 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 rounded-lg text-purple-300 text-xs sm:text-sm font-medium transition-colors touch-manipulation"
              >
                Réessayer
              </button>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="p-8 sm:p-12 text-center">
              <Bell className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 text-gray-500" />
              <p className="text-gray-400 text-base sm:text-lg mb-2">
                {filter === 'unread' ? 'Aucune notification non lue' : 'Aucune notification'}
              </p>
              {filter !== 'all' && (
                <button
                  onClick={() => setFilter('all')}
                  className="mt-3 sm:mt-4 px-3 sm:px-4 py-2 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 rounded-lg text-purple-300 text-xs sm:text-sm font-medium transition-colors touch-manipulation"
                >
                  Voir toutes les notifications
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-700/50 max-h-[calc(100vh-16rem)] sm:max-h-[calc(100vh-20rem)] overflow-y-auto">
              {filteredNotifications.map((notification) => {
                const style = getNotificationStyle(notification.type);
                const Icon = style.icon;
                const metadata = parseMetadata(notification.metadata);
                const isUnread = !notification.isRead;
                const projectName = notification.Project?.name || metadata?.projectName || '';

                return (
                  <div
                    key={notification.id}
                    className={`w-full p-3 sm:p-4 md:p-6 hover:bg-gray-800/50 transition-colors touch-manipulation ${
                      isUnread
                        ? 'bg-purple-500/5 border-l-2 sm:border-l-4 border-purple-500'
                        : 'border-l-2 sm:border-l-4 border-transparent'
                    }`}
                  >
                    <div className="flex items-start gap-2 sm:gap-3 md:gap-4">
                      {/* Badge de type */}
                      <div
                        className={`flex-shrink-0 p-2 sm:p-2.5 md:p-3 rounded-lg ${style.bgColor} border ${style.borderColor}`}
                      >
                        <Icon
                          className={`w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 ${style.iconColor}`}
                        />
                      </div>

                      {/* Contenu */}
                      <button
                        onClick={() => handleNotificationClick(notification)}
                        className="flex-1 min-w-0 text-left touch-manipulation"
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
                            {notification.type === 'ADMIN_MESSAGE' && metadata?.senderName && (
                              <p className="text-xs sm:text-sm text-blue-400 mb-1.5 sm:mb-2 truncate">
                                <span className="font-medium">De:</span>{' '}
                                {String(metadata.senderName)}
                              </p>
                            )}
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
                          <p className="text-xs text-gray-500">
                            {formatDateTimeFrench(notification.createdAt)}
                          </p>
                          {!isUnread && notification.readAt && (
                            <p className="text-xs text-gray-600 hidden sm:inline">
                              Lu le {formatDateTimeFrench(notification.readAt)}
                            </p>
                          )}
                        </div>
                      </button>

                      {/* Actions */}
                      <div className="flex flex-col sm:flex-row items-center gap-1.5 sm:gap-2 flex-shrink-0">
                        {/* Bouton archiver */}
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            await handleArchive(notification.id);
                          }}
                          className="p-2 text-gray-400 hover:text-orange-400 hover:bg-orange-500/10 rounded-lg transition-colors touch-manipulation"
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
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Section Notifications archivées */}
        {archivedNotifications.length > 0 && (
          <div className="mt-6 sm:mt-8">
            <div className="flex items-center justify-between mb-3 sm:mb-4 gap-2">
              <h2 className="text-lg sm:text-xl font-semibold text-white flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
                <Archive className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 flex-shrink-0" />
                <span className="truncate">Archivées ({archivedNotifications.length})</span>
              </h2>
              <button
                onClick={() => setShowArchived(!showArchived)}
                className="px-3 sm:px-4 py-1.5 sm:py-2 bg-gray-800/50 hover:bg-gray-700/50 border border-gray-700/50 rounded-lg text-gray-300 text-xs sm:text-sm font-medium transition-colors touch-manipulation flex-shrink-0"
              >
                {showArchived ? 'Masquer' : 'Afficher'}
              </button>
            </div>

            {showArchived && (
              <div className="bg-gradient-to-br from-gray-900/95 via-gray-800/95 to-gray-900/95 backdrop-blur-xl border border-gray-700/50 rounded-lg sm:rounded-xl shadow-2xl overflow-hidden">
                <div className="divide-y divide-gray-700/50 max-h-[calc(100vh-24rem)] sm:max-h-[calc(100vh-30rem)] overflow-y-auto">
                  {archivedNotifications.map((notification) => {
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
                            className={`flex-shrink-0 p-2 sm:p-2.5 md:p-3 rounded-lg ${style.bgColor} border ${style.borderColor}`}
                          >
                            <Icon
                              className={`w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 ${style.iconColor}`}
                            />
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
                                {notification.type === 'ADMIN_MESSAGE' && metadata?.senderName && (
                                  <p className="text-xs sm:text-sm text-blue-400 mb-1.5 sm:mb-2 truncate">
                                    <span className="font-medium">De:</span>{' '}
                                    {String(metadata.senderName)}
                                  </p>
                                )}
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
                                await handleUnarchive(notification.id);
                              }}
                              className="p-2 text-gray-500 hover:text-green-400 hover:bg-green-500/10 rounded-lg transition-colors touch-manipulation"
                              title="Désarchiver"
                              aria-label="Désarchiver la notification"
                            >
                              <ArchiveRestore className="w-4 h-4 sm:w-5 sm:h-5" />
                            </button>
                            {/* Bouton supprimer définitivement */}
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                await handleDelete(notification.id);
                              }}
                              className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors touch-manipulation"
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
        )}
      </div>

      {/* Modale d'envoi de message (admin seulement) */}
      {isAdmin && (
        <SendMessageModal
          isOpen={isSendModalOpen}
          onClose={() => setIsSendModalOpen(false)}
          onSuccess={async () => {
            // Attendre un peu pour que la notification soit bien créée en DB
            await new Promise((resolve) => setTimeout(resolve, 500));
            // Forcer le refresh (ignore le cache)
            await refresh();
            await fetchArchivedNotifications();
          }}
        />
      )}
    </div>
  );
}
