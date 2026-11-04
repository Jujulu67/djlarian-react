'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Info, Coins, Trophy, HelpCircle } from 'lucide-react';
import ReactDOM from 'react-dom';
import { useState } from 'react';

interface GameRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GameRulesModal({ isOpen, onClose }: GameRulesModalProps) {
  const [activeTab, setActiveTab] = useState<'casino' | 'roulette' | 'scratch' | 'mystery'>(
    'casino'
  );

  if (!isOpen) return null;

  const content = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-2xl mx-4 bg-[#1a1b26] border border-purple-500/30 rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-6 border-b border-white/10 bg-gradient-to-r from-purple-900/50 to-blue-900/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <Info className="w-6 h-6 text-purple-400" />
                </div>
                <h2 className="text-2xl font-audiowide text-white">Règles du Jeu</h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-white/10 overflow-x-auto">
              <button
                onClick={() => setActiveTab('casino')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
                  activeTab === 'casino'
                    ? 'text-purple-400 border-b-2 border-purple-400 bg-purple-500/10'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                🎰 Casino Royal
              </button>
              <button
                onClick={() => setActiveTab('roulette')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
                  activeTab === 'roulette'
                    ? 'text-yellow-400 border-b-2 border-yellow-400 bg-yellow-500/10'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                🎡 La Grande Roue
              </button>
              <button
                onClick={() => setActiveTab('scratch')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
                  activeTab === 'scratch'
                    ? 'text-blue-400 border-b-2 border-blue-400 bg-blue-500/10'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                🎫 Ticket Chance
              </button>
              <button
                onClick={() => setActiveTab('mystery')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
                  activeTab === 'mystery'
                    ? 'text-pink-400 border-b-2 border-pink-400 bg-pink-500/10'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                🔮 Vide-Grenier
              </button>
            </div>

            {/* Content */}
            <div className="p-6 min-h-[300px]">
              <AnimatePresence mode="wait">
                {activeTab === 'casino' && (
                  <motion.div
                    key="casino"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4"
                  >
                    <div className="flex items-start gap-4 p-4 bg-purple-500/5 rounded-xl border border-purple-500/10">
                      <Coins className="w-8 h-8 text-purple-400 shrink-0" />
                      <div>
                        <h3 className="text-lg font-bold text-white mb-1">Coût : 3 Jetons</h3>
                        <p className="text-gray-400 text-sm">Alignez les symboles pour gagner.</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-semibold text-white flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-yellow-400" /> Gains Possibles
                      </h4>
                      <ul className="space-y-2 text-sm text-gray-300">
                        <li className="flex items-center gap-2">
                          <span className="text-xl">⚡</span>
                          <span>
                            <strong>Super Jackpot (0.05%)</strong> : Queue Skip (Valeur ~500 jetons)
                          </span>
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="text-xl">🎫</span>
                          <span>
                            <strong>Jackpot (0.5%)</strong> : Ticket Éternel (Valeur ~50 jetons)
                          </span>
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="text-xl">🍒</span>
                          <span>
                            <strong>Triple</strong> : 20 Jetons
                          </span>
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="text-xl">🍋</span>
                          <span>
                            <strong>Double</strong> : 5 Jetons
                          </span>
                        </li>
                      </ul>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'roulette' && (
                  <motion.div
                    key="roulette"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4"
                  >
                    <div className="flex items-start gap-4 p-4 bg-yellow-500/5 rounded-xl border border-yellow-500/10">
                      <Coins className="w-8 h-8 text-yellow-400 shrink-0" />
                      <div>
                        <h3 className="text-lg font-bold text-white mb-1">Coût : 10 Jetons</h3>
                        <p className="text-gray-400 text-sm">Mise unique, gains multiples.</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-semibold text-white flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-yellow-400" /> Récompenses
                      </h4>
                      <ul className="space-y-2 text-sm text-gray-300 mt-2">
                        <li>
                          • <strong>Super Jackpot (0.1%)</strong> : Queue Skip !
                        </li>
                        <li>
                          • <strong>Jackpot (1%)</strong> : Ticket Éternel.
                        </li>
                        <li>
                          • <strong>Gros Lot (5%)</strong> : 50 Jetons.
                        </li>
                        <li>
                          • <strong>Gain Moyen (20%)</strong> : 15 Jetons.
                        </li>
                      </ul>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'scratch' && (
                  <motion.div
                    key="scratch"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4"
                  >
                    <div className="flex items-start gap-4 p-4 bg-blue-500/5 rounded-xl border border-blue-500/10">
                      <Coins className="w-8 h-8 text-blue-400 shrink-0" />
                      <div>
                        <h3 className="text-lg font-bold text-white mb-1">Coût : 10 Jetons</h3>
                        <p className="text-gray-400 text-sm">Grattez pour révéler votre destin.</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-semibold text-white flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-yellow-400" /> Lots
                      </h4>
                      <ul className="space-y-2 text-sm text-gray-300 mt-2">
                        <li>
                          • <strong>Super Jackpot (0.1%)</strong> : Queue Skip.
                        </li>
                        <li>
                          • <strong>Jackpot (1%)</strong> : Ticket Éternel.
                        </li>
                        <li>
                          • <strong>Gros Lot (5%)</strong> : 50 Jetons.
                        </li>
                        <li>
                          • <strong>Gain Standard (20%)</strong> : 15 Jetons.
                        </li>
                      </ul>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'mystery' && (
                  <motion.div
                    key="mystery"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4"
                  >
                    <div className="flex items-start gap-4 p-4 bg-pink-500/5 rounded-xl border border-pink-500/10">
                      <Coins className="w-8 h-8 text-pink-400 shrink-0" />
                      <div>
                        <h3 className="text-lg font-bold text-white mb-1">Coût : 10 Jetons</h3>
                        <p className="text-gray-400 text-sm">Ouvrez le coffre mystère.</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-semibold text-white flex items-center gap-2">
                        <HelpCircle className="w-4 h-4 text-pink-400" /> Trésors
                      </h4>
                      <ul className="space-y-2 text-sm text-gray-300 mt-2">
                        <li>
                          • <strong>Super Jackpot (0.1%)</strong> : Queue Skip.
                        </li>
                        <li>
                          • <strong>Jackpot (1%)</strong> : Ticket Éternel.
                        </li>
                        <li>
                          • <strong>Trésor (5%)</strong> : 50 Jetons.
                        </li>
                        <li>
                          • <strong>Bourse (20%)</strong> : 15 Jetons.
                        </li>
                      </ul>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  if (typeof window === 'undefined') return null;
  return ReactDOM.createPortal(content, document.body);
}
