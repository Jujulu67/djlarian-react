import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { fetchWithAuth } from '@/lib/api/fetchWithAuth';
import type { LiveSubmission, CreateSubmissionInput } from '@/types/live';

export function useLiveSubmissions() {
  const { data: session } = useSession();
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

        // Si on a un draftId, on convertit juste le draft (pas besoin de re-uploader)
        if (input.draftId) {
          const formData = new FormData();
          formData.append('draftId', input.draftId);
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
            await loadSubmissions();
            return { success: true, data: data.data };
          } else {
            const errorData = await response.json();
            setError(errorData.error || 'Erreur lors de la soumission');
            return { success: false, error: errorData.error };
          }
        }

        // Sinon, uploader directement vers Blob puis créer la soumission
        if (!input.file) {
          setError('Fichier requis');
          return { success: false, error: 'Fichier requis' };
        }

        if (!session?.user?.id) {
          setError('Vous devez être connecté');
          return { success: false, error: 'Vous devez être connecté' };
        }

        // Importer les fonctions d'upload client
        const { generateAudioFileId, uploadAudioFileToBlob } =
          await import('@/lib/live/upload-client');

        // Générer un ID unique pour le fichier
        const fileId = generateAudioFileId(session.user.id, input.file.name);

        // Upload directement vers Blob
        const { url: fileUrl, size } = await uploadAudioFileToBlob(input.file, fileId);

        // Créer la soumission avec l'URL du fichier
        const response = await fetchWithAuth('/api/live/submissions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fileUrl,
            fileName: input.file.name,
            fileSize: size,
            title: input.title,
            description: input.description,
          }),
        });

        if (response.ok) {
          const data = await response.json();
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
    [loadSubmissions, session?.user?.id]
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
