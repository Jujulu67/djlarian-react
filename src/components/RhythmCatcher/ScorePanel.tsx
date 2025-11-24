'use client';

import { motion, AnimatePresence } from 'framer-motion';
import React, { useEffect, useRef, useState } from 'react';

import { Player } from './gameEngine';
import styles from './styles.module.css';

interface ScorePanelProps {
  player: Player;
  isActive: boolean;
}

const ScorePanel: React.FC<ScorePanelProps> = ({ player, isActive }) => {
  const [displayScore, setDisplayScore] = useState(player.score);
  const [isScoreIncreasing, setIsScoreIncreasing] = useState(false);
  const [scoreChange, setScoreChange] = useState<{ value: number; timestamp: number } | null>(null);
  const [lastPlayerScore, setLastPlayerScore] = useState(player.score);
  const [displayCombo, setDisplayCombo] = useState(player.combo);
  const comboTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Formater les grands nombres avec K et M
  const formatScore = (value: number): string => {
    if (value >= 1_000_000) {
      return `${(value / 1_000_000).toFixed(1)}M`;
    } else if (value >= 1_000) {
      return `${(value / 1_000).toFixed(1)}K`;
    } else {
      return value.toString();
    }
  };

  // Animation fluide du score
  useEffect(() => {
    if (player.score > displayScore) {
      setIsScoreIncreasing(true);

      // Calcule l'incrément pour une animation fluide
      const difference = player.score - displayScore;
      const increment = Math.max(1, Math.ceil(difference / 10));

      const timer = setTimeout(() => {
        setDisplayScore((prev) => Math.min(player.score, prev + increment));
      }, 50);

      return () => clearTimeout(timer);
    } else if (player.score < displayScore) {
      setDisplayScore(player.score);
      setIsScoreIncreasing(false);
    } else {
      setIsScoreIncreasing(false);
    }
  }, [player.score, displayScore]);

  // Gère l'affichage du combo avec un délai avant de disparaître
  useEffect(() => {
    // Si le combo augmente, met à jour immédiatement
    if (player.combo > displayCombo) {
      setDisplayCombo(player.combo);
      // Annule le timeout précédent si le combo augmente
      if (comboTimeoutRef.current) {
        clearTimeout(comboTimeoutRef.current);
        comboTimeoutRef.current = null;
      }
    } else if (player.combo === 0 && displayCombo > 0) {
      // Si le combo est réinitialisé mais qu'on affichait encore un combo,
      // attendre 2 secondes avant de le cacher
      if (comboTimeoutRef.current) {
        clearTimeout(comboTimeoutRef.current);
      }
      comboTimeoutRef.current = setTimeout(() => {
        setDisplayCombo(0);
        comboTimeoutRef.current = null;
      }, 2000); // 2 secondes de délai avant de cacher le combo
    } else if (player.combo === 0 && displayCombo === 0 && comboTimeoutRef.current) {
      // Si le combo est déjà à 0, annule le timeout
      clearTimeout(comboTimeoutRef.current);
      comboTimeoutRef.current = null;
    }

    return () => {
      if (comboTimeoutRef.current) {
        clearTimeout(comboTimeoutRef.current);
        comboTimeoutRef.current = null;
      }
    };
  }, [player.combo, displayCombo]);

  // Affiche les changements de score - basé sur le changement réel du score du joueur
  useEffect(() => {
    // Calcule le changement réel du score (pas basé sur displayScore qui s'anime)
    const actualScoreChange = player.score - lastPlayerScore;

    // Nettoie le timer précédent si nécessaire
    let timer: NodeJS.Timeout | null = null;

    if (actualScoreChange > 5) {
      // Nouveau gain de score significatif - remplace l'ancien si existant
      setScoreChange({ value: actualScoreChange, timestamp: Date.now() });
      setLastPlayerScore(player.score);

      timer = setTimeout(() => {
        setScoreChange(null);
      }, 1000);
    } else if (actualScoreChange < 0 || player.score < lastPlayerScore) {
      // Le score a diminué ou changé, réinitialise immédiatement
      setScoreChange(null);
      setLastPlayerScore(player.score);
    } else if (actualScoreChange === 0) {
      // Pas de changement, met à jour lastPlayerScore pour éviter les faux positifs
      setLastPlayerScore(player.score);

      // Si scoreChange existe, vérifie s'il doit être supprimé après 1 seconde
      if (scoreChange) {
        const timeSinceChange = Date.now() - scoreChange.timestamp;
        if (timeSinceChange > 1000) {
          setScoreChange(null);
        } else {
          // Programme la suppression si le temps n'est pas encore écoulé
          timer = setTimeout(() => {
            setScoreChange(null);
          }, 1000 - timeSinceChange);
        }
      }
    }

    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [player.score, lastPlayerScore, scoreChange]);

  // Calcule le pourcentage de précision en incluant les misses (clics ratés + patterns manqués)
  const totalHits = player.perfectHits + player.goodHits + player.okHits;
  const totalMisses = player.missHits + player.missedPatterns;
  const totalAttempts = totalHits + totalMisses;
  const accuracyScore =
    totalAttempts > 0
      ? Math.round(
          ((player.perfectHits * 100 + player.goodHits * 70 + player.okHits * 40) /
            (totalAttempts * 100)) *
            100
        )
      : 0;

  // Détermine le rang en fonction de la précision (avec misses)
  const getRank = (): string => {
    if (totalAttempts === 0) return 'D';
    if (accuracyScore >= 95) return 'S';
    if (accuracyScore >= 85) return 'A';
    if (accuracyScore >= 70) return 'B';
    if (accuracyScore >= 50) return 'C';
    return 'D';
  };

  // Obtient la couleur pour l'affichage du rang
  const getRankColor = (): string => {
    const rank = getRank();
    switch (rank) {
      case 'S':
        return 'text-yellow-400';
      case 'A':
        return 'text-green-400';
      case 'B':
        return 'text-blue-400';
      case 'C':
        return 'text-purple-400';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <div className={styles.scorePanel}>
      {/* Score principal - sur mobile: score à gauche, combo au milieu, meilleur score à droite */}
      <div className={styles.mainScore}>
        {/* Score à gauche */}
        <div className={styles.scoreValue}>
          {formatScore(displayScore)}
          {isScoreIncreasing && <span className={styles.scoreIncreasing}>+</span>}
        </div>

        {/* Combo au milieu */}
        {displayCombo > 1 && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className={styles.combo}
          >
            {displayCombo}x Combo
          </motion.div>
        )}

        {/* Meilleur score à droite */}
        <div className={styles.highScore}>Meilleur: {formatScore(player.highScore)}</div>
      </div>

      {/* Statistiques de précision - visible dès que le jeu est actif */}
      {isActive && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className={styles.statsPanel}
        >
          <div className={styles.statRow}>
            <span>Parfait</span>
            <span style={{ color: '#facc15' }}>{player.perfectHits}</span>
          </div>
          <div className={styles.statRow}>
            <span>Bon</span>
            <span style={{ color: '#4ade80' }}>{player.goodHits}</span>
          </div>
          <div className={styles.statRow}>
            <span>OK</span>
            <span style={{ color: '#60a5fa' }}>{player.okHits}</span>
          </div>
          <div className={styles.statRow}>
            <span>Miss (clics)</span>
            <span style={{ color: '#ef4444' }}>{player.missHits}</span>
          </div>
          <div className={styles.statRow}>
            <span>Miss (boules)</span>
            <span style={{ color: '#f87171' }}>{player.missedPatterns}</span>
          </div>
          {/* Précision et rang affichés sur mobile aussi */}
          <div className={`${styles.statRow} ${styles.desktopOnly}`}>
            <span>Précision</span>
            <span style={{ color: '#c084fc' }}>{accuracyScore}%</span>
          </div>
          <div className={styles.statRow}>
            <span>Rang</span>
            <span className={`${styles.rank} ${getRankColor()}`}>{getRank()}</span>
          </div>
        </motion.div>
      )}

      {/* Animation de changement de score */}
      <AnimatePresence>
        {scoreChange && (
          <motion.div
            className={styles.scoreChange}
            initial={{ opacity: 0, y: 0, scale: 0.5 }}
            animate={{ opacity: 1, y: -15, scale: 1.2 }}
            exit={{ opacity: 0, y: -30 }}
            transition={{ duration: 1 }}
          >
            +{formatScore(Math.round(scoreChange.value))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ScorePanel;
