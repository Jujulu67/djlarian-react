import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import type { SubmissionWithUser } from './useAdminLiveSubmissions';
import { calculateTicketWeight, calculateMultiplier } from '@/lib/live/calculations';
import type { UserTicket, UserLiveItem } from '@/types/live';
import { TicketSource, LiveItemType } from '@/types/live';

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

  // Fonction helper pour extraire l'ID de Queue Skip depuis les soumissions
  const extractQueueSkipIdFromSubmissions = useCallback(
    (subs: SubmissionWithUser[]): string | null => {
      for (const submission of subs) {
        const userItems = submission.User?.UserLiveItem || [];
        for (const item of userItems) {
          if (item.LiveItem) {
            const itemName = item.LiveItem.name?.toLowerCase() || '';
            const itemType = String(item.LiveItem.type).toLowerCase();

            // Vérifier si c'est Queue Skip par nom ou type
            if (
              itemName.includes('queue skip') ||
              itemName.includes('skip queue') ||
              itemType === 'queue_skip' ||
              itemType === 'skip_queue'
            ) {
              return item.LiveItem.id;
            }
          }
        }
      }
      return null;
    },
    []
  );

  // Extraire l'ID de Queue Skip depuis les soumissions (pas besoin d'API)
  useEffect(() => {
    if (submissions.length > 0) {
      const queueSkipIdFromSubmissions = extractQueueSkipIdFromSubmissions(submissions);
      if (queueSkipIdFromSubmissions) {
        setQueueSkipItemId(queueSkipIdFromSubmissions);
      }
    }
  }, [submissions, extractQueueSkipIdFromSubmissions]);

  // État pour la modale de roue
  const [isWheelModalOpen, setIsWheelModalOpen] = useState(false);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);
  const [selectedSubmissions, setSelectedSubmissions] = useState<SubmissionWithUser[]>([]);
  const [selectedWeights, setSelectedWeights] = useState<number[]>([]);
  const [selectedQueueSkipFlags, setSelectedQueueSkipFlags] = useState<boolean[]>([]);
  const [queueSkipItemId, setQueueSkipItemId] = useState<string | null>(null);

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

      // Trier par date de création pour trouver la première (début de séance)
      const sortedSubmissions = [...nonRolledSubmissions].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      const sessionStartTime = sortedSubmissions[0]?.createdAt || new Date();

      // Récupérer l'offset de temps simulé
      let timeOffsetMinutes = 0;
      try {
        const offsetResponse = await fetch('/api/admin/live/time-offset');
        if (offsetResponse.ok) {
          const offsetData = await offsetResponse.json();
          timeOffsetMinutes = offsetData.data?.timeOffsetMinutes || 0;
        }
      } catch (error) {
        console.error('Erreur lors de la récupération du time offset:', error);
      }

      // Extraire l'ID de Queue Skip directement depuis les soumissions
      let finalQueueSkipItemId = queueSkipItemId;

      // Si pas encore chargé, extraire depuis les soumissions actuelles
      if (!finalQueueSkipItemId && nonRolledSubmissions.length > 0) {
        finalQueueSkipItemId = extractQueueSkipIdFromSubmissions(nonRolledSubmissions);
        if (finalQueueSkipItemId) {
          setQueueSkipItemId(finalQueueSkipItemId);
        }
      }

      // Détecter les soumissions avec Queue Skip activé en utilisant l'ID
      // Note: L'API filtre déjà pour ne retourner que les items activés (where: { isActivated: true })
      const submissionsWithQueueSkip = nonRolledSubmissions.filter((submission) => {
        const userItems = submission.User?.UserLiveItem || [];

        const hasQueueSkip = userItems.some((item) => {
          if (!item.LiveItem) return false;

          // Comparer avec l'ID si disponible, sinon avec le type
          if (finalQueueSkipItemId) {
            return (
              item.LiveItem.id === finalQueueSkipItemId || item.itemId === finalQueueSkipItemId
            );
          }

          // Fallback: comparer le type
          const itemType = String(item.LiveItem.type);
          const queueSkipType = String(LiveItemType.QUEUE_SKIP);
          return itemType === queueSkipType;
        });

        return hasQueueSkip;
      });

      // Pour l'affichage : garder toutes les soumissions (pour l'aspect visuel)
      // Pour le tirage : utiliser uniquement ceux avec Queue Skip s'il y en a
      const eligibleSubmissions =
        submissionsWithQueueSkip.length > 0 ? submissionsWithQueueSkip : nonRolledSubmissions;

      // Calculer les poids pour chaque soumission en utilisant calculateTicketWeight avec multiplier
      const weightedSubmissions = nonRolledSubmissions.map((submission) => {
        // Récupérer les tickets actifs de l'utilisateur
        const activeTickets: UserTicket[] = (submission.User?.UserTicket || []).map((ticket) => ({
          id: ticket.id,
          userId: submission.User.id,
          quantity: ticket.quantity,
          source: ticket.source as TicketSource,
          expiresAt: ticket.expiresAt,
          createdAt: ticket.createdAt,
        }));

        // Récupérer les items activés de l'utilisateur
        // Note: L'API filtre déjà pour ne retourner que les items activés (activatedQuantity > 0)
        const activatedItems: UserLiveItem[] = (submission.User?.UserLiveItem || [])
          .filter((item) => item.LiveItem && (item.activatedQuantity || 0) > 0) // Filtrer les items activés
          .map((item) => ({
            id: item.id,
            userId: submission.User.id,
            itemId: item.LiveItem?.id || '',
            quantity: item.quantity,
            activatedQuantity: item.activatedQuantity || 0,
            isActivated: (item.activatedQuantity || 0) > 0,
            activatedAt: item.activatedAt,
            metadata: item.metadata,
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
            LiveItem: item.LiveItem
              ? {
                  id: item.LiveItem.id,
                  type: item.LiveItem.type as LiveItemType,
                  name: item.LiveItem.name,
                  description: null,
                  icon: null,
                  isActive: true,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                }
              : undefined,
          }));

        // Vérifier si cette soumission a Queue Skip en utilisant l'ID
        const hasQueueSkip = (submission.User?.UserLiveItem || []).some((item) => {
          if (!item.LiveItem) return false;

          // Comparer avec l'ID si disponible, sinon avec le type
          if (finalQueueSkipItemId) {
            return (
              item.LiveItem.id === finalQueueSkipItemId || item.itemId === finalQueueSkipItemId
            );
          }

          // Fallback: comparer le type
          const itemType = String(item.LiveItem.type);
          const queueSkipType = String(LiveItemType.QUEUE_SKIP);
          return itemType === queueSkipType;
        });

        // Calculer le multiplier basé sur le temps depuis la soumission
        const submissionCreatedAt = new Date(submission.createdAt);
        const multiplier = calculateMultiplier(
          submissionCreatedAt,
          sessionStartTime,
          timeOffsetMinutes
        );

        // Calculer le poids de base
        const baseWeight = calculateTicketWeight(activeTickets, activatedItems);

        // Appliquer le multiplier au poids
        const weight = baseWeight * multiplier;

        return { submission, weight, hasQueueSkip };
      });

      // Filtrer les weightedSubmissions pour ne garder que les éligibles pour le tirage
      const eligibleWeightedSubmissions = weightedSubmissions.filter((item) =>
        eligibleSubmissions.some((sub) => sub.id === item.submission.id)
      );

      // Calculer le poids total uniquement pour les éligibles
      const totalWeight = eligibleWeightedSubmissions.reduce((acc, item) => acc + item.weight, 0);

      if (totalWeight === 0) {
        toast.error('Aucun poids disponible pour le tirage');
        return;
      }

      // Sélection aléatoire pondérée parmi les éligibles
      let randomValue = Math.random() * totalWeight;
      let selectedSubmission = eligibleSubmissions[0];

      for (const item of eligibleWeightedSubmissions) {
        randomValue -= item.weight;
        if (randomValue <= 0) {
          selectedSubmission = item.submission;
          break;
        }
      }

      // Ouvrir la modale avec la soumission sélectionnée
      setSelectedSubmissionId(selectedSubmission.id);
      // Stocker toutes les soumissions pour l'affichage (aspect visuel)
      setSelectedSubmissions(nonRolledSubmissions);
      // Stocker les poids pour toutes les soumissions (pour l'affichage)
      setSelectedWeights(weightedSubmissions.map((w) => w.weight));
      // Stocker les informations Queue Skip pour chaque soumission
      // IMPORTANT: L'ordre doit correspondre à nonRolledSubmissions
      const queueSkipFlags = nonRolledSubmissions.map((submission) => {
        const weighted = weightedSubmissions.find((w) => w.submission.id === submission.id);
        return weighted?.hasQueueSkip || false;
      });

      setSelectedQueueSkipFlags(queueSkipFlags);
      setIsWheelModalOpen(true);
    } catch (error) {
      toast.error('Erreur lors du roll random');
      console.error(error);
    }
  }, [submissions, queueSkipItemId, extractQueueSkipIdFromSubmissions]);

  const handleWheelSelectionComplete = useCallback(
    async (submissionId: string) => {
      try {
        // Trouver la soumission sélectionnée pour vérifier si elle a Queue Skip
        const selectedSubmission = submissions.find((s) => s.id === submissionId);
        // Note: L'API filtre déjà pour ne retourner que les items activés
        // Utiliser l'ID de Queue Skip depuis le state
        const currentQueueSkipId = queueSkipItemId;
        const hasQueueSkip = selectedSubmission?.User?.UserLiveItem?.some((item) => {
          if (!item.LiveItem) return false;

          // Comparer avec l'ID si disponible, sinon avec le type
          if (currentQueueSkipId) {
            return item.LiveItem.id === currentQueueSkipId || item.itemId === currentQueueSkipId;
          }

          // Fallback: comparer le type
          return String(item.LiveItem.type) === String(LiveItemType.QUEUE_SKIP);
        });

        // Pinner la soumission sélectionnée et la marquer comme rolled
        // L'API dépinnera automatiquement les autres
        if (updateSubmissionPinned && updateSubmissionRolled) {
          const [pinSuccess, rolledSuccess] = await Promise.all([
            updateSubmissionPinned(submissionId, true),
            updateSubmissionRolled(submissionId, true),
          ]);

          if (pinSuccess && rolledSuccess) {
            // Si le gagnant a Queue Skip, le consommer
            if (hasQueueSkip && selectedSubmission?.User?.id && currentQueueSkipId) {
              try {
                // Trouver le UserLiveItem à supprimer
                const queueSkipUserItem = selectedSubmission.User.UserLiveItem?.find(
                  (item) =>
                    item.LiveItem?.id === currentQueueSkipId || item.itemId === currentQueueSkipId
                );

                if (queueSkipUserItem) {
                  const consumeResponse = await fetch('/api/admin/live/consume-queue-skip', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      userId: selectedSubmission.User.id,
                      itemId: currentQueueSkipId,
                    }),
                  });

                  if (consumeResponse.ok) {
                    toast.success('Soumission sélectionnée et pinée ! Queue Skip consommé.');
                  } else {
                    // Essayer de parser l'erreur
                    let errorMessage = 'Erreur inconnue';
                    try {
                      const errorData = await consumeResponse.json();
                      errorMessage =
                        errorData.error || errorData.message || JSON.stringify(errorData);
                    } catch (parseError) {
                      errorMessage = `Erreur ${consumeResponse.status}: ${consumeResponse.statusText}`;
                    }
                    console.error('Erreur lors de la consommation du Queue Skip:', {
                      status: consumeResponse.status,
                      statusText: consumeResponse.statusText,
                      error: errorMessage,
                    });
                    toast.success(
                      'Soumission sélectionnée et pinée ! (Erreur consommation Queue Skip)'
                    );
                  }
                } else {
                  toast.success('Soumission sélectionnée et pinée !');
                }
              } catch (error) {
                console.error('Erreur lors de la consommation du Queue Skip:', {
                  error: error instanceof Error ? error.message : String(error),
                  stack: error instanceof Error ? error.stack : undefined,
                });
                toast.success(
                  'Soumission sélectionnée et pinée ! (Erreur consommation Queue Skip)'
                );
              }
            } else {
              toast.success('Soumission sélectionnée et pinée !');
            }

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
    [updateSubmissionRolled, updateSubmissionPinned, fetchSubmissions, submissions]
  );

  const handleCloseWheelModal = useCallback(async () => {
    setIsWheelModalOpen(false);
    setSelectedSubmissionId(null);
    setSelectedSubmissions([]);
    setSelectedWeights([]);
    setSelectedQueueSkipFlags([]);
    // Recharger la liste des soumissions pour voir le nouveau pin et l'état rolled
    // Attendre un peu pour s'assurer que les opérations API sont terminées
    if (fetchSubmissions) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      await fetchSubmissions();
    }
  }, [fetchSubmissions]);

  const advanceTime = useCallback(
    async (minutes: number) => {
      try {
        const response = await fetch('/api/admin/live/time-offset', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ increment: minutes }),
        });

        if (response.ok) {
          const data = await response.json();
          toast.success(
            `Temps avancé de ${minutes} minutes (Total: ${data.data.timeOffsetMinutes} min)`
          );
          // Rafraîchir les soumissions pour voir les nouveaux multipliers
          if (fetchSubmissions) {
            await fetchSubmissions();
          }
        } else {
          const error = await response.json();
          toast.error(error.error || "Erreur lors de l'avancement du temps");
        }
      } catch (error) {
        toast.error("Erreur lors de l'avancement du temps");
        console.error(error);
      }
    },
    [fetchSubmissions]
  );

  const resetTimeOffset = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/live/time-offset', {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Offset de temps réinitialisé');
        // Rafraîchir les soumissions pour voir les nouveaux multipliers
        if (fetchSubmissions) {
          await fetchSubmissions();
        }
      } else {
        const error = await response.json();
        toast.error(error.error || 'Erreur lors de la réinitialisation');
      }
    } catch (error) {
      toast.error('Erreur lors de la réinitialisation');
      console.error(error);
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
    selectedSubmissions,
    selectedWeights,
    selectedQueueSkipFlags,
    handleWheelSelectionComplete,
    handleCloseWheelModal,
    purgeAllSubmissions,
    // Inventory Manager
    isInventoryManagerOpen,
    setIsInventoryManagerOpen,
    // Time offset functions
    advanceTime,
    resetTimeOffset,
  };
}
