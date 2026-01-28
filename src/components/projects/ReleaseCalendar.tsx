'use client';

import {
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Pencil,
} from 'lucide-react';
import { useState, useMemo } from 'react';
import { startOfYear, format, addWeeks, startOfWeek, isWithinInterval, addDays } from 'date-fns';
import { fr } from 'date-fns/locale';

import { Project } from './types';

interface ReleaseCalendarProps {
  projects: Project[];
  onUpdate?: (id: string, field: string, value: string | number | null) => Promise<void>;
}

interface WeekData {
  weekNumber: number;
  weekLabel: string;
  startDate: Date;
  dateLabel: string;
  projects: Project[];
  quarter: number;
}

export const ReleaseCalendar = ({ projects, onUpdate }: ReleaseCalendarProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null);
  const [linkValue, setLinkValue] = useState<string>('');

  const handleSaveLink = async () => {
    if (editingLinkId && onUpdate) {
      try {
        await onUpdate(editingLinkId, 'externalLink', linkValue || null);
        setEditingLinkId(null);
        setLinkValue('');
      } catch (error) {
        console.error('Erreur lors de la sauvegarde du lien:', error);
      }
    }
  };

  // Calculer les semaines de l'année sélectionnée
  const weeks = useMemo(() => {
    const januaryFirst = new Date(selectedYear, 0, 1);

    // Trouver le premier lundi de l'année (début de semaine = lundi)
    let firstMonday = startOfWeek(januaryFirst, { weekStartsOn: 1 });

    // Si le lundi trouvé est avant le 1er janvier (dans l'année précédente), prendre le lundi suivant
    if (firstMonday < januaryFirst) {
      firstMonday = addWeeks(firstMonday, 1);
    }

    const weeksData: WeekData[] = [];

    for (let week = 1; week <= 52; week++) {
      const weekStart = addWeeks(firstMonday, week - 1);
      const weekEnd = addWeeks(weekStart, 1);
      // Calculer le vendredi de la semaine (4 jours après le lundi)
      const friday = addDays(weekStart, 4);

      // Déterminer le trimestre (1-4)
      let quarter = 1;
      if (week >= 14 && week <= 26) quarter = 2;
      else if (week >= 27 && week <= 39) quarter = 3;
      else if (week >= 40) quarter = 4;

      // Trouver les projets avec une date de sortie dans cette semaine
      const weekProjects = projects.filter((project) => {
        if (!project.releaseDate) return false;

        const releaseDate = new Date(project.releaseDate);
        releaseDate.setHours(0, 0, 0, 0);

        // Vérifier si la date de sortie est dans cette semaine
        return isWithinInterval(releaseDate, {
          start: weekStart,
          end: weekEnd,
        });
      });

      weeksData.push({
        weekNumber: week,
        weekLabel: `S${week}`,
        startDate: weekStart,
        dateLabel: format(friday, 'dd/MM', { locale: fr }),
        projects: weekProjects,
        quarter,
      });
    }

    return weeksData;
  }, [projects, selectedYear]);

  // Grouper par trimestre pour l'affichage
  const quarters = useMemo(() => {
    return [
      { number: 1, weeks: weeks.filter((w) => w.quarter === 1), color: 'bg-yellow-500/20' },
      { number: 2, weeks: weeks.filter((w) => w.quarter === 2), color: 'bg-red-500/20' },
      { number: 3, weeks: weeks.filter((w) => w.quarter === 3), color: 'bg-blue-500/20' },
      { number: 4, weeks: weeks.filter((w) => w.quarter === 4), color: 'bg-green-500/20' },
    ];
  }, [weeks]);

  return (
    <div className="bg-gray-800/30 backdrop-blur-md border border-gray-700/50 rounded-2xl shadow-xl overflow-hidden">
      {/* Header dépliable */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 sm:px-6 py-4 flex items-center justify-between text-left hover:bg-gray-700/30 transition-colors"
        aria-expanded={isOpen}
        aria-label={isOpen ? 'Fermer le calendrier' : 'Ouvrir le calendrier'}
      >
        <div>
          <h2 className="text-lg font-semibold text-white">Calendrier des sorties</h2>
          <p className="text-sm text-gray-400 mt-1">
            Vue hebdomadaire des projets par date de sortie
          </p>
        </div>
        <div className="flex-shrink-0 ml-4">
          {isOpen ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </div>
      </button>

      {/* Contenu du calendrier */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isOpen ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="px-4 sm:px-6 pb-4 sm:pb-6">
          {/* Contrôles de navigation d'année */}
          <div className="flex items-center justify-center gap-4 mb-6 mt-4">
            <button
              onClick={() => setSelectedYear(selectedYear - 1)}
              className="p-2 rounded-lg bg-gray-700/50 hover:bg-gray-700/70 border border-gray-600/50 hover:border-purple-500/50 transition-colors"
              aria-label="Année précédente"
            >
              <ChevronLeft className="w-5 h-5 text-gray-300" />
            </button>
            <div className="px-4 py-2 bg-gray-800/70 rounded-lg border border-gray-700/50">
              <span className="text-lg font-semibold text-white">{selectedYear}</span>
            </div>
            <button
              onClick={() => setSelectedYear(selectedYear + 1)}
              className="p-2 rounded-lg bg-gray-700/50 hover:bg-gray-700/70 border border-gray-600/50 hover:border-purple-500/50 transition-colors"
              aria-label="Année suivante"
            >
              <ChevronRight className="w-5 h-5 text-gray-300" />
            </button>
          </div>

          {/* Grille horizontale : 4 colonnes (trimestres) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4">
            {quarters.map((quarter) => (
              <div key={quarter.number} className="space-y-2">
                {/* En-tête du trimestre */}
                <div className={`${quarter.color} rounded-lg px-3 py-2 border border-gray-700/50`}>
                  <h3 className="text-sm font-medium text-white text-center">
                    T{quarter.number} ({quarter.weeks[0]?.weekLabel} -{' '}
                    {quarter.weeks[quarter.weeks.length - 1]?.weekLabel})
                  </h3>
                </div>

                {/* Grille des semaines */}
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-gray-700/50">
                        <th className="text-left py-2 px-2 text-xs font-medium text-gray-400 uppercase tracking-wider">
                          Sem
                        </th>
                        <th className="text-left py-2 px-2 text-xs font-medium text-gray-400 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="text-left py-2 px-2 text-xs font-medium text-gray-400 uppercase tracking-wider">
                          Titre
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {quarter.weeks.map((week) => (
                        <tr
                          key={week.weekNumber}
                          className={`border-b border-gray-700/30 hover:bg-gray-700/20 transition-colors ${
                            week.quarter === 1
                              ? 'bg-yellow-500/10'
                              : week.quarter === 2
                                ? 'bg-red-500/10'
                                : week.quarter === 3
                                  ? 'bg-blue-500/10'
                                  : 'bg-green-500/10'
                          }`}
                        >
                          <td className="py-2 px-2">
                            <span className="text-xs font-medium text-white">{week.weekLabel}</span>
                          </td>
                          <td className="py-2 px-2">
                            <span className="text-xs text-gray-300">{week.dateLabel}</span>
                          </td>
                          <td className="py-2 px-2">
                            {week.projects.length > 0 ? (
                              <div className="flex flex-col gap-1.5">
                                {week.projects.map((project) => (
                                  <div key={project.id} className="flex items-center gap-1.5 group">
                                    <span className="text-xs text-white font-medium flex-1 min-w-0 truncate">
                                      {project.name}
                                    </span>
                                    <div className="flex items-center gap-1">
                                      <div className="relative group/link">
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (project.externalLink) {
                                              window.open(
                                                project.externalLink,
                                                '_blank',
                                                'noopener,noreferrer'
                                              );
                                            } else if (onUpdate) {
                                              setEditingLinkId(project.id);
                                              setLinkValue('');
                                            }
                                          }}
                                          className={`p-1 rounded transition-all ${
                                            project.externalLink
                                              ? 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10'
                                              : 'text-gray-400 hover:text-gray-300 hover:bg-gray-500/10'
                                          }`}
                                          title={
                                            project.externalLink
                                              ? `Ouvrir: ${project.externalLink}`
                                              : 'Ajouter un lien'
                                          }
                                          aria-label={
                                            project.externalLink
                                              ? `Ouvrir le lien externe pour ${project.name}`
                                              : `Ajouter un lien pour ${project.name}`
                                          }
                                        >
                                          <ExternalLink size={12} aria-hidden="true" />
                                        </button>
                                        {project.externalLink && onUpdate && (
                                          <button
                                            onClick={(e) => {
                                              e.preventDefault();
                                              e.stopPropagation();
                                              setEditingLinkId(project.id);
                                              setLinkValue(project.externalLink || '');
                                            }}
                                            className="absolute -top-0.5 -right-0.5 p-0.5 bg-purple-600 hover:bg-purple-700 text-white rounded-full opacity-0 group-hover/link:opacity-100 transition-opacity shadow-lg z-10"
                                            title="Modifier le lien"
                                            aria-label={`Modifier le lien pour ${project.name}`}
                                          >
                                            <Pencil size={8} aria-hidden="true" />
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-xs text-gray-500">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modale pour éditer le lien */}
      {editingLinkId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setEditingLinkId(null);
              setLinkValue('');
            }
          }}
        >
          <div className="bg-gradient-to-br from-[#1a0f2a] via-[#0c0117] to-[#1a0f2a] border border-purple-500/30 rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-white mb-4">Modifier le lien</h3>
            <input
              type="url"
              value={linkValue}
              onChange={(e) => setLinkValue(e.target.value)}
              placeholder="https://..."
              className="w-full px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 mb-4"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSaveLink();
                } else if (e.key === 'Escape') {
                  setEditingLinkId(null);
                  setLinkValue('');
                }
              }}
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setEditingLinkId(null);
                  setLinkValue('');
                }}
                className="px-4 py-2 bg-gray-700/50 hover:bg-gray-700 text-white rounded-lg transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleSaveLink}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
              >
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
