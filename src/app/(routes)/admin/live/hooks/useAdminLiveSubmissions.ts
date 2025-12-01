import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { fetchWithAuth } from '@/lib/api/fetchWithAuth';
import { LiveSubmissionStatus } from '@/types/live';

export type SubmissionWithUser = {
  id: string;
  userId: string;
  fileName: string;
  fileUrl: string;
  title: string;
  description: string | null;
  status: LiveSubmissionStatus;
  createdAt: Date;
  updatedAt: Date;
  isRolled: boolean;
  isPinned: boolean;
  User: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
    UserLiveItem: {
      id: string;
      quantity: number;
      LiveItem: {
        id: string;
        type: string;
        name: string;
      };
    }[];
  };
};

export function useAdminLiveSubmissions() {
  const [submissions, setSubmissions] = useState<SubmissionWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubmissions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetchWithAuth('/api/admin/live/submissions');
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Erreur API:', response.status, errorText);
        throw new Error(`Erreur ${response.status}: ${errorText}`);
      }
      const result = await response.json();
      // S'assurer que toutes les soumissions ont isPinned défini
      const submissionsWithDefaults = (result.data || []).map((submission: any) => ({
        ...submission,
        isRolled: submission.isRolled ?? false,
        isPinned: submission.isPinned ?? false,
      }));
      setSubmissions(submissionsWithDefaults);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Erreur lors du chargement des soumissions';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error('Erreur fetchSubmissions:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateSubmissionStatus = useCallback(
    async (id: string, status: LiveSubmissionStatus) => {
      try {
        const response = await fetchWithAuth(`/api/admin/live/submissions/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        });
        if (response.ok) {
          toast.success(
            `Soumission ${status === LiveSubmissionStatus.APPROVED ? 'approuvée' : 'rejetée'}`
          );
          await fetchSubmissions();
          return true;
        } else {
          toast.error('Erreur lors de la mise à jour');
          return false;
        }
      } catch (err) {
        toast.error('Erreur lors de la mise à jour');
        console.error(err);
        return false;
      }
    },
    [fetchSubmissions]
  );

  const updateSubmissionRolled = useCallback(async (id: string, isRolled: boolean) => {
    try {
      // Mettre à jour l'état local immédiatement pour que ça soit visible dans la roue sans refresh
      setSubmissions((prev) => prev.map((s) => (s.id === id ? { ...s, isRolled } : s)));

      const response = await fetchWithAuth(`/api/admin/live/submissions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isRolled }),
      });
      if (response.ok) {
        return true;
      } else {
        // En cas d'erreur, restaurer l'état précédent
        setSubmissions((prev) =>
          prev.map((s) => (s.id === id ? { ...s, isRolled: !isRolled } : s))
        );
        toast.error('Erreur lors de la mise à jour du statut rolled');
        return false;
      }
    } catch (err) {
      // En cas d'erreur, restaurer l'état précédent
      setSubmissions((prev) => prev.map((s) => (s.id === id ? { ...s, isRolled: !isRolled } : s)));
      toast.error('Erreur lors de la mise à jour du statut rolled');
      console.error(err);
      return false;
    }
  }, []);

  const updateSubmissionPinned = useCallback(
    async (id: string, isPinned: boolean) => {
      try {
        const response = await fetchWithAuth(`/api/admin/live/submissions/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isPinned }),
        });
        if (response.ok) {
          const result = await response.json();
          // Rafraîchir la liste pour avoir le bon ordre
          await fetchSubmissions();
          return true;
        } else {
          toast.error('Erreur lors de la mise à jour du pin');
          return false;
        }
      } catch (err) {
        toast.error('Erreur lors de la mise à jour du pin');
        console.error(err);
        return false;
      }
    },
    [fetchSubmissions]
  );

  useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

  return {
    submissions,
    loading,
    error,
    fetchSubmissions,
    updateSubmissionStatus,
    updateSubmissionRolled,
    updateSubmissionPinned,
  };
}
