import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';

import { fetchWithAuth } from '@/lib/api/fetchWithAuth';

export interface FriendUser {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role: string | null;
}

export interface Friend {
  id: string;
  user: FriendUser;
  friendshipId: string;
  createdAt: string;
}

export interface PendingRequest {
  id: string;
  user: FriendUser;
  friendshipId: string;
  createdAt: string;
}

interface FriendsResponse {
  friends: Friend[];
  pendingReceived: PendingRequest[];
  pendingSent: PendingRequest[];
}

interface UseFriendsReturn {
  friends: Friend[];
  pendingReceived: PendingRequest[];
  pendingSent: PendingRequest[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  sendRequest: (userId: string) => Promise<void>;
  acceptRequest: (friendshipId: string) => Promise<void>;
  rejectRequest: (friendshipId: string) => Promise<void>;
  unfriend: (friendshipId: string) => Promise<void>;
}

/**
 * Hook pour gérer les relations d'amitié
 */
export function useFriends(): UseFriendsReturn {
  const { data: session, status: sessionStatus } = useSession();

  const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingReceived, setPendingReceived] = useState<PendingRequest[]>([]);
  const [pendingSent, setPendingSent] = useState<PendingRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFriends = useCallback(async () => {
    // Ne pas faire de requête si l'utilisateur n'est pas authentifié
    if (sessionStatus !== 'authenticated' || !session?.user?.id) {
      setFriends([]);
      setPendingReceived([]);
      setPendingSent([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetchWithAuth('/api/friends');

      if (!response.ok) {
        if (response.status === 401) {
          setFriends([]);
          setPendingReceived([]);
          setPendingSent([]);
          setError(null);
          return;
        }

        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Erreur lors du chargement des amis');
      }

      const jsonData = await response.json();
      const result = (jsonData?.data || jsonData) as FriendsResponse;

      if (!result || typeof result !== 'object') {
        throw new Error('Format de réponse invalide');
      }

      // Normaliser les dates
      const normalizeDate = (date: string | Date): string => {
        if (typeof date === 'string') return date;
        if (date instanceof Date) return date.toISOString();
        return new Date().toISOString();
      };

      setFriends(
        (result.friends || []).map((friend) => ({
          ...friend,
          createdAt: normalizeDate(friend.createdAt),
        }))
      );
      setPendingReceived(
        (result.pendingReceived || []).map((req) => ({
          ...req,
          createdAt: normalizeDate(req.createdAt),
        }))
      );
      setPendingSent(
        (result.pendingSent || []).map((req) => ({
          ...req,
          createdAt: normalizeDate(req.createdAt),
        }))
      );
    } catch (err) {
      if (err instanceof Error && err.message.includes('Non autorisé')) {
        setFriends([]);
        setPendingReceived([]);
        setPendingSent([]);
        setError(null);
      } else {
        setError(err instanceof Error ? err.message : 'Erreur inconnue');
        console.error('Erreur lors du chargement des amis:', err);
      }
    } finally {
      setIsLoading(false);
    }
  }, [sessionStatus, session]);

  const sendRequest = useCallback(
    async (userId: string) => {
      try {
        const response = await fetchWithAuth('/api/friends/request', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Erreur lors de l'envoi de la demande");
        }

        // Rafraîchir la liste
        await fetchFriends();
      } catch (err) {
        console.error("Erreur lors de l'envoi de la demande:", err);
        throw err;
      }
    },
    [fetchFriends]
  );

  const acceptRequest = useCallback(
    async (friendshipId: string) => {
      try {
        const response = await fetchWithAuth(`/api/friends/${friendshipId}/accept`, {
          method: 'POST',
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Erreur lors de l'acceptation");
        }

        // Rafraîchir la liste
        await fetchFriends();
      } catch (err) {
        console.error("Erreur lors de l'acceptation:", err);
        throw err;
      }
    },
    [fetchFriends]
  );

  const rejectRequest = useCallback(
    async (friendshipId: string) => {
      try {
        const response = await fetchWithAuth(`/api/friends/${friendshipId}/reject`, {
          method: 'POST',
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Erreur lors du rejet');
        }

        // Rafraîchir la liste
        await fetchFriends();
      } catch (err) {
        console.error('Erreur lors du rejet:', err);
        throw err;
      }
    },
    [fetchFriends]
  );

  const unfriend = useCallback(
    async (friendshipId: string) => {
      try {
        const response = await fetchWithAuth(`/api/friends/${friendshipId}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Erreur lors de la suppression');
        }

        // Rafraîchir la liste
        await fetchFriends();
      } catch (err) {
        console.error('Erreur lors de la suppression:', err);
        throw err;
      }
    },
    [fetchFriends]
  );

  // Charger les amis au montage
  useEffect(() => {
    if (sessionStatus === 'authenticated' && session?.user?.id) {
      fetchFriends();
    } else {
      setFriends([]);
      setPendingReceived([]);
      setPendingSent([]);
      setError(null);
      setIsLoading(false);
    }
  }, [fetchFriends, sessionStatus, session]);

  const refresh = useCallback(() => {
    return fetchFriends();
  }, [fetchFriends]);

  return {
    friends,
    pendingReceived,
    pendingSent,
    isLoading,
    error,
    refresh,
    sendRequest,
    acceptRequest,
    rejectRequest,
    unfriend,
  };
}
