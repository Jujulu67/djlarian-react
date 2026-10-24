import { Bell, Calendar, Sparkles } from 'lucide-react';

import type { Notification, NotificationType } from '@/hooks/useNotifications';

import {
  filterArchivedByView,
  filterNotificationsByFilter,
  formatDateFrench,
  formatDateTimeFrench,
  getNotificationProjectId,
  getNotificationStyle,
  getNotificationTarget,
  getNotificationVisuals,
  isMessageNotification,
  NOTIFICATION_FILTER_OPTIONS,
  parseMetadata,
  parseNotificationView,
} from '../notificationsUtils';

function makeNotification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: 'n1',
    type: 'INFO',
    title: 'Titre',
    message: null,
    isRead: false,
    createdAt: '2024-01-01T10:00:00Z',
    metadata: null,
    ...overrides,
  } as unknown as Notification;
}

describe('formatDateFrench', () => {
  it('retourne une chaîne vide sans date', () => {
    expect(formatDateFrench(null)).toBe('');
  });

  it('formate en DD/MM/YYYY avec zéros de remplissage', () => {
    expect(formatDateFrench(new Date(2024, 0, 5, 9, 7).toISOString())).toBe('05/01/2024');
  });

  it('pour une date invalide, renvoie NaN (comportement actuel, pas de fallback)', () => {
    expect(formatDateFrench('pas une date')).toBe('NaN/NaN/NaN');
  });
});

describe('formatDateTimeFrench', () => {
  it('retourne une chaîne vide sans date', () => {
    expect(formatDateTimeFrench(null)).toBe('');
  });

  it('formate en DD/MM/YYYY HH:MM', () => {
    expect(formatDateTimeFrench(new Date(2024, 11, 25, 8, 5).toISOString())).toBe(
      '25/12/2024 08:05'
    );
  });
});

describe('parseMetadata', () => {
  it('retourne null sans métadonnées', () => {
    expect(parseMetadata(null)).toBeNull();
  });

  it('retourne null si le JSON est invalide', () => {
    expect(parseMetadata('{pas du json')).toBeNull();
  });

  it('parse un JSON valide', () => {
    expect(parseMetadata(JSON.stringify({ projectId: 'p1', streams: 10 }))).toEqual({
      projectId: 'p1',
      streams: 10,
    });
  });
});

describe('getNotificationStyle', () => {
  it('renvoie le libellé et l’icône du type', () => {
    const style = getNotificationStyle('MILESTONE');
    expect(style.label).toBe('Jalon');
    expect(style.icon).toBe(Calendar);
  });

  it('renvoie le style par défaut pour un type inconnu', () => {
    const style = getNotificationStyle('UNKNOWN' as NotificationType);
    expect(style.label).toBe('Notification');
    expect(style.icon).toBe(Bell);
  });
});

describe('getNotificationProjectId', () => {
  it('privilégie le projectId direct', () => {
    const n = makeNotification({
      projectId: 'direct',
      metadata: JSON.stringify({ projectId: 'meta' }),
    } as Partial<Notification>);
    expect(getNotificationProjectId(n)).toBe('direct');
  });

  it('se rabat sur le projectId des métadonnées', () => {
    const n = makeNotification({ metadata: JSON.stringify({ projectId: 'meta' }) });
    expect(getNotificationProjectId(n)).toBe('meta');
  });

  it('renvoie une valeur vide sans projet', () => {
    expect(getNotificationProjectId(makeNotification())).toBeFalsy();
  });
});

describe('getNotificationTarget', () => {
  it('ne redirige jamais pour un message', () => {
    const n = makeNotification({ type: 'ADMIN_MESSAGE', projectId: 'p1' } as Partial<Notification>);
    expect(getNotificationTarget(n)).toBeNull();
  });

  it('redirige vers le projet surligné', () => {
    const n = makeNotification({ type: 'INFO', projectId: 'p1' } as Partial<Notification>);
    expect(getNotificationTarget(n)).toBe('/projects?highlight=p1&fromNotification=true');
  });

  it('redirige vers /projects pour un jalon sans projet', () => {
    expect(getNotificationTarget(makeNotification({ type: 'MILESTONE' }))).toBe('/projects');
    expect(getNotificationTarget(makeNotification({ type: 'RELEASE_UPCOMING' }))).toBe('/projects');
  });

  it('ne redirige pas pour les autres types sans projet', () => {
    expect(getNotificationTarget(makeNotification({ type: 'INFO' }))).toBeNull();
  });
});

