import { useCallback, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';

interface GameStats {
  gameHighScore: number;
  hasDiscoveredCasino: boolean;
}

/**
 * Hook pour synchroniser les stats de jeu avec l'API
 * Gère le highscore persistant et les découvertes (casino)
 */
export function useGameStats() {
  const { data: session, status } = useSession();
  const isAuthenticated = status === 'authenticated';
  const hasFetched = useRef(false);

  // Fetch highscore from API on mount (if authenticated)
  const fetchHighScore = useCallback(async (): Promise<number> => {
    if (!isAuthenticated) {
      // Fallback to localStorage
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('highScore');
        return saved ? parseInt(saved, 10) : 0;
      }
      return 0;
    }

    try {
      const response = await fetch('/api/user/game-stats');
      if (response.ok) {
        const { data } = await response.json();
        return data?.gameHighScore ?? 0;
      }
    } catch (error) {
      console.error('Error fetching game stats:', error);
    }

    // Fallback to localStorage on error
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('highScore');
      return saved ? parseInt(saved, 10) : 0;
    }
    return 0;
  }, [isAuthenticated]);

  // Save highscore to API (if authenticated) and localStorage
  const saveHighScore = useCallback(
    async (score: number): Promise<void> => {
      // Always save to localStorage as fallback
      if (typeof window !== 'undefined') {
        localStorage.setItem('highScore', score.toString());
      }

      if (!isAuthenticated) return;

      try {
        await fetch('/api/user/game-stats', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ gameHighScore: score }),
        });
      } catch (error) {
        console.error('Error saving game stats:', error);
      }
    },
    [isAuthenticated]
  );

  // Track casino discovery
  const trackCasinoDiscovery = useCallback(async (): Promise<void> => {
    if (!isAuthenticated) return;

    try {
      await fetch('/api/user/game-stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hasDiscoveredCasino: true }),
      });
    } catch (error) {
      console.error('Error tracking casino discovery:', error);
    }
  }, [isAuthenticated]);

  return {
    isAuthenticated,
    fetchHighScore,
    saveHighScore,
    trackCasinoDiscovery,
    hasFetched,
  };
}
