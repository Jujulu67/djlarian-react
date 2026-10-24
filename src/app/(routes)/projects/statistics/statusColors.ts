import { PROJECT_STATUSES } from '@/components/projects/types';

// Fonction pour générer des couleurs distinctes (jusqu'à 25+ projets)
export function getColorForIndex(index: number, total: number): string {
  // Palette de base avec 8 couleurs distinctes
  const baseColors = [
    '#a855f7', // purple
    '#3b82f6', // blue
    '#10b981', // green
    '#f59e0b', // orange
    '#ef4444', // red
    '#8b5cf6', // violet
    '#06b6d4', // cyan
    '#f97316', // orange-500
  ];

  // Si on a moins de 8 projets, utiliser la palette de base
  if (total <= baseColors.length) {
    return baseColors[index % baseColors.length];
  }

  // Pour plus de 8 projets, générer des couleurs HSL équitablement réparties
  // Utiliser un angle de base pour chaque couleur
  const hue = (index * 360) / Math.max(total, 8);
  // Varier la saturation et la luminosité pour plus de distinction
  const saturation = 65 + (index % 3) * 10; // Entre 65% et 85%
  const lightness = 50 + (Math.floor(index / 3) % 3) * 5; // Entre 50% et 60%

  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

export function getStatusColor(status: string) {
  const statusConfig = PROJECT_STATUSES.find((s) => s.value === status);
  if (!statusConfig) return 'gray';

  const colorMap: Record<string, string> = {
    blue: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    green: 'bg-green-500/20 text-green-400 border-green-500/30',
    red: 'bg-red-500/20 text-red-400 border-red-500/30',
    orange: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    purple: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  };

  return colorMap[statusConfig.color] || 'bg-gray-500/20 text-gray-400 border-gray-500/30';
}

// Obtenir les couleurs pour les barres (même style que les cartes)
export function getStatusBarColors(status: string) {
  const statusConfig = PROJECT_STATUSES.find((s) => s.value === status);
  if (!statusConfig) {
    return {
      fill: 'rgba(107, 114, 128, 0.2)',
      stroke: 'rgba(107, 114, 128, 0.3)',
      text: '#9ca3af', // gray-400
    };
  }

  // Couleurs correspondant exactement aux cartes : bg-{color}-500/20, border-{color}-500/30, text-{color}-400
  // Opacité augmentée pour le contour (0.6) pour une meilleure visibilité
  const colorMap: Record<string, { fill: string; stroke: string; text: string }> = {
    blue: {
      fill: 'rgba(59, 130, 246, 0.2)', // bg-blue-500/20
      stroke: 'rgba(59, 130, 246, 0.6)', // border-blue-500/60 (augmenté pour plus de visibilité)
      text: '#60a5fa', // text-blue-400
    },
    green: {
      fill: 'rgba(34, 197, 94, 0.2)', // bg-green-500/20
      stroke: 'rgba(34, 197, 94, 0.6)', // border-green-500/60 (augmenté pour plus de visibilité)
      text: '#4ade80', // text-green-400
    },
    red: {
      fill: 'rgba(239, 68, 68, 0.2)', // bg-red-500/20
      stroke: 'rgba(239, 68, 68, 0.6)', // border-red-500/60 (augmenté pour plus de visibilité)
      text: '#f87171', // text-red-400
    },
    orange: {
      fill: 'rgba(249, 115, 22, 0.2)', // bg-orange-500/20
      stroke: 'rgba(249, 115, 22, 0.6)', // border-orange-500/60 (augmenté pour plus de visibilité)
      text: '#fb923c', // text-orange-400
    },
    purple: {
      fill: 'rgba(168, 85, 247, 0.2)', // bg-purple-500/20
      stroke: 'rgba(168, 85, 247, 0.6)', // border-purple-500/60 (augmenté pour plus de visibilité)
      text: '#c084fc', // text-purple-400
    },
  };

  return colorMap[statusConfig.color] || colorMap.blue;
}
