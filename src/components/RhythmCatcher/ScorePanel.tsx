'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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

  // Affiche les changements de score
  useEffect(() => {
    if (player.score > displayScore + 5) {
      setScoreChange({ value: player.score - displayScore, timestamp: Date.now() });

      const timer = setTimeout(() => {
        setScoreChange(null);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [player.score, displayScore]);

  // Calcule le pourcentage de précision
  const totalHits = player.perfectHits + player.goodHits + player.okHits;
  const accuracyScore =
    totalHits > 0
      ? Math.round(
          ((player.perfectHits * 100 + player.goodHits * 70 + player.okHits * 40) /
            (totalHits * 100)) *
            100
        )
      : 0;

  // Détermine le rang en fonction de la précision
  const getRank = (): string => {
    if (player.totalNotes === 0) return 'D';
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
      {/* Score principal */}
      <div className={styles.mainScore}>
        <div className={styles.scoreValue}>
          {formatScore(displayScore)}
          {isScoreIncreasing && <span className={styles.scoreIncreasing}>+</span>}
        </div>
      </div>

      {/* Combo */}
      {player.combo > 1 && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={styles.combo}
        >
          {player.combo}x Combo
        </motion.div>
      )}

      {/* Meilleur score */}
      <div className={styles.highScore}>Meilleur: {formatScore(player.highScore)}</div>

      {/* Statistiques de précision - visible uniquement si le jeu est actif */}
      {isActive && player.totalNotes > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className={styles.statsPanel}
        >
          <div className={styles.statRow}>
            <span>Parfait:</span>
            <span className="text-yellow-400">{player.perfectHits}</span>
          </div>
          <div className={styles.statRow}>
            <span>Bon:</span>
            <span className="text-green-400">{player.goodHits}</span>
          </div>
          <div className={styles.statRow}>
            <span>OK:</span>
            <span className="text-blue-400">{player.okHits}</span>
          </div>
          <div className={`${styles.statRow} ${styles.statDivider}`}>
            <span>Précision:</span>
            <span>{accuracyScore}%</span>
          </div>
          <div className={styles.statRow}>
            <span>Rang:</span>
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
