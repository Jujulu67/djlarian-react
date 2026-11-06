import { useEffect, useState } from 'react';

import type { Notification } from '@/hooks/useNotifications';
import { fetchWithAuth } from '@/lib/api/fetchWithAuth';
import { logger } from '@/lib/logger';

/**
 * Charge les notifications archivées séparément de la liste principale
 */
export function useArchivedNotifications() {
  const [archivedNotifications, setArchivedNotifications] = useState<Notification[]>([]);

  const fetchArchivedNotifications = async () => {
    const archived = await loadArchivedNotifications();
    if (archived) setArchivedNotifications(archived);
  };

  useEffect(() => {
    let alive = true;
    loadArchivedNotifications().then((archived) => {
      if (alive && archived) setArchivedNotifications(archived);
    });
    return () => {
      alive = false;
    };
  }, []);

  return { archivedNotifications, setArchivedNotifications, fetchArchivedNotifications };
}

/** Notifications archivées (non supprimées), ou null en cas d'échec. */
async function loadArchivedNotifications(): Promise<Notification[] | null> {
  try {
    const response = await fetchWithAuth('/api/notifications?includeArchived=true&limit=100');
    if (response.ok) {
      const data = await response.json();
      const result = data?.data || data;
      const archived = (result.notifications || []).filter(
        (n: Notification) => n.isArchived && !n.deletedAt
      );
      return archived;
    }
  } catch (err) {
    logger.error('Erreur lors du chargement des notifications archivées:', err);
  }
  return null;
}
