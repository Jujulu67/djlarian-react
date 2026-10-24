import { useEffect, useState } from 'react';

import type { Notification } from '@/hooks/useNotifications';
import { fetchWithAuth } from '@/lib/api/fetchWithAuth';

/**
 * Charge les notifications archivées séparément de la liste principale
 */
export function useArchivedNotifications() {
  const [archivedNotifications, setArchivedNotifications] = useState<Notification[]>([]);

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

  return { archivedNotifications, setArchivedNotifications, fetchArchivedNotifications };
}
