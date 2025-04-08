'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ScoreDisplayProps {
  score: number;
  combo: number;
  highScore: number;
  perfectHits?: number;
  goodHits?: number;
  okHits?: number;
  totalNotes?: number;
}

const ScoreDisplay: React.FC<ScoreDisplayProps> = ({
  score,
  combo,
  highScore,
  perfectHits = 0,
  goodHits = 0,
  okHits = 0,
  totalNotes = 0,
}) => {
  const [displayScore, setDisplayScore] = useState(score);
  const [isScoreIncreasing, setIsScoreIncreasing] = useState(false);
  const [isNewHighScore, setIsNewHighScore] = useState(false);
  const [scoreChange, setScoreChange] = useState<{ value: number; timestamp: number } | null>(null);

  // Formater un nombre avec K et M pour les grands nombres
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
    // Si le score a augmenté
    if (score > displayScore) {
      setIsScoreIncreasing(true);

      // Animer le score progressivement
      const difference = score - displayScore;
      const increment = Math.max(1, Math.ceil(difference / 10));

      const timer = setTimeout(() => {
        setDisplayScore((prev) => Math.min(score, prev + increment));
      }, 50);

      return () => clearTimeout(timer);
    } else if (score < displayScore) {
      // Réinitialisation rapide quand le score diminue
      setDisplayScore(score);
      setIsScoreIncreasing(false);
    } else {
      // Le score est stable
      setIsScoreIncreasing(false);
    }
  }, [score, displayScore]);

  // Vérifier si c'est un nouveau meilleur score
  useEffect(() => {
    if (score > highScore && highScore > 0) {
      setIsNewHighScore(true);
      const timer = setTimeout(() => {
        setIsNewHighScore(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [score, highScore]);

  // Afficher les changements de score
  useEffect(() => {
    if (score > displayScore + 5) {
      setScoreChange({ value: score - displayScore, timestamp: Date.now() });

      const timer = setTimeout(() => {
        setScoreChange(null);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [score, displayScore]);

  // Calculer le pourcentage de précision
  const totalHits = perfectHits + goodHits + okHits;
  const accuracyScore =
    totalHits > 0
      ? Math.round(((perfectHits * 100 + goodHits * 70 + okHits * 40) / (totalHits * 100)) * 100)
      : 0;

  // Déterminer le rang en fonction de la précision
  const getRank = (): string => {
    if (totalNotes === 0) return 'D';
    if (accuracyScore >= 95) return 'S';
    if (accuracyScore >= 85) return 'A';
    if (accuracyScore >= 70) return 'B';
    if (accuracyScore >= 50) return 'C';
    return 'D';
  };

  // Obtenir une couleur pour l'affichage du rang
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
    <div
      className="absolute top-0 right-0 p-3 flex flex-col items-end space-y-1 text-white"
      style={{ textShadow: '0 2px 4px rgba(0,0,0,0.7)' }}
    >
      {/* Score principal */}
      <div className="flex items-center justify-end">
        <div className="text-xl font-semibold bg-black bg-opacity-30 px-3 py-1 rounded-full">
          {formatScore(displayScore)}
          {isScoreIncreasing && <span className="text-yellow-400 ml-2 animate-pulse">+</span>}
        </div>
      </div>

      {/* Combo */}
      {combo > 1 && (
        <div className="text-md font-medium bg-indigo-500 bg-opacity-70 px-2 py-0.5 rounded-full">
          {combo}x Combo
        </div>
      )}

      {/* Meilleur score */}
      <div className="text-sm bg-black bg-opacity-30 px-2 py-0.5 rounded-full">
        Meilleur: {formatScore(highScore)}
      </div>

      {/* Statistiques de précision - visible uniquement si le jeu est actif */}
      {totalNotes > 0 && (
        <div className="mt-2 bg-black bg-opacity-40 rounded p-1 text-xs space-y-1 min-w-[100px]">
          <div className="flex justify-between">
            <span>Parfait:</span>
            <span className="text-yellow-400">{perfectHits}</span>
          </div>
          <div className="flex justify-between">
            <span>Bon:</span>
            <span className="text-green-400">{goodHits}</span>
          </div>
          <div className="flex justify-between">
            <span>OK:</span>
            <span className="text-blue-400">{okHits}</span>
          </div>
          <div className="flex justify-between border-t border-gray-700 pt-1 mt-1">
            <span>Précision:</span>
            <span>{accuracyScore}%</span>
          </div>
          <div className="flex justify-between">
            <span>Rang:</span>
            <span className={`font-bold ${getRankColor()}`}>{getRank()}</span>
          </div>
        </div>
      )}

      {/* Animation de changement de score - déplacée pour éviter qu'elle soit coupée */}
      <AnimatePresence>
        {scoreChange && (
          <motion.div
            className="absolute top-2 right-24 text-base font-bold text-yellow-400"
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

export default ScoreDisplay;
