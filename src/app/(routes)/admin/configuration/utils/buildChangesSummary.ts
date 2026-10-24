import isEqual from 'lodash/isEqual';

import { isNotEmpty } from '@/lib/utils/arrayHelpers';
import type { AllConfigs } from '@/types/config';

// Libellés lisibles des clés de configuration (section.clé)
export const CONFIG_LABEL_MAPPINGS: Record<string, string> = {
  // Général
  siteName: 'Nom du site',
  siteDescription: 'Description du site',
  contactEmail: 'Email de contact',
  timeZone: 'Fuseau horaire',
  dateFormat: 'Format de date',

  // Apparence
  primaryColor: 'Couleur primaire',
  secondaryColor: 'Couleur secondaire',
  darkMode: 'Mode sombre',
  animationsEnabled: 'Animations activées',
  logoUrl: 'URL du logo',
  faviconUrl: 'URL du favicon',

  // Page d'accueil
  heroTitle: 'Titre principal',
  heroSubtitle: 'Sous-titre',
  heroExploreButtonText: 'Texte bouton Explorer',
  heroExploreButtonUrl: 'URL bouton Explorer',
  heroEventsButtonText: 'Texte bouton Événements',
  heroEventsButtonUrl: 'URL bouton Événements',
  heroBackgroundVideo: "Vidéo d'arrière-plan",
  heroPosterImage: 'Image poster',
  sectionsOrder: 'Ordre des sections',
  releasesEnabled: 'Section Sorties activée',
  releasesTitle: 'Titre section Sorties',
  releasesCount: 'Nombre de sorties',
  visualizerEnabled: 'Section Visualiseur activée',
  visualizerTitle: 'Titre section Visualiseur',
  eventsEnabled: 'Section Événements activée',
  eventsTitle: 'Titre section Événements',
  eventsCount: "Nombre d'événements",
  eventsViewAllText: 'Texte lien Voir tout',
  eventsViewAllUrl: 'URL lien Voir tout',
  streamEnabled: 'Section Stream activée',
  streamTitle: 'Titre section Stream',
  streamSubtitle: 'Sous-titre section Stream',
  streamDescription: 'Description section Stream',
  twitchUsername: "Nom d'utilisateur Twitch",
  twitchFollowButtonText: 'Texte bouton Suivre Twitch',
  twitchFollowButtonUrl: 'URL bouton Suivre Twitch',
  streamNotifyButtonText: 'Texte bouton Notifications',
  streamStatsEnabled: 'Statistiques Stream activées',
  streamFollowers: 'Nombre de followers',
  streamHoursStreamed: 'Heures de stream',
  streamTracksPlayed: 'Pistes jouées',

  // Notifications
  emailNotifications: 'Notifications par email',
  adminAlerts: 'Alertes administrateur',
  newUserNotifications: 'Notifications nouveaux utilisateurs',
  eventReminders: "Rappels d'événements",
  marketingEmails: 'Emails marketing',

  // Sécurité
  twoFactorAuth: 'Authentification à deux facteurs',
  passwordExpiration: 'Expiration du mot de passe',
  ipRestriction: 'Restriction IP',
  failedLoginLimit: 'Limite de tentatives de connexion',
  sessionTimeout: 'Timeout de session',

  // API
  apiEnabled: 'API activée',
  rateLimit: 'Limite de requêtes',
  webhookUrl: 'URL de Webhook',
  umamiEnabled: 'Umami Analytics activé',
  umamiSiteId: 'ID du site Umami',
};

export function formatChangeValue(value: unknown): string {
  if (typeof value === 'boolean') return value ? 'Activé' : 'Désactivé';
  if (value === null || value === undefined || value === '')
    return '<span class="text-gray-500">[Vide]</span>';
  // Tronquer les longues chaînes pour la lisibilité
  if (typeof value === 'string' && value.length > 50) return `"${value.substring(0, 47)}..."`;
  return JSON.stringify(value);
}

export function buildChangesSummary(current: AllConfigs, previous: AllConfigs | null): string {
  if (!previous) {
    return 'Chargement de la configuration initiale...';
  }
  const before: AllConfigs = previous;
  const changes: string[] = [];

  (Object.keys(current) as Array<keyof AllConfigs>).forEach((section) => {
    const sectionChanges: string[] = [];
    const currentSection = current[section];
    const previousSection = before[section];

    (Object.keys(currentSection) as Array<keyof typeof currentSection>).forEach((key) => {
      const currentValue = currentSection[key];
      const previousValue = previousSection[key];

      // Utiliser isEqual pour comparer les valeurs
      if (!isEqual(currentValue, previousValue)) {
        const label = CONFIG_LABEL_MAPPINGS[`${section}.${key}`] || `${section}.${key}`;
        sectionChanges.push(
          `    ${label}\n        <span class="text-gray-500">${formatChangeValue(previousValue)}</span> <span class="text-cyan-300">→</span> <span class="text-white font-semibold">${formatChangeValue(currentValue)}</span>`
        );
      }
    });

    if (isNotEmpty(sectionChanges)) {
      const sectionTitle = section.charAt(0).toUpperCase() + section.slice(1);
      changes.push(
        `<span class="text-cyan-300 font-bold">${sectionTitle}:</span>\n${sectionChanges.join('\n')}`
      );
    }
  });

  if (changes.length === 0) {
    return 'Aucune modification détectée depuis la dernière sauvegarde.';
  }

  return changes.join('\n\n');
}
