'use client';

import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

import { useUiVersion } from '@/hooks/useUiVersion';
import { fadeUp, stagger } from '@/lib/motion';

interface RevealProps {
  children: ReactNode;
  className?: string;
  /** Délai avant l'apparition (secondes) */
  delay?: number;
}

const VIEWPORT = { once: true, margin: '0px 0px -10% 0px' } as const;

/**
 * Apparition au scroll (fondu + légère montée), une seule fois. UI v2 uniquement :
 * en legacy, rend un simple <div> pour garder l'interface identique.
 */
export function Reveal({ children, className, delay = 0 }: RevealProps) {
  const isV2 = useUiVersion() === 'v2';
  if (!isV2) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      variants={fadeUp}
      initial="hidden"
      whileInView="visible"
      viewport={VIEWPORT}
      transition={{ delay }}
    >
      {children}
    </motion.div>
  );
}

/** Conteneur d'une grille ou d'une liste dont les <RevealItem> apparaissent en cascade */
export function RevealGroup({ children, className, delay = 0 }: RevealProps) {
  const isV2 = useUiVersion() === 'v2';
  if (!isV2) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      variants={stagger(delay)}
      initial="hidden"
      whileInView="visible"
      viewport={VIEWPORT}
    >
      {children}
    </motion.div>
  );
}

export function RevealItem({ children, className }: Omit<RevealProps, 'delay'>) {
  const isV2 = useUiVersion() === 'v2';
  if (!isV2) return <div className={className}>{children}</div>;

  return (
    <motion.div className={className} variants={fadeUp}>
      {children}
    </motion.div>
  );
}
