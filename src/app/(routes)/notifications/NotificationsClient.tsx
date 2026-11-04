'use client';

import { ArrowLeft, Bell, Loader2, MessageSquare, TestTube } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useState, useMemo, useEffect } from 'react';

import { PageHeader } from '@/components/ui/PageHeader';
import { useNotifications, Notification } from '@/hooks/useNotifications';
import { useUiVersion } from '@/hooks/useUiVersion';
import { SendMessageModal } from '@/components/notifications/SendMessageModal';
import { NotificationTestModal } from '@/components/notifications/NotificationTestModal';
import { FriendsList } from '@/components/notifications/FriendsList';

import { ArchivedNotificationsSection } from './components/ArchivedNotificationsSection';
import { NotificationItem } from './components/NotificationItem';
import { NotificationsTabs } from './components/NotificationsTabs';
import { NotificationsToolbar } from './components/NotificationsToolbar';
import { useArchivedNotifications } from './useArchivedNotifications';
import {
  filterArchivedByView,
  filterNotificationsByFilter,
  getNotificationTarget,
  parseNotificationView,
  type NotificationFilter,
  type NotificationView,
} from './notificationsUtils';
export default function NotificationsClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const isV2 = useUiVersion() !== 'legacy';

  // Déterminer la vue initiale depuis l'URL (par défaut: 'notifications')
  const [activeView, setActiveView] = useState<NotificationView>(
    parseNotificationView(searchParams.get('view')) ?? 'notifications'
  );

  const [filter, setFilter] = useState<NotificationFilter>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [replyToNotification, setReplyToNotification] = useState<Notification | null>(null);
  // État pour gérer l'ouverture/fermeture des threads
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set());

  // Synchroniser avec l'URL si le paramètre change
  useEffect(() => {
    const viewFromUrl = parseNotificationView(searchParams.get('view'));
    if (viewFromUrl) {
      setActiveView(viewFromUrl);
    }
  }, [searchParams]);

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
    refreshInterval: 30000, // 30 secondes pour une mise à jour plus rapide des messages
    refreshOnPageChange: true, // Activé uniquement sur la page notifications
  });

  // Notifications archivées (chargement séparé)
  const { archivedNotifications, setArchivedNotifications, fetchArchivedNotifications } =
    useArchivedNotifications();
  const [showArchived, setShowArchived] = useState(false);

  // Filtrer les notifications archivées selon la vue active
  const filteredArchivedNotifications = useMemo(
    () => filterArchivedByView(archivedNotifications, activeView),
    [archivedNotifications, activeView]
  );

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

  // Filtrer les notifications selon le filtre actif (les réponses sont dans les threads)
  const filteredNotifications = useMemo(
    () => filterNotificationsByFilter(notifications, filter),
    [notifications, filter]
  );

  // Séparer les messages des autres notifications
  const messages = useMemo(
    () =>
      filteredNotifications.filter((n) => n.type === 'ADMIN_MESSAGE' || n.type === 'USER_MESSAGE'),
    [filteredNotifications]
  );

  const otherNotifications = useMemo(
    () =>
      filteredNotifications.filter((n) => n.type !== 'ADMIN_MESSAGE' && n.type !== 'USER_MESSAGE'),
    [filteredNotifications]
  );

  // Notifications à afficher selon la vue active
  const displayedNotifications = useMemo(
    () => (activeView === 'messages' ? messages : otherNotifications),
    [activeView, messages, otherNotifications]
  );

  // Fonction pour toggle l'état d'un thread
  const toggleThread = (notificationId: string) => {
    setExpandedThreads((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(notificationId)) {
        newSet.delete(notificationId);
      } else {
        newSet.add(notificationId);
      }
      return newSet;
    });
  };

  const handleNotificationClick = async (notification: Notification) => {
    // Marquer comme lu
    if (!notification.isRead) {
      try {
        await markAsRead(notification.id);
      } catch (err) {
        console.error('Erreur lors de la mise à jour:', err);
      }
    }

    // Redirection selon le type (aucune pour les messages : on reste sur place)
    const target = getNotificationTarget(notification);
    if (target) {
      router.push(target);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
    } catch (err) {
      console.error('Erreur lors de la mise à jour:', err);
    }
  };

  const handleSelectView = (view: NotificationView) => {
    setActiveView(view);
    const params = new URLSearchParams(searchParams.toString());
    params.set('view', view);
    router.push(`/notifications?${params.toString()}`);
  };

  const openNewMessageModal = () => {
    setReplyToNotification(null);
    setIsSendModalOpen(true);
  };

  const openReplyModal = (notification: Notification) => {
    setReplyToNotification(notification);
    setIsSendModalOpen(true);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 pb-4 v2:bg-none v2:bg-transparent v2:pb-16">
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 md:py-8 max-w-6xl v2:max-w-[1180px] v2:px-4 v2:py-10 md:v2:py-14">
        {/* Header */}
        <div className="mb-4 sm:mb-6 md:mb-8 v2:mb-6">
          {isV2 ? (
            <PageHeader
              eyebrow="Messagerie"
              title="Notifications"
              description={
                unreadCount > 0
                  ? `${unreadCount} non ${unreadCount === 1 ? 'lue' : 'lues'}`
                  : 'Tout est à jour'
              }
              className="mb-6 md:mb-8"
              actions={
                isAdmin ? (
                  <button
                    onClick={() => setIsTestModalOpen(true)}
                    className="flex items-center gap-2 rounded-xl bg-white/[0.04] px-4 py-2 text-sm font-medium text-white/70 ring-1 ring-inset ring-white/10 transition-colors hover:bg-white/[0.08] hover:text-white active:scale-[0.98]"
                    title="Tests de notifications"
                    aria-label="Tests de notifications"
                  >
                    <TestTube className="h-4 w-4" />
                    <span>Tests notifs</span>
                  </button>
                ) : undefined
              }
            />
          ) : (
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
              {/* Bouton discret pour les tests (admin uniquement) */}
              {isAdmin && (
                <button
                  onClick={() => setIsTestModalOpen(true)}
                  className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 rounded-lg text-yellow-300 text-xs sm:text-sm font-medium transition-colors touch-manipulation"
                  title="Tests de notifications"
                  aria-label="Tests de notifications"
                >
                  <TestTube className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="hidden sm:inline">Tests notifs</span>
                </button>
              )}
            </div>
          )}

          {/* Onglets Messages / Notifications / Amis */}
          <NotificationsTabs
            activeView={activeView}
            onSelectView={handleSelectView}
            otherCount={otherNotifications.length}
            messagesCount={messages.length}
          />

          <NotificationsToolbar
            activeView={activeView}
            filter={filter}
            setFilter={setFilter}
            showFilters={showFilters}
            setShowFilters={setShowFilters}
            unreadCount={unreadCount}
            onNewMessage={openNewMessageModal}
            onMarkAllAsRead={handleMarkAllAsRead}
          />
        </div>

        {/* Content */}
        <div className="bg-gradient-to-br from-gray-900/95 via-gray-800/95 to-gray-900/95 backdrop-blur-xl border border-purple-500/30 rounded-lg sm:rounded-xl shadow-2xl overflow-hidden v2:bg-none v2:surface-1 v2:rounded-2xl">
          {activeView === 'friends' ? (
            <div className="p-4 sm:p-6">
              <FriendsList />
            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center py-8 sm:py-12">
              <Loader2 className="w-6 h-6 animate-spin text-purple-500 v2:text-white/50" />
            </div>
          ) : error ? (
            <div className="p-4 sm:p-6 text-center">
              <p className="text-red-400 text-xs sm:text-sm v2:text-red-300">{error}</p>
              <button
                onClick={() => refresh()}
                className="mt-3 sm:mt-4 px-3 sm:px-4 py-2 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 rounded-lg text-purple-300 text-xs sm:text-sm font-medium transition-colors touch-manipulation v2:rounded-xl v2:border-transparent v2:bg-white/[0.04] v2:ring-1 v2:ring-inset v2:ring-white/10 v2:text-white/80 v2:hover:bg-white/[0.08] v2:hover:text-white"
              >
                Réessayer
              </button>
            </div>
          ) : displayedNotifications.length === 0 ? (
            <div className="p-8 sm:p-12 text-center">
              {activeView === 'messages' ? (
                <>
                  <MessageSquare className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 text-gray-500 v2:box-content v2:size-6 sm:v2:size-6 v2:rounded-full v2:bg-white/[0.04] v2:p-4 v2:text-white/50" />
                  <p className="text-gray-400 text-base sm:text-lg mb-2 v2:text-white/60">
                    Aucun message
                  </p>
                  <button
                    onClick={openNewMessageModal}
                    className="mt-3 sm:mt-4 px-3 sm:px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 rounded-lg text-blue-300 text-xs sm:text-sm font-medium transition-colors touch-manipulation v2:rounded-xl v2:border-transparent v2:bg-gradient-to-b v2:from-brand v2:to-purple-600 v2:text-white v2:shadow-[inset_0_1px_0_rgb(255_255_255/0.22)] v2:hover:brightness-110"
                  >
                    Envoyer un message
                  </button>
                </>
              ) : (
                <>
                  <Bell className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 text-gray-500 v2:box-content v2:size-6 sm:v2:size-6 v2:rounded-full v2:bg-white/[0.04] v2:p-4 v2:text-white/50" />
                  <p className="text-gray-400 text-base sm:text-lg mb-2 v2:text-white/60">
                    {filter === 'unread' ? 'Aucune notification non lue' : 'Aucune notification'}
                  </p>
                  {filter !== 'all' && (
                    <button
                      onClick={() => setFilter('all')}
                      className="mt-3 sm:mt-4 px-3 sm:px-4 py-2 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 rounded-lg text-purple-300 text-xs sm:text-sm font-medium transition-colors touch-manipulation v2:rounded-xl v2:border-transparent v2:bg-white/[0.04] v2:ring-1 v2:ring-inset v2:ring-white/10 v2:text-white/80 v2:hover:bg-white/[0.08] v2:hover:text-white"
                    >
                      Voir toutes les notifications
                    </button>
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="max-h-[calc(100vh-16rem)] sm:max-h-[calc(100vh-20rem)] overflow-y-auto">
              <div className="divide-y divide-gray-700/50 v2:divide-white/[0.06]">
                {displayedNotifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    isThreadExpanded={expandedThreads.has(notification.id)}
                    onToggleThread={toggleThread}
                    onMarkAsRead={markAsRead}
                    onOpen={handleNotificationClick}
                    onArchive={handleArchive}
                    onReply={openReplyModal}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Section Notifications archivées */}
        {filteredArchivedNotifications.length > 0 && (
          <ArchivedNotificationsSection
            notifications={filteredArchivedNotifications}
            activeView={activeView}
            showArchived={showArchived}
            setShowArchived={setShowArchived}
            onUnarchive={handleUnarchive}
            onDelete={handleDelete}
          />
        )}
      </div>

      {/* Modale d'envoi de message (tous les utilisateurs) */}
      <SendMessageModal
        isOpen={isSendModalOpen}
        onClose={() => {
          setIsSendModalOpen(false);
          setReplyToNotification(null);
        }}
        replyTo={replyToNotification}
        onSuccess={async () => {
          // Attendre un peu pour que la notification soit bien créée en DB
          await new Promise((resolve) => setTimeout(resolve, 500));
          // Forcer le refresh (ignore le cache)
          await refresh();
          await fetchArchivedNotifications();
          setReplyToNotification(null);
        }}
      />

      {/* Modale de tests de notifications (admin uniquement) */}
      <NotificationTestModal
        isOpen={isTestModalOpen}
        onClose={() => setIsTestModalOpen(false)}
        onSuccess={async () => {
          // Attendre un peu pour que la notification soit bien créée en DB
          await new Promise((resolve) => setTimeout(resolve, 500));
          // Forcer le refresh (ignore le cache)
          await refresh();
          await fetchArchivedNotifications();
        }}
      />
    </div>
  );
}
