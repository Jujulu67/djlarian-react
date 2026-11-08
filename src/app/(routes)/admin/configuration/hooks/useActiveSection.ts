import { useState } from 'react';

import { useIsClient } from '@/hooks/useIsClient';

import type { ConfigSection } from '@/types/config';

/** Section active de la page configuration, synchronisée avec le hash de l'URL. */
export function useActiveSection() {
  const isClient = useIsClient();
  // Section choisie par un clic ; sinon celle de l'URL (lue côté client seulement)
  const [chosenSection, setChosenSection] = useState<ConfigSection | null>(null);
  const activeSection = chosenSection ?? (isClient ? sectionFromUrl() : 'general');

  // Fonction utilitaire pour gérer l'ancre selon la section
  const handleSectionClick = (section: ConfigSection) => {
    setChosenSection(section);
    if (typeof window !== 'undefined') {
      if (section === 'general') {
        window.history.replaceState(null, '', window.location.pathname);
      } else {
        window.history.replaceState(null, '', `#${section}`);
      }
    }
  };

  return { activeSection, handleSectionClick };
}

const VALID_SECTIONS: Set<ConfigSection> = new Set([
  'general',
  'appearance',
  'homepage',
  'notifications',
  'security',
  'api',
  'images',
]);

function sectionFromUrl(): ConfigSection {
  const hash = window.location.hash.replace('#', '');
  if (VALID_SECTIONS.has(hash as ConfigSection)) return hash as ConfigSection;
  return window.location.pathname.endsWith('/images') ? 'images' : 'general';
}
