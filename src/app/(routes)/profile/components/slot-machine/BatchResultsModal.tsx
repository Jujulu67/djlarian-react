'use client';

import { X } from 'lucide-react';
import type { Dispatch, SetStateAction } from 'react';
import type { BatchSpinResult } from '@/types/slot-machine';

interface BatchResultsModalProps {
  batchResult: BatchSpinResult;
  setBatchResult: Dispatch<SetStateAction<BatchSpinResult | null>>;
}

export function BatchResultsModal({ batchResult, setBatchResult }: BatchResultsModalProps) {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-gradient-to-b from-slate-800 to-slate-900 border border-purple-500/30 rounded-xl max-w-md w-full shadow-2xl relative flex flex-col max-h-[85vh]">
        <div className="p-4 border-b border-white/10 flex justify-between items-center bg-slate-800/50 rounded-t-xl">
          <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
            Résultats (10 spins)
          </h3>
          <button
            onClick={() => setBatchResult(null)}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 bg-purple-500/10 border-b border-purple-500/20">
          <div className="flex justify-between items-end mb-2">
            <span className="text-sm text-slate-400">Total Gagné</span>
            <span className="text-3xl font-bold text-yellow-500 drop-shadow-md">
              {batchResult.summary.totalTokensWon} 🪙
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs bg-black/20 p-2 rounded-lg">
            <div className="flex flex-col items-center">
              <span className="text-slate-500">Coût</span>
              <span className="font-mono">{batchResult.summary.totalSpins * 3}</span>
            </div>
            <div className="flex flex-col items-center border-l border-white/10 border-r">
              <span className="text-slate-500">Win Rate</span>
              <span className="font-mono text-blue-300">{batchResult.summary.winRate}%</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-slate-500">Net</span>
              <span
                className={`font-mono font-bold ${batchResult.summary.netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}
              >
                {batchResult.summary.netProfit > 0 ? '+' : ''}
                {batchResult.summary.netProfit}
              </span>
            </div>
          </div>
        </div>

        <div className="overflow-y-auto p-4 space-y-2 flex-grow custom-scrollbar">
          {batchResult.results.map((res, idx) => (
            <div
              key={idx}
              className={`flex justify-between items-center p-2 rounded-lg border ${
                res.isWin
                  ? 'bg-purple-500/20 border-purple-500/30'
                  : 'bg-slate-800/50 border-white/5'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-500 font-mono w-4">{idx + 1}</span>
                <div className="text-2xl tracking-widest bg-black/30 px-2 rounded">
                  {res.symbols.join(' ')}
                </div>
              </div>
              <div className="text-right">
                {res.isWin ? (
                  <div className="flex flex-col items-end">
                    <span className="font-bold text-yellow-400 text-sm">
                      {res.rewardType === 'TOKENS' ? `+${res.rewardAmount}` : res.rewardType}
                    </span>
                    {/* Show bonus tokens if applicable (though backend includes it in total, nice to visualize) */}
                    {(res.rewardType === 'QUEUE_SKIP' || res.rewardType === 'ETERNAL_TICKET') && (
                      <span className="text-[10px] text-yellow-200/70">+Bonus 🪙</span>
                    )}
                  </div>
                ) : (
                  <span className="text-slate-600 text-xs">-</span>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-white/10 text-center">
          <button
            onClick={() => setBatchResult(null)}
            className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 px-4 rounded-lg transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
