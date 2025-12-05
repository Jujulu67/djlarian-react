'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, HelpCircle, Coins, RefreshCw } from 'lucide-react';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { SlotMachineSelectionDialog } from './SlotMachineSelectionDialog';
import { SlotMachine } from './SlotMachine';
import { ModernSlotMachine } from './ModernSlotMachine';
import { RouletteDialog } from './RouletteDialog';
import { ScratchCardDialog } from './ScratchCardDialog';
import { MysteryGameDialog } from './MysteryGameDialog';
import { GameRulesModal } from './GameRulesModal';
import { useSlotMachine } from '../hooks/useSlotMachine';
import { useMiniGame } from '../hooks/useMiniGame';

interface EasterEggMapDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function EasterEggMapDialog({ isOpen, onClose }: EasterEggMapDialogProps) {
  const [selectedGame, setSelectedGame] = useState<string | null>(null);
  const [showRules, setShowRules] = useState(false);

  // Game states
  const [showSlotMachineSelection, setShowSlotMachineSelection] = useState(false);
  const [showRoulette, setShowRoulette] = useState(false);
  const [showScratchCard, setShowScratchCard] = useState(false);
  const [showMysteryGame, setShowMysteryGame] = useState(false);

  const { status, refreshStatus } = useSlotMachine();
  const { resetTokens, isLoading: isResetting } = useMiniGame(refreshStatus);

  useEffect(() => {
    if (isOpen) {
      refreshStatus();
    }
  }, [isOpen, refreshStatus]);

  if (!isOpen) return null;

  const handleGameSelect = (game: string) => {
    // Don't set selectedGame immediately for casino, as it has a sub-selection
    switch (game) {
      case 'casino':
        setShowSlotMachineSelection(true);
        break;
      case 'roulette':
        setShowRoulette(true);
        break;
      case 'scratch':
        setShowScratchCard(true);
        break;
      case 'mystery':
        setShowMysteryGame(true);
        break;
    }
  };

  const handleSlotMachineVersionSelect = (version: 'retro' | 'modern') => {
    setShowSlotMachineSelection(false);
    if (version === 'retro') {
      setSelectedGame('retro_slot');
    } else {
      setSelectedGame('modern_slot');
    }
  };
  const content = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/90 backdrop-blur-md"
        >
          {/* Close Button */}
          <div className="absolute top-6 right-6 z-50 flex items-center gap-3">
            {/* Tokens Display */}
            <div className="px-4 py-2 bg-black/60 backdrop-blur-md border border-purple-500/30 rounded-full flex items-center gap-2 text-white">
              <Coins className="w-4 h-4 text-yellow-400" />
              <span className="font-audiowide">{status?.tokens ?? 0}</span>
            </div>

            {/* Reset Tokens Button (Admin/Test) */}
            <button
              onClick={resetTokens}
              disabled={isResetting}
              className="p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors disabled:opacity-50"
              title="Réinitialiser les jetons (Admin)"
            >
              <RefreshCw size={24} className={isResetting ? 'animate-spin' : ''} />
            </button>

