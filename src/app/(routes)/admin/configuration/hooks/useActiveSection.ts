import { useEffect, useState } from 'react';

import type { ConfigSection } from '@/types/config';

/** Section active de la page configuration, synchronisée avec le hash de l'URL. */
export function useActiveSection() {
  const [activeSection, setActiveSection] = useState<ConfigSection>('general');

  // Fonction utilitaire pour gérer l'ancre selon la section
  const handleSectionClick = (section: ConfigSection) => {
    setActiveSection(section);
    if (typeof window !== 'undefined') {
      if (section === 'general') {
        window.history.replaceState(null, '', window.location.pathname);
      } else {
        window.history.replaceState(null, '', `#${section}`);
      }
    }
  };

  // useEffect pour lire le hash initial (inchangé)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.replace('#', '');
      const validSections: ConfigSection[] = [
        'general',
        'appearance',
        'homepage',
        'notifications',
        'security',
        'api',
        'images',
      ];
      if (validSections.includes(hash as ConfigSection)) {
        setActiveSection(hash as ConfigSection);
      } else if (window.location.pathname.endsWith('/images')) {
        setActiveSection('images');
      }
    }
  }, []);

  return { activeSection, handleSectionClick };
}
