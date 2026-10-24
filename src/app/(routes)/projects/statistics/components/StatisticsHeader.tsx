'use client';

import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import type { Dispatch, SetStateAction } from 'react';

import { type StatisticsData, type YearViewMode } from '../types';

interface StatisticsHeaderProps {
  statistics: StatisticsData;
  yearViewMode: YearViewMode;
  setYearViewMode: Dispatch<SetStateAction<YearViewMode>>;
  selectedYear: number;
  setSelectedYear: Dispatch<SetStateAction<number>>;
  availableYears: number[];
}

export function StatisticsHeader({
  statistics,
  yearViewMode,
  setYearViewMode,
  selectedYear,
  setSelectedYear,
  availableYears,
}: StatisticsHeaderProps) {
  return (
    <div className="flex items-center justify-between flex-wrap gap-4">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Statistiques des Projets</h1>
        <p className="text-gray-400">Vue d'ensemble de vos projets musicaux</p>
      </div>
      <div className="flex items-center gap-4">
        {/* Sélecteur d'année - à gauche du bouton retour */}
        {statistics && statistics.projectsByYear.length > 0 && (
          <div className="flex items-center gap-2">
            {/* Sélecteur de date (flèches) - à gauche */}
            <div
              className={`flex items-center gap-2 transition-opacity ${yearViewMode === 'year' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            >
              <button
                onClick={() => {
                  const currentIndex = availableYears.indexOf(selectedYear);
                  if (currentIndex < availableYears.length - 1) {
                    setSelectedYear(availableYears[currentIndex + 1]); // Année plus ancienne (vers la fin du tableau)
                  }
                }}
                disabled={availableYears.indexOf(selectedYear) >= availableYears.length - 1}
                className="p-2 rounded-lg bg-gray-700/50 hover:bg-gray-700/70 border border-gray-600/50 hover:border-purple-500/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Année précédente"
              >
                <ChevronLeft className="w-5 h-5 text-gray-300" />
              </button>
              <div className="px-4 py-2 bg-gray-800/70 rounded-lg border border-gray-700/50 min-w-[80px] text-center">
                <span className="text-lg font-semibold text-white">{selectedYear}</span>
              </div>
              <button
                onClick={() => {
                  const currentIndex = availableYears.indexOf(selectedYear);
                  if (currentIndex > 0) {
                    setSelectedYear(availableYears[currentIndex - 1]); // Année plus récente (vers le début du tableau)
                  }
                }}
                disabled={availableYears.indexOf(selectedYear) <= 0}
                className="p-2 rounded-lg bg-gray-700/50 hover:bg-gray-700/70 border border-gray-600/50 hover:border-purple-500/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Année suivante"
              >
                <ChevronRight className="w-5 h-5 text-gray-300" />
              </button>
            </div>
            {/* Bouton toggle Global/Année */}
            <button
              onClick={() => setYearViewMode(yearViewMode === 'global' ? 'year' : 'global')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                yearViewMode === 'global'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50'
              }`}
            >
              {yearViewMode === 'global' ? 'Global' : 'Année'}
            </button>
          </div>
        )}
        <Link
          href="/projects"
          className="px-4 py-2 bg-gray-700/50 hover:bg-gray-600/50 text-white rounded-lg transition-colors flex items-center gap-2"
        >
          <ArrowLeft size={18} />
          Retour
        </Link>
      </div>
    </div>
  );
}
