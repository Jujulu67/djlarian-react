import {
  AllConfigs,
  initialApiConfig,
  initialHomepageConfig,
  initialNotificationsConfig,
  initialSecurityConfig,
} from '@/types/config';

// Valeurs par défaut pour les configurations.
// general/appearance diffèrent volontairement des initial*Config (qui laissent siteName,
// contactEmail, logoUrl… vides avant chargement) : ils restent donc explicites ici.
export const defaultConfigs: AllConfigs = {
  general: {
    siteName: 'Larian',
    siteDescription: 'Official site of Larian - Electronic music and events.',
    contactEmail: 'contact@djlarian.com',
    timeZone: 'Europe/Paris',
    dateFormat: 'DD/MM/YYYY',
  },
  appearance: {
    primaryColor: '#8B5CF6',
    secondaryColor: '#3B82F6',
    darkMode: true,
    animationsEnabled: true,
    logoUrl: '/images/logo.png',
    faviconUrl: '/favicon.ico',
  },
  // Sections identiques aux valeurs initiales du store (copies, pas de référence partagée)
  homepage: { ...initialHomepageConfig },
  notifications: { ...initialNotificationsConfig },
  security: { ...initialSecurityConfig },
  api: { ...initialApiConfig },
};
