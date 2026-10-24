'use client';

import { X } from 'lucide-react';
import type { Dispatch, SetStateAction } from 'react';

interface PayoutTableModalProps {
  setShowPayoutTable: Dispatch<SetStateAction<boolean>>;
}

export function PayoutTableModal({ setShowPayoutTable }: PayoutTableModalProps) {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-gradient-to-b from-slate-800 to-slate-900 border border-yellow-500/30 rounded-2xl p-6 max-w-lg w-full shadow-2xl relative">
        <button
          onClick={() => setShowPayoutTable(false)}
          className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full bg-slate-700 hover:bg-red-500 text-slate-300 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 mb-6 text-center uppercase tracking-wider">
          🎰 Tableau des Gains
        </h3>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
          {/* JACKPOTS */}
          <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 p-4 rounded-xl border border-yellow-500/30">
            <div className="text-xs text-yellow-300 uppercase tracking-wider mb-3 font-bold">
              JACKPOTS LÉGENDAIRES
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">7️⃣7️⃣7️⃣</span>
                  <span className="text-yellow-400 font-bold">QUEUE SKIP</span>
                </div>
                <span className="text-xs text-slate-400">0.00002%</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">⭐⭐⭐</span>
                  <span className="text-purple-400 font-bold">TICKET ÉTERNEL</span>
                </div>
                <span className="text-xs text-slate-400">0.006%</span>
              </div>
            </div>
          </div>

          {/* TRIPLES */}
          <div className="bg-slate-800/50 p-4 rounded-xl border border-purple-500/20">
            <div className="text-xs text-purple-300 uppercase tracking-wider mb-3 font-bold">
              TRIPLES (x3)
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center py-1">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🔔</span>
                  <span className="text-slate-300">Cloche</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-yellow-400 font-bold">+200</span>
                  <span className="text-xs text-slate-500 w-16 text-right">0.06%</span>
                </div>
              </div>
              <div className="flex justify-between items-center py-1">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🫐</span>
                  <span className="text-slate-300">Prune</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-yellow-400 font-bold">+100</span>
                  <span className="text-xs text-slate-500 w-16 text-right">0.14%</span>
                </div>
              </div>
              <div className="flex justify-between items-center py-1">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🍊</span>
                  <span className="text-slate-300">Orange</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-yellow-400 font-bold">+50</span>
                  <span className="text-xs text-slate-500 w-16 text-right">0.28%</span>
                </div>
              </div>
              <div className="flex justify-between items-center py-1">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🍋</span>
                  <span className="text-slate-300">Citron</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-yellow-400 font-bold">+25</span>
                  <span className="text-xs text-slate-500 w-16 text-right">0.56%</span>
                </div>
              </div>
              <div className="flex justify-between items-center py-1">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🍒</span>
                  <span className="text-slate-300">Cerise</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-yellow-400 font-bold">+15</span>
                  <span className="text-xs text-slate-500 w-16 text-right">1.06%</span>
                </div>
              </div>
            </div>
          </div>

          {/* DOUBLES */}
          <div className="bg-slate-800/30 p-4 rounded-xl border border-slate-600/20">
            <div className="text-xs text-slate-400 uppercase tracking-wider mb-3 font-bold">
              DOUBLES (x2)
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex justify-between">
                <span>7️⃣7️⃣</span>
                <span className="text-green-400">+50</span>
              </div>
              <div className="flex justify-between">
                <span>⭐⭐</span>
                <span className="text-green-400">+30</span>
              </div>
              <div className="flex justify-between">
                <span>🔔🔔</span>
                <span className="text-green-400">+15</span>
              </div>
              <div className="flex justify-between">
                <span>🫐🫐</span>
                <span className="text-green-400">+8</span>
              </div>
              <div className="flex justify-between">
                <span>🍊🍊</span>
                <span className="text-blue-400">+3</span>
              </div>
              <div className="flex justify-between">
                <span>🍋🍋</span>
                <span className="text-slate-400">+2</span>
              </div>
              <div className="flex justify-between">
                <span>🍒🍒</span>
                <span className="text-slate-400">+1</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Stats */}
        <div className="mt-4 pt-4 border-t border-white/10 text-center text-xs text-slate-500">
          <span>
            Coût: <span className="text-white">3 jetons/spin</span>
          </span>
        </div>
      </div>
    </div>
  );
}
