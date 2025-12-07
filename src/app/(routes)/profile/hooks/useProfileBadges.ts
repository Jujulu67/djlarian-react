import { useMemo, useEffect, useState } from 'react';
import { calculateBadges, type Badge, type GameStats } from '../utils/badgeCalculations';
import { getMemberMonths } from '../utils/dateUtils';
import type { UserStats } from './useProfileStats';
import { useSession } from 'next-auth/react';

interface User {
  role?: string;
  isVip?: boolean;
  createdAt?: string | Date | null;
}

export function useProfileBadges(stats: UserStats, user: User) {
  const { status } = useSession();
  const isAuthenticated = status === 'authenticated';
  const [gameStats, setGameStats] = useState<GameStats | null>(null);

  // Fetch game stats from API
  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchGameStats = async () => {
      try {
        const response = await fetch('/api/user/game-stats');
        if (response.ok) {
          const { data } = await response.json();
          setGameStats(data);
        }
      } catch (error) {
        console.error('Error fetching game stats:', error);
      }
    };

    fetchGameStats();
  }, [isAuthenticated]);

  const memberMonths = useMemo(() => {
    return getMemberMonths(user.createdAt);
  }, [user.createdAt]);

  const isAdmin = user.role === 'ADMIN';

  // Calculer tous les badges
  const allBadges = useMemo(() => {
    return calculateBadges(memberMonths, stats, user, gameStats ?? undefined);
  }, [memberMonths, stats, user, gameStats]);

  // Séparer badges normaux et secrets
  const { regularBadges, secretBadges } = useMemo(() => {
    const filtered = isAdmin ? allBadges : allBadges.filter((b) => b.id !== 'admin');
    return {
      regularBadges: filtered.filter((b) => !b.isSecret),
      secretBadges: filtered.filter((b) => b.isSecret),
    };
  }, [allBadges, isAdmin]);

  // Badges normaux débloqués/verrouillés
  const unlockedRegularBadges = useMemo(() => {
    return regularBadges.filter((b) => b.unlocked);
  }, [regularBadges]);

  const lockedRegularBadges = useMemo(() => {
    return regularBadges.filter((b) => !b.unlocked);
  }, [regularBadges]);

  // Badges secrets débloqués (les verrouillés ne sont pas affichés)
  const unlockedSecretBadges = useMemo(() => {
    return secretBadges.filter((b) => b.unlocked);
  }, [secretBadges]);

  // Total des badges normaux (pour l'affichage X/9)
  const totalRegularBadges = regularBadges.length;
  const unlockedRegularCount = unlockedRegularBadges.length;
  const unlockedSecretCount = unlockedSecretBadges.length;

  return {
    // Badges normaux
    unlockedBadges: unlockedRegularBadges,
    lockedBadges: lockedRegularBadges,
    totalRegularBadges,
    unlockedRegularCount,
    // Badges secrets (seulement débloqués)
    unlockedSecretBadges,
    unlockedSecretCount,
    // Pour compatibilité
    badges: regularBadges,
    memberMonths,
  };
}
