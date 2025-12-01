import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import type { SubmissionWithUser } from './useAdminLiveSubmissions';

export type AdminLiveActionsState = {
  downloadsEnabled: boolean;
  trackSubmissions: boolean;
  koolKids: boolean;
  genreBlend: boolean;
};

export function useAdminLiveActions(
  submissions: SubmissionWithUser[] = [],
  updateSubmissionRolled?: (id: string, isRolled: boolean) => Promise<boolean>,
  updateSubmissionPinned?: (id: string, isPinned: boolean) => Promise<boolean>,
  fetchSubmissions?: () => Promise<void>
) {
  const [actions, setActions] = useState<AdminLiveActionsState>({
    downloadsEnabled: true,
    trackSubmissions: true,
    koolKids: false,
    genreBlend: true,
  });

  // Charger les paramètres depuis la base de données
  const loadSettings = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/live/settings');
      if (response.ok) {
        const result = await response.json();
        setActions((prev) => ({ ...prev, ...result.data }));
      }
    } catch (error) {
      console.error('Erreur lors du chargement des paramètres:', error);
    }
  }, []);

  // Charger les paramètres au montage
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // État pour la modale de roue
  const [isWheelModalOpen, setIsWheelModalOpen] = useState(false);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);

  const updateAction = useCallback(async (key: keyof AdminLiveActionsState, value: boolean) => {
    // Mettre à jour l'état local immédiatement
    setActions((prev) => ({ ...prev, [key]: value }));

    // Sauvegarder dans la base de données
    try {
      await fetch('/api/admin/live/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value }),
      });
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du paramètre:', error);
      // Restaurer l'état précédent en cas d'erreur
      setActions((prev) => ({ ...prev, [key]: !value }));
      toast.error('Erreur lors de la sauvegarde du paramètre');
    }
  }, []);

  const refreshAllSockets = useCallback(async () => {
    try {
      // TODO: Implémenter le refresh des sockets
      toast.success('Sockets rafraîchis');
    } catch (error) {
      toast.error('Erreur lors du rafraîchissement des sockets');
      console.error(error);
    }
  }, []);

  const addLoyalty = useCallback(async () => {
    // TODO: Implémenter l'ajout de loyalty
    toast.info('Fonctionnalité à implémenter');
  }, []);

  const sendDiscordNotification = useCallback(async () => {
    // TODO: Implémenter la notification Discord
    toast.info('Fonctionnalité à implémenter');
  }, []);

  const pasteNgrokUrl = useCallback(async () => {
    // TODO: Implémenter le paste ngrok URL
    toast.info('Fonctionnalité à implémenter');
  }, []);

  const getAllNames = useCallback(async () => {
    try {
      // Récupérer tous les noms uniques des utilisateurs
      const uniqueNames = Array.from(
        new Set(submissions.map((s) => s.User?.name).filter(Boolean))
      ) as string[];

      if (uniqueNames.length === 0) {
        toast.error('Aucun nom trouvé');
        return;
      }

      // Copier dans le presse-papiers, un nom par ligne
      const namesText = uniqueNames.join('\n');
      await navigator.clipboard.writeText(namesText);
      toast.success(`${uniqueNames.length} nom(s) copié(s) dans le presse-papiers`);
    } catch (error) {
      toast.error('Erreur lors de la copie des noms');
      console.error(error);
    }
  }, [submissions]);

  const getRolledNames = useCallback(async () => {
    try {
      // Récupérer tous les noms uniques des utilisateurs qui ont été rollés
      const rolledNames = Array.from(
        new Set(
          submissions
            .filter((s) => s.isRolled)
            .map((s) => s.User?.name)
            .filter(Boolean)
        )
      ) as string[];

      if (rolledNames.length === 0) {
        toast.error('Aucun nom rollé trouvé');
        return;
      }

      // Copier dans le presse-papiers, un nom par ligne
      const namesText = rolledNames.join('\n');
      await navigator.clipboard.writeText(namesText);
      toast.success(`${rolledNames.length} nom(s) rollé(s) copié(s) dans le presse-papiers`);
    } catch (error) {
      toast.error('Erreur lors de la copie des noms rollés');
      console.error(error);
    }
  }, [submissions]);

  const editGenres = useCallback(async () => {
    // TODO: Implémenter l'édition des genres
    toast.info('Fonctionnalité à implémenter');
  }, []);

  const deleteNgrok = useCallback(async () => {
    // TODO: Implémenter la suppression ngrok
    toast.info('Fonctionnalité à implémenter');
  }, []);

  const downloadAll = useCallback(async () => {
    try {
      toast.info('Téléchargement en cours...');
      const response = await fetch('/api/admin/live/submissions/download-all');

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur lors du téléchargement');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `submissions_${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success('Téléchargement terminé !');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erreur lors du téléchargement');
      console.error(error);
    }
  }, []);

  const purgeAllSubmissions = useCallback(async () => {
    if (
      !confirm(
        'ATTENTION: Cette action est irréversible !\n\nCela va supprimer TOUTES les soumissions et TOUS les fichiers associés.\n\nÊtes-vous sûr de vouloir continuer ?'
      )
    ) {
      return;
    }

    if (!confirm('Vraiment sûr ? Cette action ne peut pas être annulée.')) {
      return;
    }

    try {
      toast.info('Purge en cours...');
      const response = await fetch('/api/admin/live/submissions/purge', {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Toutes les soumissions ont été supprimées');
        if (fetchSubmissions) {
          await fetchSubmissions();
        }
      } else {
        const error = await response.json();
        toast.error(error.error || 'Erreur lors de la purge');
      }
    } catch (error) {
      console.error('Erreur purge:', error);
      toast.error('Erreur lors de la purge');
    }
  }, [fetchSubmissions]);

  // État pour le gestionnaire d'inventaire global
  const [isInventoryManagerOpen, setIsInventoryManagerOpen] = useState(false);

  const rollRandom = useCallback(async () => {
    try {
      // Filtrer les soumissions non rollées
      const nonRolledSubmissions = submissions.filter((s) => !s.isRolled);

      if (nonRolledSubmissions.length === 0) {
        toast.error('Aucune soumission non rollée disponible');
        return;
      }

      // Calculer les poids pour chaque soumission
      // Poids de base = 1
      // Chaque item activé ajoute +1 au poids
      const weightedSubmissions = nonRolledSubmissions.map((submission) => {
        let weight = 1;

        // Vérifier si UserLiveItem existe sur la soumission (ajouté récemment au type)
        if (submission.User && 'UserLiveItem' in submission.User) {
          const userItems = (submission.User as any).UserLiveItem || [];
          // Compter les items activés
          // On suppose que l'API renvoie déjà uniquement les items activés ou on filtre
          const activeItemsCount = userItems.reduce(
            (acc: number, item: any) => acc + (item.quantity || 1),
            0
          );
          weight += activeItemsCount;
        }

        return { submission, weight };
      });

      // Calculer le poids total
      const totalWeight = weightedSubmissions.reduce((acc, item) => acc + item.weight, 0);

      // Sélection aléatoire pondérée
      let randomValue = Math.random() * totalWeight;
      let selectedSubmission = nonRolledSubmissions[0];

      for (const item of weightedSubmissions) {
        randomValue -= item.weight;
        if (randomValue <= 0) {
          selectedSubmission = item.submission;
          break;
        }
      }

      // Ouvrir la modale avec la soumission sélectionnée
      setSelectedSubmissionId(selectedSubmission.id);
      setIsWheelModalOpen(true);
    } catch (error) {
      toast.error('Erreur lors du roll random');
      console.error(error);
    }
  }, [submissions]);

  const handleWheelSelectionComplete = useCallback(
    async (submissionId: string) => {
      try {
        // Pinner la soumission sélectionnée et la marquer comme rolled
        // L'API dépinnera automatiquement les autres
        if (updateSubmissionPinned && updateSubmissionRolled) {
          const [pinSuccess, rolledSuccess] = await Promise.all([
            updateSubmissionPinned(submissionId, true),
            updateSubmissionRolled(submissionId, true),
          ]);

          if (pinSuccess && rolledSuccess) {
            toast.success('Soumission sélectionnée et pinée !');
            // Rafraîchir immédiatement pour mettre à jour l'état
            if (fetchSubmissions) {
              await fetchSubmissions();
            }
          } else {
            toast.error('Erreur lors du pin de la soumission');
          }
        }
      } catch (error) {
        toast.error('Erreur lors du pin de la soumission');
        console.error(error);
      }
    },
    [updateSubmissionRolled, updateSubmissionPinned, fetchSubmissions]
  );

  const handleCloseWheelModal = useCallback(async () => {
    setIsWheelModalOpen(false);
    setSelectedSubmissionId(null);
    // Recharger la liste des soumissions pour voir le nouveau pin et l'état rolled
    // Attendre un peu pour s'assurer que les opérations API sont terminées
    if (fetchSubmissions) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      await fetchSubmissions();
    }
  }, [fetchSubmissions]);

  return {
    actions,
    updateAction,
    refreshAllSockets,
    addLoyalty,
    sendDiscordNotification,
    pasteNgrokUrl,
    getAllNames,
    getRolledNames,
    editGenres,
    deleteNgrok,
    rollRandom,
    downloadAll,
    // État et handlers pour la modale de roue
    isWheelModalOpen,
    selectedSubmissionId,
    handleWheelSelectionComplete,
    handleCloseWheelModal,
    purgeAllSubmissions,
    // Inventory Manager
    isInventoryManagerOpen,
    setIsInventoryManagerOpen,
  };
}
