'use client';

import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

import { PageHeader } from '@/components/ui/PageHeader';

/**
 * En-tête de la page Musique : titre en dégradé (legacy) ou PageHeader (v2).
 * Les deux sont rendus et le CSS choisit (`v2:hidden` / `hidden v2:block`) :
 * pas d'écart d'hydratation, et le legacy reste identique.
 */
export function MusicHeader() {
  return (
    <>
      {/* Titre avec animation et icône */}
      <div className="relative mb-4 v2:hidden">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-4xl md:text-5xl font-bold text-center bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent"
        >
          Ma Musique
        </motion.h1>
        <Sparkles className="absolute top-0 right-[calc(50%-150px)] md:right-[calc(50%-180px)] w-8 h-8 md:w-10 md:h-10 text-yellow-400 transform -translate-y-1 animate-pulse" />
      </div>

      {/* Sous-titre */}
      <p className="text-gray-400 text-center mb-10 max-w-2xl mx-auto v2:hidden">
        Découvrez ma discographie complète avec tous mes singles, EPs, remixes et DJ sets
        disponibles sur les plateformes de streaming.
      </p>

      <div className="hidden v2:block">
        <PageHeader
          eyebrow="Discographie"
          title="Musique"
          description="Singles, EPs, remixes et DJ sets, disponibles sur les plateformes de streaming."
        />
      </div>
    </>
  );
}
