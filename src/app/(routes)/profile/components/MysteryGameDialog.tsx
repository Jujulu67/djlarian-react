'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Coins, Trophy, Play, Zap, Star } from 'lucide-react';
import { useState, useEffect, useCallback, useRef } from 'react';
import ReactDOM from 'react-dom';
import Image from 'next/image';
import { useMiniGame, GameResult } from '../hooks/useMiniGame';
import { FloatingScore, ComboIndicator, CelebrationOverlay, ScreenShake } from './MiniGameEffects';
import { ConfettiExplosion, CoinsRain } from './SlotMachineEffects';

interface MysteryGameDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onTokenUpdate?: () => Promise<void>;
}

// Simple grid game: Click groups of colors to destroy them
const GRID_SIZE = 8;
const COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#a855f7']; // Tailwind colors
const COLOR_NAMES = ['red', 'blue', 'green', 'yellow', 'purple'];

interface Explosion {
  id: number;
  x: number;
  y: number;
  color: string;
  count: number;
}

interface ScorePopup {
  id: number;
  score: number;
  x: number;
  y: number;
  combo: number;
}

export function MysteryGameDialog({ isOpen, onClose, onTokenUpdate }: MysteryGameDialogProps) {
  const [grid, setGrid] = useState<string[][]>([]);
  const [score, setScore] = useState(0);
  const [gameResult, setGameResult] = useState<GameResult | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [explosions, setExplosions] = useState<Explosion[]>([]);
  const [scorePopups, setScorePopups] = useState<ScorePopup[]>([]);
  const [shake, setShake] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [hoveredGroup, setHoveredGroup] = useState<Set<string>>(new Set());
  const explosionIdRef = useRef(0);
  const popupIdRef = useRef(0);
  const gridRef = useRef<HTMLDivElement>(null);

  const { play, isLoading } = useMiniGame(onTokenUpdate);

  const initGame = useCallback(() => {
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
    setCombo(0);
    setMaxCombo(0);
    setIsGameOver(false);
    setExplosions([]);
    setScorePopups([]);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setIsPlaying(false);
      setGameResult(null);
      setIsGameOver(false);
      setShowCelebration(false);
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

  const findConnectedGroup = (row: number, col: number, currentGrid: string[][]): Set<string> => {
    const color = currentGrid[row][col];
    if (!color) return new Set();

    const group = new Set<string>();
    const queue = [[row, col]];
    group.add(`${row},${col}`);

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
          if (currentGrid[nr][nc] === color && !group.has(`${nr},${nc}`)) {
            group.add(`${nr},${nc}`);
            queue.push([nr, nc]);
          }
        }
      }
    }

    return group;
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

  const handleHover = (row: number, col: number) => {
    if (isGameOver) return;
    const group = findConnectedGroup(row, col, grid);
    if (group.size >= 2) {
      setHoveredGroup(group);
    } else {
      setHoveredGroup(new Set());
    }
  };

  const handleClick = (row: number, col: number) => {
    if (isGameOver) return;

    const color = grid[row][col];
    if (!color) return;

    const toRemove = findConnectedGroup(row, col, grid);
    if (toRemove.size < 2) return; // Need at least 2 to pop

    // Increment combo
    const newCombo = combo + 1;
    setCombo(newCombo);
    if (newCombo > maxCombo) setMaxCombo(newCombo);

    // Calculate score with combo multiplier
    const baseScore = toRemove.size * 10;
    const comboMultiplier = Math.min(newCombo, 5);
    const points = baseScore * comboMultiplier;

    // Create explosions and score popups
    const gridRect = gridRef.current?.getBoundingClientRect();
    const cellSize = gridRect ? gridRect.width / GRID_SIZE : 40;

    const newExplosions: Explosion[] = [];
    toRemove.forEach((key) => {
      const [r, c] = key.split(',').map(Number);
      newExplosions.push({
        id: explosionIdRef.current++,
        x: c * cellSize + cellSize / 2,
        y: r * cellSize + cellSize / 2,
        color,
        count: 1,
      });
    });
    setExplosions((prev) => [...prev, ...newExplosions]);

    // Add score popup at center of group
    const centerR =
      Array.from(toRemove).reduce((sum, key) => sum + parseInt(key.split(',')[0]), 0) /
      toRemove.size;
    const centerC =
      Array.from(toRemove).reduce((sum, key) => sum + parseInt(key.split(',')[1]), 0) /
      toRemove.size;

    setScorePopups((prev) => [
      ...prev,
      {
        id: popupIdRef.current++,
        score: points,
        x: centerC * cellSize + cellSize / 2,
        y: centerR * cellSize + cellSize / 2,
        combo: comboMultiplier,
      },
    ]);

    // Shake effect for large groups
    if (toRemove.size >= 5) {
      setShake(true);
      setTimeout(() => setShake(false), 400);
    }

    // Clear explosions after animation
    setTimeout(() => {
      setExplosions((prev) => prev.filter((e) => !newExplosions.find((ne) => ne.id === e.id)));
    }, 600);

    // Clear score popups
    setTimeout(() => {
      setScorePopups((prev) => prev.slice(1));
    }, 800);

    // Remove items and update grid
    const newGrid = [...grid.map((r) => [...r])];
    toRemove.forEach((key) => {
      const [r, c] = key.split(',').map(Number);
      newGrid[r][c] = '';
    });

    // Apply gravity with delay for visual effect
    setTimeout(() => {
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
      setGrid([...newGrid]);

      if (checkGameOver(newGrid)) {
        setIsGameOver(true);
        // Reset combo on game over
        setCombo(0);

        if (gameResult?.isWin) {
          setShowCelebration(true);
          setTimeout(() => setShowCelebration(false), 4000);
        }
      }
    }, 150);

    setGrid(newGrid);
    setScore((prev) => prev + points);
    setHoveredGroup(new Set());
  };

  const handleEndGame = () => {
    setIsPlaying(false);
    setShowCelebration(false);
  };

  if (!isOpen) return null;

  const content = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/90 backdrop-blur-md overflow-hidden"
        >
          {/* Effects */}
          <ConfettiExplosion
            isActive={showCelebration}
            intensity={gameResult?.rewardType === 'QUEUE_SKIP' ? 'jackpot' : 'high'}
          />
          <CoinsRain isActive={showCelebration && gameResult?.rewardType === 'TOKENS'} count={30} />

          <div className="relative w-full max-w-2xl p-8 flex flex-col items-center">
            <button
              onClick={onClose}
              className="absolute top-0 right-0 p-2 text-white/50 hover:text-white transition-colors z-50"
            >
              <X size={32} />
            </button>

            <motion.h2
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="text-4xl font-audiowide text-white mb-4 text-center flex items-center gap-3"
            >
              <Zap className="text-purple-400" />
              Le Vide-Grenier Cosmique
              <Zap className="text-purple-400" />
            </motion.h2>

            {!isPlaying ? (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex flex-col items-center gap-8 mt-8"
              >
                <div className="text-center max-w-md text-gray-300 space-y-4">
                  <p className="text-lg">
                    Nettoyez le grenier en assemblant les objets par couleur.
                  </p>
                  <div className="flex justify-center gap-4">
                    {COLORS.map((color, i) => (
                      <motion.div
                        key={i}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: i * 0.1 }}
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${color}30`, border: `2px solid ${color}` }}
                      >
                        <Image
                          src={`/assets/easter-egg/mystery-item-${i}.png`}
                          alt=""
                          width={32}
                          height={32}
                          className="object-contain"
                        />
                      </motion.div>
                    ))}
                  </div>
                  <div className="bg-purple-500/20 rounded-xl p-4 border border-purple-500/30">
                    <div className="flex items-center justify-center gap-2 text-purple-300 mb-2">
                      <Star className="w-5 h-5" />
                      <span className="font-bold">COMBOS</span>
                      <Star className="w-5 h-5" />
                    </div>
                    <p className="text-sm text-gray-400">
                      Enchaînez les clics pour augmenter votre multiplicateur !
                    </p>
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={startGame}
                  disabled={isLoading}
                  className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold rounded-full text-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3 shadow-lg shadow-purple-900/50"
                >
                  {isLoading ? (
                    <span className="animate-pulse">Chargement...</span>
                  ) : (
                    <>
                      <Play size={24} fill="currentColor" />
                      <div className="flex flex-col items-start">
                        <span className="text-lg leading-none font-audiowide">Jouer</span>
                        <span className="text-xs opacity-70 font-normal flex items-center gap-1">
                          <Coins size={12} /> 10 jetons
                        </span>
                      </div>
                    </>
                  )}
                </motion.button>
              </motion.div>
            ) : (
              <>
                {/* Score & Combo Display */}
                <div className="flex justify-between w-full max-w-[400px] mb-4 items-center">
                  <div className="flex flex-col">
                    <motion.div
                      key={score}
                      initial={{ scale: 1.2 }}
                      animate={{ scale: 1 }}
                      className="text-3xl font-bold text-purple-400 font-audiowide"
                    >
                      {score}
                    </motion.div>
                    <div className="text-xs text-gray-500">SCORE</div>
                  </div>

                  <AnimatePresence>
                    {combo >= 2 && !isGameOver && (
                      <motion.div
                        initial={{ scale: 0, x: 50 }}
                        animate={{ scale: 1, x: 0 }}
                        exit={{ scale: 0, x: 50 }}
                        className="flex items-center gap-2"
                      >
                        <div
                          className={`px-4 py-2 rounded-full font-bold ${
                            combo >= 5
                              ? 'bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 text-white'
                              : combo >= 3
                                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                                : 'bg-blue-500/50 text-blue-200'
                          }`}
                        >
                          <motion.span
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ duration: 0.3, repeat: combo >= 3 ? Infinity : 0 }}
                          >
                            {combo >= 5 ? '🔥' : combo >= 3 ? '⚡' : '✨'} x{combo}
                          </motion.span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {isGameOver && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-red-400 font-bold"
                    >
                      FIN DE PARTIE
                    </motion.div>
                  )}
                </div>

                {/* Game Grid */}
                <ScreenShake isActive={shake} intensity={8}>
                  <div className="relative">
                    {/* Score Popups */}
                    {scorePopups.map((popup) => (
                      <FloatingScore
                        key={popup.id}
                        score={popup.score}
                        x={popup.x}
                        y={popup.y}
                        isVisible={true}
                        combo={popup.combo}
                      />
                    ))}

                    {/* Explosion Effects */}
                    {explosions.map((explosion) => (
                      <motion.div
                        key={explosion.id}
                        initial={{ scale: 0, opacity: 1 }}
                        animate={{ scale: 2, opacity: 0 }}
                        transition={{ duration: 0.4 }}
                        className="absolute w-8 h-8 rounded-full pointer-events-none z-40"
                        style={{
                          left: explosion.x - 16,
                          top: explosion.y - 16,
                          backgroundColor: explosion.color,
                          boxShadow: `0 0 20px ${explosion.color}`,
                        }}
                      />
                    ))}

                    <div
                      ref={gridRef}
                      className={`grid gap-1 bg-black/50 p-3 rounded-xl border border-white/10 transition-all duration-300 ${isGameOver ? 'opacity-40' : 'opacity-100'}`}
                      style={{
                        gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
                        width: 'min(80vw, 400px)',
                        height: 'min(80vw, 400px)',
                      }}
                      onMouseLeave={() => setHoveredGroup(new Set())}
                    >
                      {grid.map((row, r) =>
                        row.map((color, c) => {
                          const isInHoveredGroup = hoveredGroup.has(`${r},${c}`);
                          return (
                            <motion.div
                              key={`${r}-${c}`}
                              layout
                              initial={{ scale: 0 }}
                              animate={{
                                scale: color ? 1 : 0,
                                opacity: color ? 1 : 0,
                              }}
                              onClick={() => handleClick(r, c)}
                              onMouseEnter={() => handleHover(r, c)}
                              className={`w-full h-full rounded-md cursor-pointer transition-all flex items-center justify-center relative overflow-hidden ${
                                isInHoveredGroup ? 'ring-2 ring-white/50 z-10' : ''
                              }`}
                              style={{
                                backgroundColor: color ? `${color}20` : 'transparent',
                                border: color ? `1px solid ${color}40` : 'none',
                                transform: isInHoveredGroup ? 'scale(1.05)' : 'scale(1)',
                              }}
                              whileTap={{ scale: 0.8 }}
                            >
                              {color && (
                                <motion.div
                                  initial={{ scale: 0, rotate: -10 }}
                                  animate={{
                                    scale: 1,
                                    rotate: 0,
                                    y: isInHoveredGroup ? -3 : 0,
                                  }}
                                  className="relative w-full h-full p-1"
                                >
                                  <Image
                                    src={`/assets/easter-egg/mystery-item-${COLORS.indexOf(color)}.png`}
                                    alt="Item"
                                    fill
                                    className={`object-contain drop-shadow-md transition-all ${isInHoveredGroup ? 'brightness-125' : ''}`}
                                  />
                                </motion.div>
                              )}
                            </motion.div>
                          );
                        })
                      )}
                    </div>

                    {/* Game Over Overlay */}
                    <AnimatePresence>
                      {isGameOver && gameResult && (
                        <motion.div
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className="absolute inset-0 flex items-center justify-center"
                        >
                          <div className="bg-black/90 backdrop-blur-md p-8 rounded-2xl border border-purple-500/50 text-center shadow-2xl max-w-xs">
                            <motion.div
                              animate={{ rotate: [0, 10, -10, 0] }}
                              transition={{ duration: 0.5 }}
                              className="text-5xl mb-4"
                            >
                              {gameResult.isWin ? '🏆' : '😔'}
                            </motion.div>
                            <h3 className="text-2xl font-bold text-white mb-2">
                              Partie Terminée !
                            </h3>
                            <p className="text-gray-300 mb-2">{gameResult.message}</p>

                            <div className="text-purple-400 font-bold mb-4">
                              Score Final: {score}
                              {maxCombo > 1 && (
                                <span className="text-sm text-gray-500 block">
                                  Meilleur combo: x{maxCombo}
                                </span>
                              )}
                            </div>

                            {gameResult.isWin && (
                              <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex items-center justify-center gap-2 text-xl font-bold text-yellow-400 mb-6"
                              >
                                <Trophy size={24} />
                                <span>
                                  {gameResult.rewardType === 'TOKENS'
                                    ? `+${gameResult.rewardAmount} Jetons`
                                    : gameResult.rewardType === 'QUEUE_SKIP'
                                      ? 'Queue Skip !'
                                      : 'Ticket Éternel !'}
                                </span>
                              </motion.div>
                            )}

                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={handleEndGame}
                              className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                            >
                              Continuer
                            </motion.button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </ScreenShake>
              </>
            )}
          </div>

          {/* Celebration */}
          <CelebrationOverlay
            isVisible={showCelebration}
            message={gameResult?.rewardType === 'QUEUE_SKIP' ? 'JACKPOT !' : 'VICTOIRE !'}
            subMessage={`Score: ${score} points`}
            type={gameResult?.rewardType === 'QUEUE_SKIP' ? 'jackpot' : 'win'}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );

  if (typeof window === 'undefined') return null;
  return ReactDOM.createPortal(content, document.body);
}
