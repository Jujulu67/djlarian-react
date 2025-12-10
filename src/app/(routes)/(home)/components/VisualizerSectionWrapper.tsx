'use client';

import dynamic from 'next/dynamic';

// Composant client pour gérer l'état du visualizer - doit être dans un composant client pour utiliser ssr: false
const VisualizerSectionClient = dynamic(() => import('./VisualizerSectionClient'), {
  ssr: false,
});

interface VisualizerSectionWrapperProps {
  title: string;
}

export default function VisualizerSectionWrapper({ title }: VisualizerSectionWrapperProps) {
  return <VisualizerSectionClient title={title} />;
}
