import type { Transition, Variants } from 'framer-motion';

/**
 * Presets de motion de l'UI v2 : apparitions courtes et précises, pas de rebond gratuit.
 * Les durées et l'easing sont aussi exposés en CSS (--dur-*, --ease-out-expo dans globals.css).
 */

export const durations = {
  fast: 0.15,
  base: 0.25,
  slow: 0.4,
  slower: 0.7,
} as const;

/** out-expo : départ franc, arrivée très douce */
export const easeOutExpo = [0.16, 1, 0.3, 1] as const;

export const springs = {
  /** Interactions (press, toggles, indicateurs) */
  snappy: { type: 'spring', stiffness: 300, damping: 30 },
  /** Éléments plus grands (sheets, panneaux) */
  soft: { type: 'spring', stiffness: 200, damping: 28 },
} satisfies Record<string, Transition>;

export const transitions = {
  base: { duration: durations.base, ease: easeOutExpo },
  slow: { duration: durations.slow, ease: easeOutExpo },
  slower: { duration: durations.slower, ease: easeOutExpo },
} satisfies Record<string, Transition>;

/** Décalage entre enfants d'une grille ou d'une liste */
export const STAGGER = 0.06;

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: transitions.slow },
};

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: transitions.slower },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: { opacity: 1, scale: 1, transition: transitions.slow },
};

export function stagger(delayChildren = 0, staggerChildren = STAGGER): Variants {
  return {
    hidden: {},
    visible: { transition: { delayChildren, staggerChildren } },
  };
}

/** Retour tactile d'un élément cliquable */
export const press = { scale: 0.97 } as const;
