import { useCallback } from 'react';

import { logger } from '@/lib/logger';

interface UseGameStartProps {
  audioElement: HTMLAudioElement | null;
  startGame?: () => void;
}

/**
 * Hook to handle game start logic
 */
export const useGameStart = ({ audioElement, startGame }: UseGameStartProps) => {
  const handlePlayClick = useCallback(() => {
    logger.debug('Bouton "Appuyez pour jouer" cliqué - Approche directe');

    // Ensure audio element is properly initialized
    if (audioElement) {
      logger.debug("État initial de l'audio avant le clic:", {
        paused: audioElement.paused,
        readyState: audioElement.readyState,
        currentTime: audioElement.currentTime,
        src: audioElement.src,
      });

      // Force preload if necessary
      if (audioElement.readyState < 2) {
        logger.debug('Audio pas encore prêt, forçage du chargement');
        audioElement.load();
      }

      // Start audio with logs to track state
      audioElement
        .play()
        .then(() => {
          logger.debug('Audio démarré avec succès depuis le clic du bouton');

          // Use startGame function directly if available
          if (startGame && typeof startGame === 'function') {
            logger.debug('Fonction startGame disponible, appel direct');
            try {
              startGame();
              logger.debug('Jeu démarré via gameData.startGame');
            } catch (e) {
              logger.error('Erreur lors du démarrage direct du jeu:', e);
              // Fallback to custom event
              window.dispatchEvent(new CustomEvent('game-force-start'));
            }
          } else {
            // If startGame is not available, use event approach
            logger.debug("Fonction startGame non disponible, utilisation de l'événement");
            window.dispatchEvent(new CustomEvent('game-start'));
          }
        })
        .catch((error) => {
          logger.error('Erreur lors du démarrage audio depuis le clic du bouton:', error);
          // Try to start game anyway
          if (startGame && typeof startGame === 'function') {
            try {
              startGame();
              logger.debug('Tentative de démarrage du jeu malgré échec audio');
            } catch (e) {
              window.dispatchEvent(new CustomEvent('game-force-start'));
            }
          } else {
            window.dispatchEvent(new CustomEvent('game-force-start'));
          }
        });
    } else {
      logger.error('Élément audio non disponible pour démarrer le jeu');
      // Even without audio, try to start game
      if (startGame && typeof startGame === 'function') {
        try {
          startGame();
          logger.debug('Démarrage du jeu sans audio via gameData.startGame');
        } catch (e) {
          window.dispatchEvent(new CustomEvent('game-force-start'));
        }
      } else {
        window.dispatchEvent(new CustomEvent('game-force-start'));
      }
    }
  }, [audioElement, startGame]);

  return { handlePlayClick };
};
