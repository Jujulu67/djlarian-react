'use client';

import { useState, useEffect } from 'react';

import VisualizerSection from './VisualizerSection';

interface VisualizerSectionClientProps {
  title: string;
}

export default function VisualizerSectionClient({ title }: VisualizerSectionClientProps) {
  const [waveformAnimationReady, setWaveformAnimationReady] = useState(false);

  // Le waveform est prêt immédiatement car les données sont déjà chargées côté serveur
  useEffect(() => {
    // Petit délai pour laisser le navigateur terminer les opérations de rendu initiales
    const timer = setTimeout(() => {
      setWaveformAnimationReady(true);
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  return <VisualizerSection title={title} waveformAnimationReady={waveformAnimationReady} />;
}
