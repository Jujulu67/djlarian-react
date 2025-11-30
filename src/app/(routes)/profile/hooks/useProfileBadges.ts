import { useMemo } from 'react';
import { calculateBadges, type Badge } from '../utils/badgeCalculations';
import { getMemberMonths } from '../utils/dateUtils';
import type { UserStats } from './useProfileStats';

interface User {
  role?: string;
  isVip?: boolean;
  createdAt?: string | Date | null;
}

export function useProfileBadges(stats: UserStats, user: User) {
  const memberMonths = useMemo(() => {
    return getMemberMonths(user.createdAt);
  }, [user.createdAt]);

  const badges = useMemo(() => {
    return calculateBadges(memberMonths, stats, user);
  }, [memberMonths, stats, user]);

  const unlockedBadges = useMemo(() => {
    return badges.filter((b) => b.unlocked);
  }, [badges]);

  const lockedBadges = useMemo(() => {
    return badges.filter((b) => !b.unlocked);
  }, [badges]);

  return {
    badges,
    unlockedBadges,
    lockedBadges,
    memberMonths,
  };
}