describe('getNotificationVisuals', () => {
  it('garde l’icône du type pour une sortie future', () => {
    const n = makeNotification({ type: 'RELEASE_UPCOMING' });
    const v = getNotificationVisuals(n, { daysUntil: 3 } as never);
    expect(v.Icon).toBe(Calendar);
    expect(v.iconColor).toBe('text-orange-400');
  });

  it('utilise l’icône festive le jour J d’une sortie', () => {
    const n = makeNotification({ type: 'RELEASE_UPCOMING' });
    const v = getNotificationVisuals(n, { daysUntil: 0 } as never);
    expect(v.Icon).toBe(Sparkles);
    expect(v.iconColor).toBe('text-green-400');
    expect(v.bgColor).toBe('bg-green-500/20');
    expect(v.borderColor).toBe('border-green-500/30');
  });

  it('applique aussi le jour J à une INFO de type sortie', () => {
    const n = makeNotification({ type: 'INFO' });
    const v = getNotificationVisuals(n, { type: 'RELEASE_UPCOMING', daysUntil: 0 } as never);
    expect(v.Icon).toBe(Sparkles);
  });
});

describe('isMessageNotification', () => {
  it('reconnaît les messages admin et utilisateur uniquement', () => {
    expect(isMessageNotification(makeNotification({ type: 'ADMIN_MESSAGE' }))).toBe(true);
    expect(isMessageNotification(makeNotification({ type: 'USER_MESSAGE' }))).toBe(true);
    expect(isMessageNotification(makeNotification({ type: 'INFO' }))).toBe(false);
  });
});

describe('filterNotificationsByFilter', () => {
  const list = [
    makeNotification({ id: 'a', type: 'INFO', isRead: false }),
    makeNotification({ id: 'b', type: 'WARNING', isRead: true }),
    makeNotification({ id: 'c', type: 'INFO', isRead: true }),
    makeNotification({
      id: 'd',
      type: 'INFO',
      isRead: false,
      parentId: 'a',
    } as Partial<Notification>),
  ];

  it('garde tout sauf les réponses avec le filtre "all"', () => {
    expect(filterNotificationsByFilter(list, 'all').map((n) => n.id)).toEqual(['a', 'b', 'c']);
  });

  it('filtre les non lues', () => {
    expect(filterNotificationsByFilter(list, 'unread').map((n) => n.id)).toEqual(['a']);
  });

  it('filtre par type', () => {
    expect(filterNotificationsByFilter(list, 'WARNING').map((n) => n.id)).toEqual(['b']);
  });
});

describe('filterArchivedByView', () => {
  const archived = [
    makeNotification({ id: 'm', type: 'ADMIN_MESSAGE' }),
    makeNotification({ id: 'u', type: 'USER_MESSAGE' }),
    makeNotification({ id: 'i', type: 'INFO' }),
  ];

  it('ne renvoie rien pour la vue amis', () => {
    expect(filterArchivedByView(archived, 'friends')).toEqual([]);
  });

  it('ne renvoie que les messages pour la vue messages', () => {
    expect(filterArchivedByView(archived, 'messages').map((n) => n.id)).toEqual(['m', 'u']);
  });

  it('ne renvoie que les non-messages pour la vue notifications', () => {
    expect(filterArchivedByView(archived, 'notifications').map((n) => n.id)).toEqual(['i']);
  });
});

describe('parseNotificationView', () => {
  it('accepte les trois vues connues', () => {
    expect(parseNotificationView('messages')).toBe('messages');
    expect(parseNotificationView('notifications')).toBe('notifications');
    expect(parseNotificationView('friends')).toBe('friends');
  });

  it('renvoie null pour une valeur absente ou inconnue', () => {
    expect(parseNotificationView(null)).toBeNull();
    expect(parseNotificationView('autre')).toBeNull();
  });
});

describe('NOTIFICATION_FILTER_OPTIONS', () => {
  it('liste les options de filtre dans l’ordre d’affichage', () => {
    expect(NOTIFICATION_FILTER_OPTIONS.map((o) => o.value)).toEqual([
      'all',
      'unread',
      'MILESTONE',
      'RELEASE_UPCOMING',
      'ADMIN_MESSAGE',
      'USER_MESSAGE',
      'WARNING',
      'INFO',
    ]);
  });
});
