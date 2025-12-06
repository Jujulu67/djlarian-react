'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Coins, Trophy, Sparkles } from 'lucide-react';
import { useState, useRef, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { useMiniGame, GameResult } from '../hooks/useMiniGame';
import { ScratchParticles, CelebrationOverlay, getRandomSymbols } from './MiniGameEffects';
import { ConfettiExplosion, CoinsRain } from './SlotMachineEffects';

interface ScratchCardDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onTokenUpdate?: () => Promise<void>;
}

interface ScratchParticle {
  id: number;
  x: number;
  y: number;
  angle: number;
  color: string;
}

export function ScratchCardDialog({ isOpen, onClose, onTokenUpdate }: ScratchCardDialogProps) {
  const canvasRefs = [
    useRef<HTMLCanvasElement>(null),
    useRef<HTMLCanvasElement>(null),
    useRef<HTMLCanvasElement>(null),
  ];
  const [revealedZones, setRevealedZones] = useState<boolean[]>([false, false, false]);
  const [symbols, setSymbols] = useState<string[]>(['?', '?', '?']);
  const [isCanvasReady, setIsCanvasReady] = useState(false);
  const [gameResult, setGameResult] = useState<GameResult | null>(null);
  const [hasBoughtTicket, setHasBoughtTicket] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [particles, setParticles] = useState<ScratchParticle[]>([]);
  const [particleIdCounter, setParticleIdCounter] = useState(0);
  const [scratchProgress, setScratchProgress] = useState<number[]>([0, 0, 0]);

  const { play, isLoading } = useMiniGame(onTokenUpdate);

  const allRevealed = revealedZones.every((r) => r);
  const isWinning = symbols[0] === symbols[1] && symbols[1] === symbols[2] && symbols[0] !== '?';

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setHasBoughtTicket(false);
      setGameResult(null);
      setRevealedZones([false, false, false]);
      setIsCanvasReady(false);
      setSymbols(['?', '?', '?']);
      setShowCelebration(false);
      setParticles([]);
      setScratchProgress([0, 0, 0]);
    }
  }, [isOpen]);

  // Show celebration when all revealed and winning
  useEffect(() => {
    if (allRevealed && gameResult?.isWin) {
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 4000);
    }
  }, [allRevealed, gameResult]);

  const buyTicket = async () => {
    if (isLoading) return;

    const result = await play('scratch');
    if (result) {
      setGameResult(result);
      setHasBoughtTicket(true);

      // Generate symbols based on result
      const newSymbols = getRandomSymbols(result.isWin);
      setSymbols(newSymbols);

      // Initialize canvases
      setTimeout(() => initCanvases(), 100);
    }
  };

  const initCanvases = () => {
    canvasRefs.forEach((ref, index) => {
      const canvas = ref.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Set canvas size
      canvas.width = canvas.offsetWidth * 2;
      canvas.height = canvas.offsetHeight * 2;
      ctx.scale(2, 2);

      // Create gradient scratch layer
      const gradient = ctx.createLinearGradient(0, 0, canvas.offsetWidth, canvas.offsetHeight);
      gradient.addColorStop(0, '#c0c0c0');
      gradient.addColorStop(0.5, '#e8e8e8');
      gradient.addColorStop(1, '#c0c0c0');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);

      // Add shimmer texture
      for (let i = 0; i < 100; i++) {
        ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.05)';
        ctx.fillRect(
          Math.random() * canvas.offsetWidth,
          Math.random() * canvas.offsetHeight,
          Math.random() * 4 + 1,
          Math.random() * 4 + 1
        );
      }

      // Add "SCRATCH" text
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.font = 'bold 14px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('GRATTER', canvas.offsetWidth / 2, canvas.offsetHeight / 2);
    });

    setIsCanvasReady(true);
  };

  const addParticles = useCallback(
    (x: number, y: number) => {
      const colors = ['#ffd700', '#c0c0c0', '#e8e8e8', '#ffeb3b'];
      const newParticles: ScratchParticle[] = [];

      for (let i = 0; i < 3; i++) {
        newParticles.push({
          id: particleIdCounter + i,
          x,
          y,
          angle: Math.random() * Math.PI * 2,
          color: colors[Math.floor(Math.random() * colors.length)],
        });
      }

      setParticleIdCounter((prev) => prev + 3);
      setParticles((prev) => [...prev.slice(-30), ...newParticles]);
    },
    [particleIdCounter]
  );

  const handleScratch = (e: React.MouseEvent<HTMLCanvasElement>, index: number) => {
    if (revealedZones[index]) return;

    const canvas = canvasRefs[index].current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width / 2;
    const scaleY = canvas.height / rect.height / 2;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    // Add particles at scratch position
    addParticles(e.clientX - rect.left, e.clientY - rect.top);

    // Scratch effect
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x, y, 15, 0, Math.PI * 2);
    ctx.fill();

    // Check reveal percentage
    checkReveal(index);
  };

  const checkReveal = (index: number) => {
    const canvas = canvasRefs[index].current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let transparentPixels = 0;
    for (let i = 3; i < imageData.data.length; i += 4) {
      if (imageData.data[i] === 0) transparentPixels++;
    }

    const totalPixels = canvas.width * canvas.height;
    const progress = transparentPixels / totalPixels;
    setScratchProgress((prev) => {
      const newProgress = [...prev];
      newProgress[index] = progress;
      return newProgress;
    });

    if (progress > 0.4) {
      setRevealedZones((prev) => {
        const newRevealed = [...prev];
        newRevealed[index] = true;
        return newRevealed;
      });
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
          className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/90 backdrop-blur-md overflow-hidden"
        >
          {/* Effects */}
          <ConfettiExplosion
            isActive={showCelebration}
            intensity={gameResult?.rewardType === 'QUEUE_SKIP' ? 'jackpot' : 'high'}
          />
          <CoinsRain isActive={showCelebration && gameResult?.rewardType === 'TOKENS'} count={40} />

          <div className="relative w-full max-w-lg p-8 flex flex-col items-center">
            <button
              onClick={onClose}
              className="absolute top-0 right-0 p-2 text-white/50 hover:text-white transition-colors z-50"
            >
              <X size={32} />
            </button>

            <motion.h2
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="text-4xl font-audiowide text-white mb-6 text-center flex items-center gap-3"
            >
              <Sparkles className="text-yellow-400" />
              Ticket Chance
              <Sparkles className="text-yellow-400" />
            </motion.h2>

            {!hasBoughtTicket ? (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex flex-col items-center gap-6"
              >
                {/* Preview Card */}
                <div className="relative w-80 h-56 rounded-2xl overflow-hidden shadow-2xl border-4 border-yellow-400/50">
                  <div className="absolute inset-0 bg-gradient-to-br from-yellow-400 via-yellow-500 to-orange-500" />
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
                    <Sparkles className="w-16 h-16 text-yellow-100 mb-2" />
                    <div className="text-3xl font-bold text-yellow-100 font-audiowide drop-shadow-lg">
                      LUCKY SCRATCH
                    </div>
                    <div className="text-yellow-200 mt-2 text-sm">
                      3 symboles identiques = JACKPOT !
                    </div>

                    {/* Preview symbols */}
                    <div className="flex gap-3 mt-4">
                      {['💎', '⭐', '👑'].map((s, i) => (
                        <motion.div
                          key={i}
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: i * 0.1 }}
                          className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center text-2xl backdrop-blur-sm"
                        >
                          {s}
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={buyTicket}
                  disabled={isLoading}
                  className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold rounded-full text-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3 shadow-lg shadow-purple-900/50"
                >
                  {isLoading ? (
                    <span className="animate-pulse">Achat en cours...</span>
                  ) : (
                    <>
                      <div className="flex flex-col items-start">
                        <span className="text-lg leading-none font-audiowide">
                          Acheter un ticket
                        </span>
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
                {/* Scratch Card with 3 Zones */}
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="relative w-full max-w-md"
                >
                  {/* Card Background */}
                  <div className="relative bg-gradient-to-br from-yellow-400 via-yellow-500 to-orange-500 rounded-2xl p-6 shadow-2xl border-4 border-yellow-300">
                    {/* Title */}
                    <div className="text-center mb-4">
                      <div className="text-2xl font-bold text-yellow-100 font-audiowide drop-shadow">
                        GRATTEZ LES 3 ZONES
                      </div>
                      <div className="text-yellow-200 text-sm">Trouvez 3 symboles identiques !</div>
                    </div>

                    {/* 3 Scratch Zones */}
                    <div className="flex justify-center gap-4 relative">
                      <ScratchParticles particles={particles} />

                      {[0, 1, 2].map((index) => (
                        <motion.div
                          key={index}
                          initial={{ scale: 0, rotate: -10 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="relative w-24 h-24 md:w-28 md:h-28"
                        >
                          {/* Symbol underneath */}
                          <div
                            className={`absolute inset-0 bg-white rounded-xl flex items-center justify-center shadow-inner transition-all duration-300 ${
                              revealedZones[index] && isWinning
                                ? 'ring-4 ring-green-400 shadow-lg shadow-green-400/50'
                                : ''
                            }`}
                          >
                            <motion.span
                              initial={{ scale: 0 }}
                              animate={{
                                scale: revealedZones[index] ? 1 : 0.5,
                                opacity: revealedZones[index] ? 1 : 0,
                              }}
                              className="text-5xl"
                            >
                              {symbols[index]}
                            </motion.span>
                          </div>

                          {/* Scratch Canvas */}
                          {!revealedZones[index] && isCanvasReady && (
                            <canvas
                              ref={canvasRefs[index]}
                              className="absolute inset-0 w-full h-full cursor-pointer rounded-xl"
                              onMouseMove={(e) => {
                                if (e.buttons === 1) handleScratch(e, index);
                              }}
                              onMouseDown={(e) => handleScratch(e, index)}
                            />
                          )}

                          {/* Temporary cover while canvas is loading */}
                          {!revealedZones[index] && !isCanvasReady && (
                            <div className="absolute inset-0 bg-gradient-to-br from-gray-300 to-gray-400 rounded-xl flex items-center justify-center">
                              <span className="text-gray-600 text-xs font-bold animate-pulse">
                                GRATTER
                              </span>
                            </div>
                          )}

                          {/* Reveal animation */}
                          <AnimatePresence>
                            {revealedZones[index] && (
                              <motion.div
                                initial={{ scale: 1.5, opacity: 0 }}
                                animate={{ scale: 1, opacity: 0 }}
                                transition={{ duration: 0.3 }}
                                className="absolute inset-0 bg-white rounded-xl"
                              />
                            )}
                          </AnimatePresence>
                        </motion.div>
                      ))}
                    </div>

                    {/* Progress indicators */}
                    <div className="flex justify-center gap-4 mt-4">
                      {[0, 1, 2].map((index) => (
                        <div key={index} className="text-center">
                          <motion.div
                            animate={{
                              scale: revealedZones[index] ? [1, 1.2, 1] : 1,
                            }}
                            className={`w-3 h-3 rounded-full mx-auto ${
                              revealedZones[index]
                                ? 'bg-green-400 shadow-lg shadow-green-400/50'
                                : 'bg-yellow-200/50'
                            }`}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>

                {/* Result */}
                <div className="mt-6 text-center min-h-[80px]">
                  {!allRevealed ? (
                    <motion.p
                      animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      className="flex items-center justify-center gap-2 text-white/70"
                    >
                      <Sparkles size={20} className="text-yellow-400" />
                      Grattez pour révéler vos symboles !
                    </motion.p>
                  ) : (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="flex flex-col items-center gap-4"
                    >
                      <div
                        className={`text-2xl font-bold ${
                          gameResult?.isWin ? 'text-green-400' : 'text-red-400'
                        }`}
                      >
                        {gameResult?.isWin ? '🎉 FÉLICITATIONS !' : '😔 Pas de chance...'}
                      </div>
                      <div className="text-white/80">{gameResult?.message}</div>

                      {gameResult?.isWin && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex items-center gap-2 text-xl text-yellow-400 font-bold"
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
                        onClick={() => {
                          // Reset all game state when buying another ticket
                          setHasBoughtTicket(false);
                          setGameResult(null);
                          setRevealedZones([false, false, false]);
                          setIsCanvasReady(false);
                          setSymbols(['?', '?', '?']);
                          setShowCelebration(false);
                          setParticles([]);
                          setScratchProgress([0, 0, 0]);
                        }}
                        className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                      >
                        Acheter un autre ticket
                      </motion.button>
                    </motion.div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Celebration overlay */}
          <CelebrationOverlay
            isVisible={showCelebration}
            message={gameResult?.rewardType === 'QUEUE_SKIP' ? 'JACKPOT !' : 'VICTOIRE !'}
            subMessage="3 symboles identiques !"
            type={gameResult?.rewardType === 'QUEUE_SKIP' ? 'jackpot' : 'win'}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );

  if (typeof window === 'undefined') return null;
  return ReactDOM.createPortal(content, document.body);
}
