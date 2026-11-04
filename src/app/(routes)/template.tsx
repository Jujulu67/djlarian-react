'use client';

import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

import { useUiVersion } from '@/hooks/useUiVersion';
import { easeOutExpo } from '@/lib/motion';

/** Transition d'entrée de page (UI v2) : fondu et légère montée */
export default function RoutesTemplate({ children }: { children: ReactNode }) {
  const uiVersion = useUiVersion();
  if (uiVersion === 'legacy') return children;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: easeOutExpo }}
    >
      {children}
    </motion.div>
  );
}
