import { useState, useEffect, useCallback, useRef } from 'react';
import { usePathname } from 'next/navigation';

import { fetchWithAuth } from '@/lib/api/fetchWithAuth';

export type NotificationType =
  | 'MILESTONE'
  | 'ADMIN_MESSAGE'
  | 'RELEASE_UPCOMING'
  | 'INFO'
  | 'WARNING';

export interface NotificationMetadata {
  milestoneType?: string;
  projectId?: string;
  projectName?: string;
  streams?: number;
  releaseDate?: string;
  [key: string]: unknown;
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string | null;
  metadata: string | null; // JSON string
  isRead: boolean;
  isArchived?: boolean;
  createdAt: string;
  readAt: string | null;
  projectId: string | null;
  Project?: {
    id: string;
    name: string;
    releaseDate: string | null;
    streamsJ180: number | null;
    streamsJ365: number | null;
  } | null;
}

interface NotificationsResponse {
  notifications: Notification[];
  unreadCount: number;
  total: number;
}

interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  archive: (id: string) => Promise<void>;
  unarchive: (id: string) => Promise<void>;
  delete: (id: string) => Promise<void>;
}

/**
 * Hook générique pour gérer les notifications
 */
export function useNotifications(
  options: {
    unreadOnly?: boolean;
    type?: NotificationType;
    autoRefresh?: boolean;
    refreshInterval?: number;
    refreshOnPageChange?: boolean;
  } = {}
): UseNotificationsReturn {
  const {
    unreadOnly = false,
    type,
    autoRefresh = false,
    refreshInterval = 300000,
    refreshOnPageChange = false,
  } = options;
  const pathname = usePathname();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cache pour éviter les requêtes trop fréquentes (minimum 30 secondes entre deux requêtes)
  const lastFetchRef = useRef<number>(0);
  const lastBlurRef = useRef<number>(0); // Timestamp du dernier blur (quand on quitte l'onglet)
  const MIN_FETCH_INTERVAL = 30000; // 30 secondes minimum entre deux requêtes
  const FORCE_REFRESH_AFTER_BLUR = 10000; // Forcer le refresh si on revient après plus de 10 secondes

  const fetchNotifications = useCallback(
    async (force = false) => {
      // Vérifier si on peut faire une requête (éviter les requêtes trop fréquentes)
      const now = Date.now();
      if (!force && now - lastFetchRef.current < MIN_FETCH_INTERVAL) {
        // Trop tôt, on skip cette requête
        return;
      }

      lastFetchRef.current = now;
      try {
        setIsLoading(true);
        setError(null);

        const params = new URLSearchParams();
        if (unreadOnly) {
          params.set('unreadOnly', 'true');
        }
        if (type) {
          params.set('type', type);
        }
        params.set('limit', '50');

        const response = await fetchWithAuth(`/api/notifications?${params.toString()}`);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Erreur lors du chargement des notifications');
        }

        const jsonData = await response.json();
        // La réponse peut être { data: {...} } ou directement {...}
        const result = jsonData?.data || jsonData;

        if (!result || typeof result !== 'object') {
          throw new Error('Format de réponse invalide');
        }

        // Valider et normaliser les notifications
        const notificationsList = (result.notifications || []).map((notif: any) => ({
          ...notif,
          isArchived: notif.isArchived ?? false,
          deletedAt: notif.deletedAt ?? null,
          createdAt:
            typeof notif.createdAt === 'string'
              ? notif.createdAt
              : notif.createdAt?.toISOString() || new Date().toISOString(),
          readAt: notif.readAt
            ? typeof notif.readAt === 'string'
              ? notif.readAt
              : notif.readAt.toISOString()
            : null,
        }));

        const newUnreadCount = result.unreadCount || 0;

        // Détecter si de nouvelles notifications non lues sont arrivées
        setUnreadCount((prevCount) => {
          // Si le compteur a augmenté, émettre un événement pour synchroniser les autres instances
          if (newUnreadCount > prevCount) {
            window.dispatchEvent(
              new CustomEvent('notifications-updated', {
                detail: { unreadCount: newUnreadCount, previousCount: prevCount },
              })
            );
          }
          return newUnreadCount;
        });

        setNotifications(notificationsList);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur inconnue');
        console.error('Erreur lors du chargement des notifications:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [unreadOnly, type]
  );

  const markAsRead = useCallback(async (id: string) => {
    try {
      const response = await fetchWithAuth(`/api/notifications/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isRead: true }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de la mise à jour');
      }

      // Mettre à jour l'état local
      setNotifications((prev) =>
        prev.map((notif) =>
          notif.id === id ? { ...notif, isRead: true, readAt: new Date().toISOString() } : notif
        )
      );

      // Décrémenter le compteur si la notification était non lue
      setUnreadCount((prev) => Math.max(0, prev - 1));

      // Émettre un événement pour synchroniser les autres instances du hook
      window.dispatchEvent(new CustomEvent('notification-read', { detail: { id } }));
    } catch (err) {
      console.error('Erreur lors de la mise à jour de la notification:', err);
      throw err;
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      const response = await fetchWithAuth('/api/notifications/read-all', {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de la mise à jour');
      }

      // Mettre à jour l'état local
      setNotifications((prev) =>
        prev.map((notif) => ({
          ...notif,
          isRead: true,
          readAt: notif.readAt || new Date().toISOString(),
        }))
      );

      setUnreadCount(0);

      // Émettre un événement pour synchroniser les autres instances du hook
      window.dispatchEvent(new CustomEvent('notifications-all-read'));
    } catch (err) {
      console.error('Erreur lors de la mise à jour de toutes les notifications:', err);
      throw err;
    }
  }, []);

  const archive = useCallback(
    async (id: string) => {
      try {
        const response = await fetchWithAuth(`/api/notifications/${id}/archive`, {
          method: 'PATCH',
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Erreur lors de l'archivage");
        }

        // Retirer la notification de la liste
        setNotifications((prev) => prev.filter((notif) => notif.id !== id));

        // Décrémenter le compteur si la notification était non lue
        setUnreadCount((prev) => {
          const notif = notifications.find((n) => n.id === id);
          return notif && !notif.isRead ? Math.max(0, prev - 1) : prev;
        });
      } catch (err) {
        console.error("Erreur lors de l'archivage de la notification:", err);
        throw err;
      }
    },
    [notifications]
  );

  const unarchive = useCallback(async (id: string) => {
    try {
      const response = await fetchWithAuth(`/api/notifications/${id}/unarchive`, {
        method: 'PATCH',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors du désarchivage');
      }

      // La notification sera rechargée via refresh
    } catch (err) {
      console.error('Erreur lors du désarchivage de la notification:', err);
      throw err;
    }
  }, []);

  const deleteNotification = useCallback(
    async (id: string) => {
      try {
        const response = await fetchWithAuth(`/api/notifications/${id}/delete`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Erreur lors de la suppression');
        }

        // Retirer la notification de la liste
        setNotifications((prev) => prev.filter((notif) => notif.id !== id));

        // Décrémenter le compteur si la notification était non lue
        setUnreadCount((prev) => {
          const notif = notifications.find((n) => n.id === id);
          return notif && !notif.isRead ? Math.max(0, prev - 1) : prev;
        });
      } catch (err) {
        console.error('Erreur lors de la suppression de la notification:', err);
        throw err;
      }
    },
    [notifications]
  );

  // Charger les notifications au montage (forcer le chargement initial)
  useEffect(() => {
    fetchNotifications(true); // true = forcer le chargement même si récent
  }, [fetchNotifications]);

  // Rafraîchir lors des changements de page (avec debounce intelligent)
  useEffect(() => {
    if (!refreshOnPageChange) return;

    // Ne rafraîchir que si la dernière requête date de plus de 30 secondes
    // Cela évite les requêtes multiples lors de navigations rapides
    const now = Date.now();
    if (now - lastFetchRef.current < MIN_FETCH_INTERVAL) {
      return; // Trop tôt, on skip
    }

    // Utiliser un délai pour éviter les requêtes multiples
    const timeoutId = setTimeout(() => {
      fetchNotifications(false); // false = respecter le cache
    }, 500); // 500ms de délai pour éviter les requêtes lors de navigations très rapides

    return () => clearTimeout(timeoutId);
  }, [pathname, refreshOnPageChange, fetchNotifications]);

  // Rafraîchir quand la fenêtre reprend le focus (utilisateur revient sur l'onglet)
  useEffect(() => {
    if (!autoRefresh) return;

    const handleFocus = () => {
      const now = Date.now();
      // Forcer le refresh si :
      // 1. On revient après plus de 10 secondes d'absence
      // 2. OU la dernière requête date de plus de 30 secondes
      const timeSinceBlur = lastBlurRef.current > 0 ? now - lastBlurRef.current : Infinity;
      const timeSinceLastFetch = now - lastFetchRef.current;

      if (timeSinceBlur >= FORCE_REFRESH_AFTER_BLUR || timeSinceLastFetch >= MIN_FETCH_INTERVAL) {
        fetchNotifications(false); // false = respecter le cache (mais on force si conditions remplies)
      }
      lastBlurRef.current = 0; // Réinitialiser
    };

    const handleBlur = () => {
      // Enregistrer le moment où on quitte l'onglet
      lastBlurRef.current = Date.now();
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, [autoRefresh, fetchNotifications]);

  // Écouter les événements de synchronisation depuis d'autres instances du hook
  useEffect(() => {
    const handleNotificationRead = () => {
      // Décrémenter le compteur immédiatement pour une mise à jour réactive
      setUnreadCount((prev) => Math.max(0, prev - 1));
      // Rafraîchir en arrière-plan pour synchroniser (sans forcer, respecter le cache)
      // Utiliser un petit délai pour éviter les requêtes multiples
      setTimeout(() => {
        fetchNotifications(false);
      }, 500);
    };

    const handleAllRead = () => {
      // Mettre à jour le compteur à 0 immédiatement
      setUnreadCount(0);
      // Rafraîchir en arrière-plan pour synchroniser
      setTimeout(() => {
        fetchNotifications(false);
      }, 500);
    };

    const handleNotificationsUpdated = (event: CustomEvent) => {
      // Mettre à jour le compteur avec la nouvelle valeur
      const { unreadCount: newCount } = event.detail;
      setUnreadCount(newCount);
    };

    window.addEventListener('notification-read', handleNotificationRead);
    window.addEventListener('notifications-all-read', handleAllRead);
    window.addEventListener('notifications-updated', handleNotificationsUpdated as EventListener);

    return () => {
      window.removeEventListener('notification-read', handleNotificationRead);
      window.removeEventListener('notifications-all-read', handleAllRead);
      window.removeEventListener(
        'notifications-updated',
        handleNotificationsUpdated as EventListener
      );
    };
  }, [fetchNotifications]);

  // Auto-refresh optionnel (polling périodique)
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchNotifications();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchNotifications]);

  // Fonction refresh publique qui force le rafraîchissement
  const refresh = useCallback(() => {
    // Réinitialiser le cache pour forcer le refresh
    lastFetchRef.current = 0;
    return fetchNotifications(true); // true = forcer même si récent
  }, [fetchNotifications]);

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    refresh,
    markAsRead,
    markAllAsRead,
    archive,
    unarchive,
    delete: deleteNotification,
  };
}

// Alias pour compatibilité avec l'ancien code
export const useMilestoneNotifications = useNotifications;
