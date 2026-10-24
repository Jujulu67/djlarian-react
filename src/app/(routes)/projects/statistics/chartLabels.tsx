import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

import type { Project } from '@/components/projects/types';

import { getStatusBarColors } from './statusColors';
import type { SegmentLabelProps, StatisticsData, TooltipProps } from './types';

// Tooltip personnalisé pour afficher les détails des projets
export const ProjectsByYearTooltip = ({
  active,
  payload,
  label,
  projectsByYearDetails,
  projects,
}: TooltipProps & {
  projectsByYearDetails: StatisticsData['projectsByYearDetails'];
  projects: Project[];
}) => {
  if (!active || !payload || !payload.length) return null;

  const year = String(label || '');
  const yearData = payload[0]?.payload;
  if (!yearData || !year || !projectsByYearDetails[year]) return null;

  // projectsByYearDetails contient déjà seulement TERMINE et GHOST_PRODUCTION
  const allProjects = projectsByYearDetails[year];
  const termines = allProjects.filter((p: { id: string }) => {
    const project = projects.find((proj) => proj.id === p.id);
    return project?.status === 'TERMINE';
  });
  const ghostProds = allProjects.filter((p: { id: string }) => {
    const project = projects.find((proj) => proj.id === p.id);
    return project?.status === 'GHOST_PRODUCTION';
  });

  const total = typeof yearData.total === 'number' ? yearData.total : 0;

  return (
    <div className="bg-gray-900/95 border border-gray-700 rounded-lg p-4 shadow-xl min-w-[250px] max-w-[400px]">
      <div className="text-white font-semibold mb-3 text-center border-b border-gray-700 pb-2">
        {year} - Total: {total}
      </div>

      {termines.length > 0 &&
        (() => {
          const colors = getStatusBarColors('TERMINE');
          return (
            <div className="mb-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: colors.text }} />
                <span className="text-sm font-medium" style={{ color: colors.text }}>
                  Terminé ({termines.length} projet{termines.length > 1 ? 's' : ''})
                </span>
              </div>
              <div className="pl-5 space-y-1 max-h-[150px] overflow-y-auto">
                {termines.map((p: { id: string; name: string; releaseDate?: string }) => (
                  <div
                    key={p.id}
                    className="text-xs flex items-center justify-between gap-2"
                    style={{ color: colors.text }}
                  >
                    <span className="flex-1">{p.name}</span>
                    {p.releaseDate ? (
                      <span className="text-xs opacity-70">
                        {format(new Date(p.releaseDate), 'dd/MM/yyyy', { locale: fr })}
                      </span>
                    ) : (
                      <span className="text-xs opacity-50 italic">Sans date</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

      {ghostProds.length > 0 &&
        (() => {
          const colors = getStatusBarColors('GHOST_PRODUCTION');
          return (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: colors.text }} />
                <span className="text-sm font-medium" style={{ color: colors.text }}>
                  Ghost Prod ({ghostProds.length} projet{ghostProds.length > 1 ? 's' : ''})
                </span>
              </div>
              <div className="pl-5 space-y-1 max-h-[150px] overflow-y-auto">
                {ghostProds.map((p: { id: string; name: string; releaseDate?: string }) => (
                  <div
                    key={p.id}
                    className="text-xs flex items-center justify-between gap-2"
                    style={{ color: colors.text }}
                  >
                    <span className="flex-1">{p.name}</span>
                    {p.releaseDate ? (
                      <span className="text-xs opacity-70">
                        {format(new Date(p.releaseDate), 'dd/MM/yyyy', { locale: fr })}
                      </span>
                    ) : (
                      <span className="text-xs opacity-50 italic">Sans date</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
    </div>
  );
};

// Composant pour afficher le total au-dessus de la barre (seulement les barres visibles)
export const createTotalLabelRenderer = (hiddenStatuses: Set<string>) => {
  const TotalLabel = (props: SegmentLabelProps) => {
    const { x, y, width, payload } = props;
    if (!payload) return null;

    // Calculer le total des barres visibles pour cette année spécifique
    let visibleTotal = 0;
    if (!hiddenStatuses.has('TERMINE')) {
      const termineValue = payload?.TERMINE;
      visibleTotal += typeof termineValue === 'number' ? termineValue : 0;
    }
    if (!hiddenStatuses.has('GHOST_PRODUCTION')) {
      const ghostValue = payload?.GHOST_PRODUCTION;
      visibleTotal += typeof ghostValue === 'number' ? ghostValue : 0;
    }

    if (visibleTotal === 0) return null;

    // Utiliser le total calculé, pas payload.total qui pourrait être incorrect
    const xNum = typeof x === 'number' ? x : 0;
    const yNum = typeof y === 'number' ? y : 0;
    const widthNum = typeof width === 'number' ? width : 0;
    return (
      <text
        x={xNum + widthNum / 2}
        y={yNum - 5}
        fill="#fff"
        textAnchor="middle"
        fontSize={12}
        fontWeight="bold"
      >
        {visibleTotal}
      </text>
    );
  };
  return TotalLabel;
};

// Composant pour afficher la valeur de l'année pour chaque segment
export const createSegmentLabelRenderer = (status: 'TERMINE' | 'GHOST_PRODUCTION') => {
  const SegmentLabel = (props: SegmentLabelProps) => {
    const { x, y, width, height, payload, value } = props;
    // Pour les barres empilées, payload devrait contenir toutes les données de la ligne
    // Mais si payload n'est pas disponible, value contient la valeur du segment pour cette barre spécifique
    let segmentValue = 0;

    // Essayer d'abord payload[status]
    if (payload && typeof payload[status] === 'number') {
      segmentValue = payload[status] as number;
    }
    // Sinon, pour Ghost Prod, value est le total cumulé, on doit soustraire Terminé
    else if (status === 'GHOST_PRODUCTION' && payload && typeof payload.TERMINE === 'number') {
      segmentValue = (value || 0) - (payload.TERMINE as number);
    }
    // Pour Terminé ou si on n'a que value, utiliser value directement
    else if (typeof value === 'number') {
      segmentValue = value;
    }

    const heightNum = typeof height === 'number' ? height : 0;
    if (!segmentValue || segmentValue === 0 || !heightNum || heightNum < 15) return null;

    // Obtenir la couleur de texte (même que le contour des cartes) avec opacité augmentée
    const colors = getStatusBarColors(status);

    // Position au centre du segment
    const widthNum = typeof width === 'number' ? width : 0;
    const segmentY = (typeof y === 'number' ? y : 0) + heightNum / 2;
    const segmentX = (typeof x === 'number' ? x : 0) + widthNum / 2;

    return (
      <text
        x={segmentX}
        y={segmentY}
        fill={colors.text}
        textAnchor="middle"
        fontSize={12}
        fontWeight="bold"
        style={{
          textShadow: '0 0 4px rgba(0,0,0,0.9)',
          opacity: 1,
          fillOpacity: 1,
        }}
      >
        {segmentValue}
      </text>
    );
  };
  SegmentLabel.displayName = `SegmentLabel-${status}`;
  return SegmentLabel;
};
