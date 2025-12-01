'use client';

import { motion, useMotionValue, animate, useTransform } from 'framer-motion';
import { useEffect, useRef, useMemo } from 'react';
import type { SubmissionWithUser } from '../hooks/useAdminLiveSubmissions';

// Style pour l'animation dorée
const goldPulseStyle = `
  @keyframes pulse-gold {
    0%, 100% {
      opacity: 0.9;
      filter: drop-shadow(0 0 4px rgba(251, 191, 36, 0.8));
    }
    50% {
      opacity: 1;
      filter: drop-shadow(0 0 8px rgba(251, 191, 36, 1));
    }
  }
`;

interface WeightedSubmission {
  submission: SubmissionWithUser;
  weight: number;
}

interface RandomWheelProps {
  submissions: SubmissionWithUser[];
  weights: number[]; // Poids correspondant à chaque soumission
  queueSkipFlags?: boolean[]; // Indique si chaque soumission a Queue Skip activé
  selectedIndex: number | null;
  isSpinning: boolean;
  onSpinComplete: () => void;
}

export function RandomWheel({
  submissions,
  weights,
  queueSkipFlags = [],
  selectedIndex,
  isSpinning,
  onSpinComplete,
}: RandomWheelProps) {
  const rotation = useMotionValue(0);
  const hasCompletedRef = useRef(false);

  const numSegments = submissions.length;

  // Calculer les angles proportionnels aux poids
  const segmentAngles = useMemo(() => {
    if (numSegments === 0) return [];

    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    if (totalWeight === 0) {
      // Si pas de poids, diviser équitablement
      return Array(numSegments).fill(360 / numSegments);
    }

    return weights.map((weight) => (weight / totalWeight) * 360);
  }, [weights, numSegments]);

  // Calculer les angles cumulatifs pour chaque segment (début de chaque segment)
  const cumulativeAngles = useMemo(() => {
    const angles: number[] = [0];
    let currentAngle = 0;
    for (let i = 0; i < segmentAngles.length; i++) {
      currentAngle += segmentAngles[i];
      angles.push(currentAngle);
    }
    return angles;
  }, [segmentAngles]);

  // Calculer l'angle de rotation final pour que la sélection soit en haut
  // On veut que le segment sélectionné soit aligné avec le pointeur (en haut)
  // Avec une variation aléatoire pour que ça ne tombe pas toujours exactement au centre
  const calculateFinalRotation = () => {
    if (selectedIndex === null || numSegments === 0 || segmentAngles.length === 0) return 0;

    // L'angle du début du segment sélectionné
    const segmentStartAngle = cumulativeAngles[selectedIndex];
    // L'angle du segment
    const segmentAngle = segmentAngles[selectedIndex];
    // L'angle du centre du segment sélectionné
    const selectedSegmentCenterAngle = segmentStartAngle + segmentAngle / 2;

    // Ajouter une variation aléatoire maximale pour créer un effet dramatique
    // Parfois très proche du bord (jusqu'à 1% du segment suivant), parfois moins proche
    // Utiliser une distribution qui peut donner des valeurs extrêmes pour l'effet "presque sélectionné"
    const randomValue = Math.random();
    // Utiliser une courbe pour favoriser parfois des valeurs extrêmes (effet dramatique)
    const normalizedValue = Math.pow(randomValue, 0.7); // Courbe qui favorise les valeurs extrêmes
    const randomVariation = (normalizedValue - 0.5) * segmentAngle * 0.98; // -49% à +49% (presque jusqu'au bord)
    const adjustedAngle = selectedSegmentCenterAngle + randomVariation;

    // Pour que le segment soit en haut, on doit tourner de (360 - angle du segment)
    // Plus quelques tours complets pour l'effet de rotation
    const baseRotation = 360 - adjustedAngle;
    const fullRotations = 4 * 360; // 4 tours complets

    return baseRotation + fullRotations;
  };

  // Réinitialiser quand le spin se termine
  useEffect(() => {
    if (!isSpinning) {
      hasCompletedRef.current = false;
    }
  }, [isSpinning]);

  useEffect(() => {
    if (isSpinning && selectedIndex !== null && !hasCompletedRef.current && numSegments > 0) {
      hasCompletedRef.current = true;
      // Réinitialiser la rotation au début
      rotation.set(0);

      // Calculer l'angle de rotation final (inline pour éviter les dépendances)
      if (selectedIndex !== null && numSegments > 0 && segmentAngles.length > 0) {
        const segmentStartAngle = cumulativeAngles[selectedIndex];
        const segmentAngle = segmentAngles[selectedIndex];
        const selectedSegmentCenterAngle = segmentStartAngle + segmentAngle / 2;
        const randomValue = Math.random();
        const normalizedValue = Math.pow(randomValue, 0.7);
        const randomVariation = (normalizedValue - 0.5) * segmentAngle * 0.98;
        const adjustedAngle = selectedSegmentCenterAngle + randomVariation;
        const baseRotation = 360 - adjustedAngle;
        const fullRotations = 4 * 360;
        const finalRotation = baseRotation + fullRotations;

        // Animation de rotation avec décélération réaliste (départ rapide, ralentissement progressif)
        // Utiliser will-change et requestAnimationFrame pour une animation plus fluide
        const animation = animate(rotation, finalRotation, {
          duration: 4.5,
          ease: [0.23, 1, 0.32, 1], // Easing plus smooth (easeOutQuint-like) pour une animation fluide
          onComplete: () => {
            setTimeout(() => {
              onSpinComplete();
            }, 300);
          },
        });

        return () => {
          animation.stop();
        };
      }
    }
  }, [
    isSpinning,
    selectedIndex,
    rotation,
    onSpinComplete,
    numSegments,
    segmentAngles,
    cumulativeAngles,
  ]);

  if (submissions.length === 0) {
    return <div className="text-gray-400 text-center py-8">Aucune soumission disponible</div>;
  }

  // Générer les couleurs pour chaque segment (alternance de couleurs glassmorphism avec plus de contraste)
  const getSegmentColor = (index: number) => {
    const colors = [
      'rgba(139, 92, 246, 0.4)', // Purple - plus opaque
      'rgba(99, 102, 241, 0.4)', // Indigo - plus opaque
      'rgba(168, 85, 247, 0.4)', // Violet - plus opaque
      'rgba(79, 70, 229, 0.4)', // Indigo darker - plus opaque
    ];
    return colors[index % colors.length];
  };

  const getSegmentBorderColor = (index: number) => {
    const colors = [
      'rgba(139, 92, 246, 0.6)',
      'rgba(99, 102, 241, 0.6)',
      'rgba(168, 85, 247, 0.6)',
      'rgba(79, 70, 229, 0.6)',
    ];
    return colors[index % colors.length];
  };

  // Créer les segments SVG avec angles proportionnels
  const createSegmentPath = (index: number, radius: number) => {
    if (index >= segmentAngles.length) return '';

    const startAngle = (cumulativeAngles[index] - 90) * (Math.PI / 180);
    const endAngle = (cumulativeAngles[index + 1] - 90) * (Math.PI / 180);

    const x1 = radius + radius * Math.cos(startAngle);
    const y1 = radius + radius * Math.sin(startAngle);
    const x2 = radius + radius * Math.cos(endAngle);
    const y2 = radius + radius * Math.sin(endAngle);

    const segmentAngle = segmentAngles[index];
    const largeArcFlag = segmentAngle > 180 ? 1 : 0;

    return `M ${radius} ${radius} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
  };

  const wheelRadius = 200;
  const centerX = wheelRadius;
  const centerY = wheelRadius;

  return (
    <div className="relative flex flex-col items-center justify-center">
      {/* Style pour l'animation dorée */}
      <style>{goldPulseStyle}</style>

      {/* Pointeur fixe en haut */}
      <div className="absolute -top-4 z-20">
        <div className="w-0 h-0 border-l-[15px] border-r-[15px] border-t-[25px] border-l-transparent border-r-transparent border-t-purple-400 drop-shadow-lg" />
      </div>

      {/* Roue */}
      <motion.div
        style={{
          rotate: rotation,
          willChange: 'transform',
          transform: 'translateZ(0)', // Force GPU acceleration
        }}
        className="relative"
      >
        <svg
          width={wheelRadius * 2}
          height={wheelRadius * 2}
          viewBox={`0 0 ${wheelRadius * 2} ${wheelRadius * 2}`}
          className="drop-shadow-2xl"
          style={{
            filter: 'drop-shadow(0 10px 30px rgba(0, 0, 0, 0.5))',
            transform: 'translateZ(0)', // Force GPU acceleration
          }}
        >
          {/* Segments */}
          {submissions.map((submission, index) => {
            const isSelected = selectedIndex === index && !isSpinning;
            const hasQueueSkip = queueSkipFlags[index] || false;

            // Debug: Log pour vérifier les flags
            if (hasQueueSkip) {
              console.log(
                '[RandomWheel] Queue Skip détecté pour:',
                submission.User?.name,
                'index:',
                index
              );
            }
            return (
              <g key={submission.id}>
                <path
                  d={createSegmentPath(index, wheelRadius)}
                  fill={getSegmentColor(index)}
                  stroke={
                    hasQueueSkip
                      ? 'rgba(251, 191, 36, 0.8)' // Doré pour Queue Skip
                      : isSelected
                        ? 'rgba(139, 92, 246, 0.8)'
                        : getSegmentBorderColor(index)
                  }
                  strokeWidth={hasQueueSkip || isSelected ? 3 : 1}
                  className="transition-all duration-300"
                  style={{
                    filter: hasQueueSkip
                      ? 'drop-shadow(0 0 8px rgba(251, 191, 36, 0.6))'
                      : undefined,
                  }}
                >
                  {hasQueueSkip && (
                    <animate
                      attributeName="opacity"
                      values="0.8;1;0.8"
                      dur="2s"
                      repeatCount="indefinite"
                    />
                  )}
                </path>

                {/* Texte du participant - horizontal, aligné avec le rayon (du centre vers l'extérieur) */}
                {(() => {
                  const username = submission.User.name || 'Unknown';
                  const weight = weights[index] || 0;
                  const segmentStartAngle = cumulativeAngles[index];
                  const segmentAngle = segmentAngles[index];
                  const segmentCenterAngle =
                    (segmentStartAngle + segmentAngle / 2 - 90) * (Math.PI / 180);

                  // Position du texte centrée verticalement dans le segment (à mi-distance entre centre et bord)
                  const textDistance = wheelRadius * 0.5; // 50% du rayon pour centrer verticalement
                  const textX = centerX + textDistance * Math.cos(segmentCenterAngle);
                  const textY = centerY + textDistance * Math.sin(segmentCenterAngle);

                  // Rotation pour aligner le texte avec le rayon (du centre vers l'extérieur)
                  // On utilise l'angle du centre du segment directement
                  const textRotation = (segmentCenterAngle * 180) / Math.PI;

                  // Couleur dorée pour Queue Skip
                  const textColor = hasQueueSkip
                    ? '#fbbf24' // Doré
                    : isSelected
                      ? '#c084fc'
                      : 'white';

                  return (
                    <text
                      x={textX}
                      y={textY}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      transform={`rotate(${textRotation} ${textX} ${textY})`}
                      fill={textColor}
                      fontSize={hasQueueSkip || isSelected ? '16' : '14'}
                      fontWeight={hasQueueSkip || isSelected ? 'bold' : 'normal'}
                      className="pointer-events-none select-none"
                      style={{
                        textShadow: hasQueueSkip
                          ? '0 2px 8px rgba(251, 191, 36, 0.9), 0 0 16px rgba(251, 191, 36, 0.7), 0 0 24px rgba(251, 191, 36, 0.5)'
                          : isSelected
                            ? '0 2px 8px rgba(139, 92, 246, 0.8), 0 0 12px rgba(139, 92, 246, 0.6)'
                            : '0 2px 4px rgba(0, 0, 0, 0.7)',
                        filter: hasQueueSkip
                          ? 'drop-shadow(0 0 4px rgba(251, 191, 36, 0.8))'
                          : undefined,
                        animation: hasQueueSkip
                          ? 'pulse-gold 1.5s ease-in-out infinite'
                          : undefined,
                      }}
                    >
                      {hasQueueSkip && (
                        <animate
                          attributeName="opacity"
                          values="0.9;1;0.9"
                          dur="1.5s"
                          repeatCount="indefinite"
                        />
                      )}
                      {username}
                    </text>
                  );
                })()}
              </g>
            );
          })}
        </svg>
      </motion.div>

      {/* Centre de la roue avec effet glassmorphism */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
        <div className="glass-modern rounded-full w-16 h-16 flex items-center justify-center border-2 border-purple-400/70 bg-black/40 backdrop-blur-md">
          <div className="w-3 h-3 rounded-full bg-purple-400 shadow-lg shadow-purple-400/50" />
        </div>
      </div>
    </div>
  );
}
