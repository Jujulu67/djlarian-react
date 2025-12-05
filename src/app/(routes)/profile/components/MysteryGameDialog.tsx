'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, RefreshCw, Coins, Trophy, Play } from 'lucide-react';
import { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import Image from 'next/image';
import { useMiniGame, GameResult } from '../hooks/useMiniGame';

interface MysteryGameDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onTokenUpdate?: () => Promise<void>;
}

// Simple grid game: Click groups of colors to destroy them
const GRID_SIZE = 8;
const COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#a855f7']; // Tailwind colors

export function MysteryGameDialog({ isOpen, onClose, onTokenUpdate }: MysteryGameDialogProps) {
  const [grid, setGrid] = useState<string[][]>([]);
  const [score, setScore] = useState(0);
  const [gameResult, setGameResult] = useState<GameResult | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);

  const { play, isLoading } = useMiniGame(onTokenUpdate);

  const initGame = () => {
    const newGrid = [];
    for (let i = 0; i < GRID_SIZE; i++) {
      const row = [];
      for (let j = 0; j < GRID_SIZE; j++) {
        row.push(COLORS[Math.floor(Math.random() * COLORS.length)]);
      }
      newGrid.push(row);
    }
    setGrid(newGrid);
    setScore(0);
    setIsGameOver(false);
  };

  useEffect(() => {
    if (isOpen) {
      setIsPlaying(false);
      setGameResult(null);
      setIsGameOver(false);
    }
  }, [isOpen]);

  const startGame = async () => {
    if (isLoading) return;

    const result = await play('mystery');
    if (result) {
      setGameResult(result);
      setIsPlaying(true);
      initGame();
    }
  };

  const checkGameOver = (currentGrid: string[][]) => {
    // Check if any moves are possible
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const color = currentGrid[r][c];
        if (!color) continue;

        // Check neighbors
        const neighbors = [
          [r + 1, c],
          [r - 1, c],
          [r, c + 1],
          [r, c - 1],
        ];
        for (const [nr, nc] of neighbors) {
          if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE) {
            if (currentGrid[nr][nc] === color) return false; // Move possible
          }
        }
      }
    }
    return true; // No moves possible
  };

  const handleClick = (row: number, col: number) => {
    if (isGameOver) return;

    const color = grid[row][col];
    if (!color) return; // Already empty

    // Find connected component (flood fill)
    const toRemove = new Set<string>();
    const queue = [[row, col]];
    toRemove.add(`${row},${col}`);

    while (queue.length > 0) {
      const [r, c] = queue.shift()!;

      const neighbors = [
        [r + 1, c],
        [r - 1, c],
        [r, c + 1],
        [r, c - 1],
      ];

      for (const [nr, nc] of neighbors) {
        if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE) {
          if (grid[nr][nc] === color && !toRemove.has(`${nr},${nc}`)) {
            toRemove.add(`${nr},${nc}`);
            queue.push([nr, nc]);
          }
        }
      }
    }

    if (toRemove.size < 2) return; // Need at least 2 to pop

    // Remove items and update score
    const newGrid = [...grid.map((r) => [...r])];
    toRemove.forEach((key) => {
      const [r, c] = key.split(',').map(Number);
      newGrid[r][c] = ''; // Empty
    });

    // Apply gravity
    for (let c = 0; c < GRID_SIZE; c++) {
      let writeRow = GRID_SIZE - 1;
      for (let r = GRID_SIZE - 1; r >= 0; r--) {
        if (newGrid[r][c] !== '') {
          newGrid[writeRow][c] = newGrid[r][c];
          if (writeRow !== r) newGrid[r][c] = '';
          writeRow--;
        }
      }
    }

    // NO REFILL for this version to ensure game ends

    setGrid(newGrid);
    setScore((prev) => prev + toRemove.size * 10);

    if (checkGameOver(newGrid)) {
      setIsGameOver(true);
    }
  };

  if (!isOpen) return null;

  const content = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/90 backdrop-blur-md"
        >
          <div className="relative w-full max-w-2xl p-8 flex flex-col items-center">
            <button
              onClick={onClose}
              className="absolute top-0 right-0 p-2 text-white/50 hover:text-white transition-colors"
            >
              <X size={32} />
            </button>

            <h2 className="text-4xl font-audiowide text-white mb-4 text-center">
              Le Vide-Grenier Cosmique
            </h2>

            {!isPlaying ? (
              <div className="flex flex-col items-center gap-8 mt-8">
                <div className="text-center max-w-md text-gray-300">
                  <p className="mb-4">Nettoyez le grenier en assemblant les objets par couleur.</p>
                  <p>
                    Une fois qu'il n'y a plus de mouvements possibles, vous découvrirez votre
                    récompense !
                  </p>
                </div>

                <button
                  onClick={startGame}
                  disabled={isLoading}
                  className="px-8 py-4 bg-gradient-to-r from-purple-600 to-purple-800 hover:from-purple-500 hover:to-purple-700 text-white font-bold rounded-full text-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3 shadow-lg shadow-purple-900/50"
                >
                  {isLoading ? (
                    <span className="animate-pulse">Chargement...</span>
                  ) : (
                    <>
                      <Play size={24} fill="currentColor" />
                      <div className="flex flex-col items-start">
                        <span className="text-lg leading-none">Jouer</span>
                        <span className="text-xs opacity-70 font-normal flex items-center gap-1">
                          <Coins size={12} /> 10 jetons
                        </span>
                      </div>
                    </>
                  )}
                </button>
              </div>
            ) : (
              <>
                <div className="flex justify-between w-full max-w-[400px] mb-4 items-end">
                  <div className="text-2xl font-bold text-purple-400">Score: {score}</div>
                  {isGameOver && (
                    <div className="text-red-400 font-bold animate-pulse">Plus de mouvements !</div>
                  )}
                </div>

                <div className="relative">
                  <div
                    className={`grid gap-1 bg-black/50 p-2 rounded-lg border border-white/10 transition-opacity duration-500 ${isGameOver ? 'opacity-20 pointer-events-none' : 'opacity-100'}`}
                    style={{
                      gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
                      width: 'min(80vw, 400px)',
                      height: 'min(80vw, 400px)',
                    }}
                  >
                    {grid.map((row, r) =>
                      row.map((color, c) => (
                        <motion.div
                          key={`${r}-${c}`}
                          layout
                          onClick={() => handleClick(r, c)}
                          className="w-full h-full rounded-md cursor-pointer hover:brightness-110 transition-all flex items-center justify-center shadow-inner relative overflow-hidden group"
                          style={{
                            backgroundColor: color ? `${color}20` : 'transparent', // Lower opacity background
                            border: color ? `1px solid ${color}40` : 'none',
                          }}
                          whileTap={{ scale: 0.8 }}
                        >
                          {color && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="relative w-full h-full p-1"
                            >
                              <Image
                                src={`/assets/easter-egg/mystery-item-${COLORS.indexOf(color)}.png`}
                                alt="Item"
                                fill
                                className="object-contain drop-shadow-md"
                              />
                            </motion.div>
                          )}
                        </motion.div>
                      ))
                    )}
                  </div>

                  {isGameOver && gameResult && (
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="absolute inset-0 flex items-center justify-center"
                    >
                      <div className="bg-black/80 backdrop-blur-md p-8 rounded-2xl border border-purple-500/50 text-center shadow-2xl max-w-xs">
                        <h3 className="text-2xl font-bold text-white mb-2">Partie Terminée !</h3>
                        <p className="text-gray-300 mb-4">{gameResult.message}</p>

                        {gameResult.isWin && (
                          <div className="flex items-center justify-center gap-2 text-xl font-bold text-yellow-400 mb-6">
                            <Trophy size={24} />
                            <span>
                              {gameResult.rewardType === 'TOKENS'
                                ? `+${gameResult.rewardAmount} Jetons`
                                : gameResult.rewardType === 'QUEUE_SKIP'
                                  ? 'Queue Skip !'
                                  : 'Ticket Éternel !'}
                            </span>
                          </div>
                        )}

                        <button
                          onClick={() => setIsPlaying(false)}
                          className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                        >
                          Continuer
                        </button>
                      </div>
                    </motion.div>
                  )}
                </div>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  if (typeof window === 'undefined') return null;
  return ReactDOM.createPortal(content, document.body);
}
