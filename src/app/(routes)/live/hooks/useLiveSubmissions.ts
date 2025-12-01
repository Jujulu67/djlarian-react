import { useState, useCallback } from 'react';
import { fetchWithAuth } from '@/lib/api/fetchWithAuth';
import type { LiveSubmission, CreateSubmissionInput } from '@/types/live';

export function useLiveSubmissions() {
  const [submissions, setSubmissions] = useState<LiveSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSubmissions = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetchWithAuth('/api/live/submissions');
      if (response.ok) {
        const data = await response.json();
        setSubmissions(data.data);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Erreur lors du chargement des soumissions');
      }
    } catch (err) {
      setError('Erreur de connexion');
      console.error('[Live] Erreur chargement soumissions:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const submitFile = useCallback(
    async (input: CreateSubmissionInput) => {
      try {
        setIsSubmitting(true);
        setError(null);

        const formData = new FormData();
        formData.append('file', input.file);
        formData.append('title', input.title);
        if (input.description) {
          formData.append('description', input.description);
        }

        const response = await fetchWithAuth('/api/live/submissions', {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          const data = await response.json();
          // Recharger les soumissions
          await loadSubmissions();
          return { success: true, data: data.data };
        } else {
          const errorData = await response.json();
          setError(errorData.error || 'Erreur lors de la soumission');
          return { success: false, error: errorData.error };
        }
      } catch (err) {
        setError('Erreur de connexion');
        console.error('[Live] Erreur soumission:', err);
        return { success: false, error: 'Erreur de connexion' };
      } finally {
        setIsSubmitting(false);
      }
    },
    [loadSubmissions]
  );

  return {
    submissions,
    isLoading,
    isSubmitting,
    error,
    loadSubmissions,
    submitFile,
  };
}
