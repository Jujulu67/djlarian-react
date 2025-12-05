'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Eraser, Coins, Trophy, Sparkles } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useMiniGame, GameResult } from '../hooks/useMiniGame';

interface ScratchCardDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onTokenUpdate?: () => Promise<void>;
}

export function ScratchCardDialog({ isOpen, onClose, onTokenUpdate }: ScratchCardDialogProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const [prize, setPrize] = useState<string>('');
  const [isCanvasReady, setIsCanvasReady] = useState(false);
  const [gameResult, setGameResult] = useState<GameResult | null>(null);
  const [hasBoughtTicket, setHasBoughtTicket] = useState(false);

  const { play, isLoading } = useMiniGame(onTokenUpdate);

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setHasBoughtTicket(false);
      setGameResult(null);
      setIsRevealed(false);
      setIsCanvasReady(false);
    }
  }, [isOpen]);

  const buyTicket = async () => {
    if (isLoading) return;

    const result = await play('scratch');
    if (result) {
      setGameResult(result);
      setHasBoughtTicket(true);

      // Determine prize text to hide under scratch layer
      if (result.isWin) {
        if (result.rewardType === 'TOKENS') {
          setPrize(`${result.rewardAmount} JETONS`);
        } else if (result.rewardType === 'QUEUE_SKIP') {
          setPrize('QUEUE SKIP');
        } else {
          setPrize('TICKET ÉTERNEL');
        }
      } else {
        setPrize('PERDU');
      }

      // Initialize canvas
      setTimeout(initCanvas, 100);
    }
  };

  const initCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    // Try to load the overlay image
    const img = new Image();
    img.src = '/assets/easter-egg/scratch-overlay.png';

    img.onload = () => {
      const pattern = ctx.createPattern(img, 'repeat');
      if (pattern) {
        ctx.fillStyle = pattern;
      } else {
        ctx.fillStyle = '#C0C0C0';
      }
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      setIsCanvasReady(true);
    };

    img.onerror = () => {
      // Fallback to silver color
      ctx.fillStyle = '#C0C0C0';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      setIsCanvasReady(true);

      // Add some noise/texture manually if image fails
      for (let i = 0; i < 500; i++) {
        ctx.fillStyle = Math.random() > 0.5 ? '#A0A0A0' : '#E0E0E0';
        ctx.fillRect(Math.random() * canvas.width, Math.random() * canvas.height, 2, 2);
      }
    };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isRevealed) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Scratch effect (erase)
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x, y, 20, 0, Math.PI * 2);
    ctx.fill();

    checkReveal();
  };

  const checkReveal = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Simple check: count transparent pixels
    // In a real app, optimize this (don't check every frame)
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let transparentPixels = 0;
    for (let i = 3; i < imageData.data.length; i += 4) {
      if (imageData.data[i] === 0) transparentPixels++;
    }

    if (transparentPixels > canvas.width * canvas.height * 0.5) {
      setIsRevealed(true);
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
          <div className="relative w-full max-w-md p-8 flex flex-col items-center">
            <button
              onClick={onClose}
              className="absolute top-0 right-0 p-2 text-white/50 hover:text-white transition-colors"
            >
              <X size={32} />
            </button>

            <h2 className="text-4xl font-audiowide text-white mb-8 text-center">Ticket Chance</h2>

            {!hasBoughtTicket ? (
              <div className="flex flex-col items-center gap-6">
                <div className="relative w-80 h-48 bg-gradient-to-br from-yellow-100 to-yellow-300 rounded-xl shadow-2xl flex items-center justify-center border-4 border-white/20">
                  <div className="text-center">
                    <Sparkles className="w-12 h-12 text-yellow-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-yellow-800 font-audiowide">
                      LUCKY SCRATCH
                    </div>
                  </div>
                </div>

                <button
                  onClick={buyTicket}
                  disabled={isLoading}
                  className="px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-500 hover:to-blue-700 text-white font-bold rounded-full text-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3 shadow-lg shadow-blue-900/50"
                >
                  {isLoading ? (
                    <span className="animate-pulse">Achat en cours...</span>
                  ) : (
                    <>
                      <div className="flex flex-col items-start">
                        <span className="text-lg leading-none">Acheter un ticket</span>
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
                <div className="relative w-80 h-48 bg-white rounded-xl overflow-hidden shadow-2xl mb-6">
                  {/* Prize Layer (Underneath) */}
                  <div
                    className={`absolute inset-0 flex items-center justify-center bg-gradient-to-br from-yellow-100 to-yellow-300 transition-opacity duration-300 ${isCanvasReady ? 'opacity-100' : 'opacity-0'}`}
                  >
                    <span
                      className={`text-4xl font-bold font-audiowide ${gameResult?.isWin ? 'text-green-600' : 'text-gray-500'}`}
                    >
                      {prize}
                    </span>
                  </div>

                  {/* Scratch Layer (Canvas) */}
                  <canvas
                    ref={canvasRef}
                    className={`absolute inset-0 w-full h-full cursor-crosshair transition-opacity duration-1000 ${isRevealed ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
                    onMouseMove={(e) => {
                      if (e.buttons === 1) handleMouseMove(e);
                    }}
                    onTouchMove={(e) => {
                      // Handle touch for mobile
                    }}
                  />
                </div>

                <div className="text-white/70 text-center h-12">
                  {!isRevealed ? (
                    <p className="flex items-center justify-center gap-2 animate-pulse">
                      <Eraser size={20} />
                      Grattez pour révéler votre gain !
                    </p>
                  ) : (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="flex flex-col items-center"
                    >
                      <div className="text-xl font-bold text-white mb-2">{gameResult?.message}</div>
                      <button
                        onClick={() => setHasBoughtTicket(false)}
                        className="text-sm text-blue-400 hover:text-blue-300 underline"
                      >
                        Acheter un autre ticket
                      </button>
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