            {/* Rules Button */}
            <button
              onClick={() => setShowRules(true)}
              className="p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
              title="Règles du jeu"
            >
              <HelpCircle size={24} />
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          {/* Map Container */}
          <div className="relative w-full h-full max-w-6xl max-h-[90vh] mx-4 overflow-hidden rounded-3xl shadow-2xl border border-white/10 bg-[#0a0a0a]">
            {/* Background Map */}
            <div className="absolute inset-0">
              <Image
                src="/assets/easter-egg/map-bg.png"
                alt="World Map"
                fill
                className="object-cover"
                priority
              />
              {/* Overlay for atmosphere */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 pointer-events-none" />
            </div>

            {/* Title */}
            <div className="absolute top-8 left-0 right-0 text-center pointer-events-none">
              <h2 className="text-4xl md:text-6xl font-audiowide text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]">
                LE MONDE PERDU
              </h2>
              <p className="text-purple-200 mt-2 font-audiowide text-lg opacity-80">
                Choisissez votre destin
              </p>
            </div>

            {/* Interactive Points */}
            <div className="absolute inset-0 pointer-events-none">
              {/* Ticket Chance - Top Center */}
              <MapPoint
                x={41}
                y={25}
                label="Ticket Chance"
                icon="/assets/easter-egg/scratch-icon.png"
                onClick={() => handleGameSelect('scratch')}
                delay={0.6}
              />

              {/* Casino / Slot Machine - Left */}
              <MapPoint
                x={19}
                y={42}
                label="Casino Royal"
                icon="/assets/easter-egg/casino-icon.png"
                onClick={() => handleGameSelect('casino')}
                delay={0.2}
              />

              {/* Roulette - Right */}
              <MapPoint
                x={68}
                y={38}
                label="La Grande Roue"
                icon="/assets/easter-egg/roulette-icon.png"
                onClick={() => handleGameSelect('roulette')}
                delay={0.4}
              />

              {/* Mystery Game - Bottom Center */}
              <MapPoint
                x={44}
                y={58}
                label="???"
                icon="/assets/easter-egg/mystery-icon.png"
                onClick={() => handleGameSelect('mystery')}
                delay={0.8}
                isMystery
              />
            </div>
          </div>

          {/* Game Modals */}
          <SlotMachineSelectionDialog
            isOpen={showSlotMachineSelection}
            onClose={() => setShowSlotMachineSelection(false)}
            onSelect={handleSlotMachineVersionSelect}
          />

          <SlotMachine
            isOpen={selectedGame === 'retro_slot'}
            onClose={() => setSelectedGame(null)}
          />
          <ModernSlotMachine
            isOpen={selectedGame === 'modern_slot'}
            onClose={() => setSelectedGame(null)}
          />

          <RouletteDialog
            isOpen={showRoulette}
            onClose={() => setShowRoulette(false)}
            onTokenUpdate={refreshStatus}
          />
          <ScratchCardDialog
            isOpen={showScratchCard}
            onClose={() => setShowScratchCard(false)}
            onTokenUpdate={refreshStatus}
          />
          <MysteryGameDialog
            isOpen={showMysteryGame}
            onClose={() => setShowMysteryGame(false)}
            onTokenUpdate={refreshStatus}
          />

          <GameRulesModal isOpen={showRules} onClose={() => setShowRules(false)} />
        </motion.div>
      )}
    </AnimatePresence>
  );

  if (typeof window === 'undefined') return null;
  return ReactDOM.createPortal(content, document.body);
}

interface MapPointProps {
  x: number; // Percentage
  y: number; // Percentage
  label: string;
  icon: string;
  onClick: () => void;
  delay: number;
  isMystery?: boolean;
}

function MapPoint({ x, y, label, icon, onClick, delay, isMystery }: MapPointProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0, y: 50 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ delay, type: 'spring', stiffness: 200, damping: 15 }}
      className="absolute pointer-events-auto cursor-pointer group"
      style={{ left: `${x}%`, top: `${y}%` }}
      onClick={onClick}
    >
      <div className="relative flex flex-col items-center">
        {/* Hover Glow */}
        <div
          className={`absolute inset-0 bg-white/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${isMystery ? 'bg-purple-500/40' : ''}`}
        />

        {/* Icon */}
        <motion.div
          whileHover={{ scale: 1.1, y: -10 }}
          whileTap={{ scale: 0.95 }}
          className="relative w-24 h-24 md:w-32 md:h-32 drop-shadow-2xl"
        >
          <Image src={icon} alt={label} fill className="object-contain" />
        </motion.div>

        {/* Label */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: delay + 0.5 }}
          className="mt-2 px-4 py-1 bg-black/60 backdrop-blur-sm border border-white/10 rounded-full"
        >
          <span
            className={`text-sm md:text-base font-bold ${isMystery ? 'text-purple-300' : 'text-white'} font-audiowide whitespace-nowrap`}
          >
            {label}
          </span>
        </motion.div>
      </div>
    </motion.div>
  );
}
