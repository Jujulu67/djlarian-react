import {
  AlertCircle,
  Bell,
  Calendar,
  Info,
  MessageSquare,
  Sparkles,
  UserCheck,
  UserPlus,
  UserX,
} from 'lucide-react';

import type {
  Notification,
  NotificationMetadata,
  NotificationType,
} from '@/hooks/useNotifications';

/**
 * Formate une date ISO en format français (DD/MM/YYYY)
 */
export function formatDateFrench(dateString: string | null): string {
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
export function formatDateTimeFrench(dateString: string | null): string {
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
export function getNotificationStyle(type: NotificationType): {
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
    case 'USER_MESSAGE':
      return {
        icon: MessageSquare,
        bgColor: 'bg-green-500/20',
        borderColor: 'border-green-500/30',
        iconColor: 'text-green-400',
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
      return {
        icon: Info,
        bgColor: 'bg-blue-500/20',
        borderColor: 'border-blue-500/30',
        iconColor: 'text-blue-400',
        label: 'Information',
      };
    case 'FRIEND_REQUEST':
      return {
        icon: UserPlus,
        bgColor: 'bg-purple-500/20',
        borderColor: 'border-purple-500/30',
        iconColor: 'text-purple-400',
        label: "Demande d'ami",
      };
    case 'FRIEND_ACCEPTED':
      return {
        icon: UserCheck,
        bgColor: 'bg-green-500/20',
        borderColor: 'border-green-500/30',
        iconColor: 'text-green-400',
        label: 'Ami accepté',
      };
    case 'FRIEND_REJECTED':
      return {
        icon: UserX,
        bgColor: 'bg-red-500/20',
        borderColor: 'border-red-500/30',
        iconColor: 'text-red-400',
        label: 'Ami rejeté',
      };
    default:
      return {
        icon: Bell,
        bgColor: 'bg-gray-500/20',
        borderColor: 'border-gray-500/30',
        iconColor: 'text-gray-400',
        label: 'Notification',
      };
  }
}

/**
 * Parse les métadonnées d'une notification
 */
export function parseMetadata(metadata: string | null): NotificationMetadata | null {
  if (!metadata) return null;
  try {
    return JSON.parse(metadata);
  } catch {
    return null;
  }
}

export type NotificationView = 'messages' | 'notifications' | 'friends';
export type NotificationFilter = 'all' | 'unread' | NotificationType;

export const NOTIFICATION_FILTER_OPTIONS: Array<{ value: NotificationFilter; label: string }> = [
  { value: 'all', label: 'Toutes' },
  { value: 'unread', label: 'Non lues' },
  { value: 'MILESTONE', label: 'Jalons' },
  { value: 'RELEASE_UPCOMING', label: 'Sorties' },
  { value: 'ADMIN_MESSAGE', label: 'Messages Admin' },
  { value: 'USER_MESSAGE', label: 'Messages Utilisateurs' },
  { value: 'WARNING', label: 'Alertes' },
  { value: 'INFO', label: 'Infos' },
];

/**
 * Lit le paramètre d'URL `view` (null si absent ou invalide)
 */
export function parseNotificationView(viewParam: string | null): NotificationView | null {
  return viewParam === 'messages' || viewParam === 'notifications' || viewParam === 'friends'
    ? viewParam
    : null;
}

/**
 * Un message = notification de type ADMIN_MESSAGE ou USER_MESSAGE
 */
export function isMessageNotification(notification: Notification): boolean {
  return notification.type === 'ADMIN_MESSAGE' || notification.type === 'USER_MESSAGE';
}

/**
 * Applique le filtre sélectionné puis exclut les réponses (affichées dans les threads)
 */
export function filterNotificationsByFilter(
  notifications: Notification[],
  filter: NotificationFilter
): Notification[] {
  let filtered = notifications;

  if (filter === 'unread') {
    filtered = notifications.filter((n) => !n.isRead);
  } else if (filter !== 'all') {
    filtered = notifications.filter((n) => n.type === filter);
  }

  return filtered.filter((n) => !n.parentId);
}

/**
 * Notifications archivées à afficher selon la vue active
 */
export function filterArchivedByView(
  archived: Notification[],
  activeView: NotificationView
): Notification[] {
  if (activeView === 'friends') {
    return [];
  }
  if (activeView === 'messages') {
    return archived.filter((n) => isMessageNotification(n));
  }
  return archived.filter((n) => !isMessageNotification(n));
}

/**
 * ID du projet lié à une notification (champ direct, sinon métadonnées)
 */
export function getNotificationProjectId(notification: Notification) {
  return (
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
      : null)
  );
}

/**
 * Destination au clic sur une notification (null = rester sur place)
 */
export function getNotificationTarget(notification: Notification): string | null {
  if (isMessageNotification(notification)) {
    return null;
  }

  const projectId = getNotificationProjectId(notification);
  if (projectId) {
    return `/projects?highlight=${projectId}&fromNotification=true`;
  }

  if (notification.type === 'MILESTONE' || notification.type === 'RELEASE_UPCOMING') {
    return '/projects';
  }

  return null;
}

/**
 * Icône et couleurs d'une notification (icône festive le jour J d'une sortie)
 */
export function getNotificationVisuals(
  notification: Notification,
  metadata: NotificationMetadata | null
) {
  const style = getNotificationStyle(notification.type);

  let Icon = style.icon;
  let iconColor = style.iconColor;
  let bgColor = style.bgColor;
  let borderColor = style.borderColor;

  if (
    notification.type === 'RELEASE_UPCOMING' ||
    (notification.type === 'INFO' && metadata?.type === 'RELEASE_UPCOMING')
  ) {
    if (metadata?.daysUntil === 0) {
      Icon = Sparkles;
      iconColor = 'text-green-400';
      bgColor = 'bg-green-500/20';
      borderColor = 'border-green-500/30';
    }
  }

  return { Icon, iconColor, bgColor, borderColor };
}
