import { useState, useCallback } from 'react';
import { fetchWithAuth } from '@/lib/api/fetchWithAuth';
import { toast } from 'react-hot-toast';
import type { SlotMachineStatus, SpinResult, ClaimRewardInput } from '@/types/slot-machine';
import { RewardType } from '@/types/slot-machine';

export function useSlotMachine() {
  const [status, setStatus] = useState<SlotMachineStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [lastResult, setLastResult] = useState<SpinResult | null>(null);
  const [pendingReward, setPendingReward] = useState<{
    rewardType: RewardType;
    rewardAmount: number;
  } | null>(null);
  const [sessionSpent, setSessionSpent] = useState(0);

  const refreshStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetchWithAuth('/api/slot-machine/status');
      if (response.ok) {
        const data = await response.json();
        const statusData = data.data || data;
        setStatus(statusData);
        // Réinitialiser les jetons dépensés en session si on recharge le statut (nouvelle session)
        setSessionSpent(0);
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || errorData.message || 'Erreur inconnue';
        console.error('Erreur lors du chargement du statut:', errorMessage, errorData);
        // Ne pas afficher de toast pour les erreurs silencieuses
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      console.error('Erreur lors du chargement du statut:', errorMessage, error);
      // Ne pas afficher de toast pour les erreurs silencieuses
    } finally {
      setIsLoading(false);
    }
  }, []);

  const spin = useCallback(async (): Promise<SpinResult | null> => {
    const COST_PER_SPIN = 3;
    if (isSpinning || !status || status.tokens < COST_PER_SPIN) {
      return null;
    }

    try {
      setIsSpinning(true);
      // Réinitialiser le résultat précédent pour relancer l'animation
      setLastResult(null);
      const response = await fetchWithAuth('/api/slot-machine/spin', {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        const result: SpinResult = data.data || data;

        // Attendre que l'animation de spin se termine avant de mettre à jour le résultat
        setTimeout(() => {
          setLastResult(result);
          setIsSpinning(false);
        }, 2000); // Durée de l'animation de spin

        // Incrémenter les jetons dépensés dans la session
        setSessionSpent((prev) => prev + COST_PER_SPIN);

        // Optimistic update : décrémenter les jetons (3 par spin)
        if (status) {
          setStatus({
            ...status,
            tokens: status.tokens - COST_PER_SPIN,
            totalSpins: status.totalSpins + 1,
            totalWins: result.isWin ? status.totalWins + 1 : status.totalWins,
          });
        }

        // Si la récompense est des jetons, les ajouter directement
        if (result.rewardType === 'TOKENS') {
          if (status) {
            setStatus((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                tokens: prev.tokens + result.rewardAmount,
              };
            });
          }
          toast.success(result.message);
        } else if (result.rewardType) {
          // Pour les autres récompenses, les marquer comme en attente
          setPendingReward({
            rewardType: result.rewardType,
            rewardAmount: result.rewardAmount,
          });
          toast.success(result.message, {
            duration: 5000,
          });
        }

        return result;
      } else {
        setIsSpinning(false);
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || 'Erreur lors du spin';
        toast.error(errorMessage);
        return null;
      }
    } catch (error) {
      setIsSpinning(false);
      console.error('Erreur lors du spin:', error);
      toast.error('Erreur lors du spin');
      return null;
    }
  }, [isSpinning, status]);

  const claimReward = useCallback(async (): Promise<boolean> => {
    if (!pendingReward) {
      return false;
    }

    try {
      setIsLoading(true);
      const input: ClaimRewardInput = {
        rewardType: pendingReward.rewardType,
        rewardAmount: pendingReward.rewardAmount,
      };

      const response = await fetchWithAuth('/api/slot-machine/claim-reward', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
      });

      if (response.ok) {
        const data = await response.json();
        const message = data.data?.message || data.message || 'Récompense réclamée !';
        toast.success(message);
        setPendingReward(null);
        // Rafraîchir le statut
        await refreshStatus();
        return true;
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || 'Erreur lors de la réclamation';
        toast.error(errorMessage);
        return false;
      }
    } catch (error) {
      console.error('Erreur lors de la réclamation:', error);
      toast.error('Erreur lors de la réclamation');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [pendingReward, refreshStatus]);

  const spinMultiple = useCallback(
    async (count: number): Promise<void> => {
      const COST_PER_SPIN = 3;
      const totalCost = count * COST_PER_SPIN;
      if (isSpinning || !status || status.tokens < totalCost) {
        return;
      }

      try {
        setIsSpinning(true);
        setLastResult(null);

        const response = await fetchWithAuth('/api/slot-machine/spin-batch', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ count }),
        });

        if (response.ok) {
          const data = await response.json();
          const result = data.data || data;

          // Mettre à jour les jetons dépensés dans la session
          setSessionSpent((prev) => prev + totalCost);

          // Attendre que l'animation de spin se termine avant de mettre à jour le résultat
          setTimeout(() => {
            setLastResult({
              symbols: result.symbols,
              rewardType: result.rewardType,
              rewardAmount: result.rewardAmount,
              isWin: result.isWin,
              message: result.message,
            });
            setIsSpinning(false);
          }, 2000);

          // Mettre à jour le statut avec le résumé (3 jetons par spin)
          if (status) {
            setStatus({
              ...status,
              tokens: status.tokens - totalCost + result.summary.totalTokensWon,
              totalSpins: status.totalSpins + count,
              totalWins: status.totalWins + result.summary.totalWins,
            });
          }

          // Gérer les récompenses non-jetons
          if (result.summary.queueSkips > 0 || result.summary.eternalTickets > 0) {
            // Si on a gagné des queue skips ou tickets éternels, les ajouter à pendingReward
            // On priorise les queue skips s'il y en a, sinon les tickets éternels
            if (result.summary.queueSkips > 0) {
              setPendingReward({
                rewardType: RewardType.QUEUE_SKIP,
                rewardAmount: result.summary.queueSkips,
              });
            } else if (result.summary.eternalTickets > 0) {
              setPendingReward({
                rewardType: RewardType.ETERNAL_TICKET,
                rewardAmount: result.summary.eternalTickets,
              });
            }
          }

          // Afficher le message de résultat avec formatage multi-lignes
          const messageLines = result.message.split('\n');
          messageLines.forEach((line: string, index: number) => {
            if (index === 0) {
              toast.success(line, { duration: 6000 });
            } else {
              setTimeout(() => {
                const isReward = line.includes('🎁') || line.includes('🎫') || line.includes('💰');
                toast(line, {
                  duration: 5000,
                  icon: isReward ? '🎉' : '😔',
                  style: isReward ? {} : { background: '#ef4444' },
                });
              }, index * 600);
            }
          });

          // Rafraîchir le statut final
          await refreshStatus();
        } else {
          setIsSpinning(false);
          const errorData = await response.json().catch(() => ({}));
          const errorMessage = errorData.error || 'Erreur lors des spins multiples';
          toast.error(errorMessage);
        }
      } catch (error) {
        setIsSpinning(false);
        console.error('Erreur lors des spins multiples:', error);
        toast.error('Erreur lors des spins multiples');
      }
    },
    [isSpinning, status, refreshStatus]
  );

  return {
    status,
    isLoading,
    isSpinning,
    lastResult,
    pendingReward,
    sessionSpent,
    refreshStatus,
    spin,
    spinMultiple,
    claimReward,
  };
}
