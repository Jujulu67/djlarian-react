// Définir les types pour chaque section de configuration
export interface GeneralConfig {
  siteName: string;
  siteDescription: string;
  contactEmail: string;
  timeZone: string;
  dateFormat: string;
}

export interface AppearanceConfig {
  primaryColor: string;
  secondaryColor: string;
  darkMode: boolean;
  animationsEnabled: boolean;
  logoUrl: string;
  faviconUrl: string;
}

export interface HomepageConfig {
  heroTitle: string;
  heroSubtitle: string;
  heroExploreButtonText: string;
  heroExploreButtonUrl: string;
  heroEventsButtonText: string;
  heroEventsButtonUrl: string;
  heroBackgroundVideo: string;
  heroPosterImage: string;
  sectionsOrder: string;
  releasesEnabled: boolean;
  releasesTitle: string;
  releasesCount: number;
  visualizerEnabled: boolean;
  visualizerTitle: string;
  eventsEnabled: boolean;
  eventsTitle: string;
  eventsCount: number;
  eventsViewAllText: string;
  eventsViewAllUrl: string;
  streamEnabled: boolean;
  streamTitle: string;
  streamSubtitle: string;
  streamDescription: string;
  twitchUsername: string;
  twitchFollowButtonText: string;
  twitchFollowButtonUrl: string;
  streamNotifyButtonText: string;
  streamStatsEnabled: boolean;
  streamFollowers: string;
  streamHoursStreamed: string;
  streamTracksPlayed: string;
}

export interface NotificationsConfig {
  emailNotifications: boolean;
  adminAlerts: boolean;
  newUserNotifications: boolean;
  eventReminders: boolean;
  marketingEmails: boolean;
}

export interface SecurityConfig {
  twoFactorAuth: boolean;
  passwordExpiration: number;
  ipRestriction: boolean;
  failedLoginLimit: number;
  sessionTimeout: number;
}

export interface ApiConfig {
  apiEnabled: boolean;
  rateLimit: number;
  webhookUrl: string;
  umamiEnabled: boolean;
  umamiSiteId: string;
}

// Type global pour toutes les configurations
export interface AllConfigs {
  general: GeneralConfig;
  appearance: AppearanceConfig;
  homepage: HomepageConfig;
  notifications: NotificationsConfig;
  security: SecurityConfig;
  api: ApiConfig;
}

// Type pour identifier la section active
export type ConfigSection =
  | 'general'
  | 'appearance'
  | 'homepage'
  | 'notifications'
  | 'security'
  | 'api'
  | 'images';

// Configurations initiales
export const initialGeneralConfig: GeneralConfig = {
  siteName: '',
  siteDescription: '',
  contactEmail: '',
  timeZone: 'Europe/Paris',
  dateFormat: 'DD/MM/YYYY',
};

export const initialAppearanceConfig: AppearanceConfig = {
  primaryColor: '#8B5CF6',
  secondaryColor: '#3B82F6',
  darkMode: true,
  animationsEnabled: true,
  logoUrl: '',
  faviconUrl: '',
};

export const initialHomepageConfig: HomepageConfig = {
  heroTitle: 'DJ LARIAN',
  heroSubtitle: 'Electronic Music Producer & Innovative Performer',
  heroExploreButtonText: 'Explore Music',
  heroExploreButtonUrl: '/music',
  heroEventsButtonText: 'Upcoming Events',
  heroEventsButtonUrl: '/events',
  heroBackgroundVideo: '/videos/hero-background.mp4',
  heroPosterImage: '/images/hero-poster.jpg',
  sectionsOrder: 'hero,releases,visualizer,events,stream',
  releasesEnabled: true,
  releasesTitle: 'Latest Releases',
  releasesCount: 3,
  visualizerEnabled: true,
  visualizerTitle: 'Experience the Sound',
  eventsEnabled: true,
  eventsTitle: 'Upcoming Events',
  eventsCount: 3,
  eventsViewAllText: 'View All Events',
  eventsViewAllUrl: '/events',
  streamEnabled: true,
  streamTitle: 'Live Stream',
  streamSubtitle: 'Join the Live Experience',
  streamDescription:
    'Tune in to my live streams where I share my creative process, perform exclusive sets, and interact with the community in real-time.',
  twitchUsername: 'larianmusic',
  twitchFollowButtonText: 'Follow on Twitch',
  twitchFollowButtonUrl: 'https://twitch.tv/larianmusic',
  streamNotifyButtonText: 'Get Notified',
  streamStatsEnabled: true,
  streamFollowers: '24K+',
  streamHoursStreamed: '150+',
  streamTracksPlayed: '500+',
};

export const initialNotificationsConfig: NotificationsConfig = {
  emailNotifications: true,
  adminAlerts: true,
  newUserNotifications: true,
  eventReminders: true,
  marketingEmails: false,
};

export const initialSecurityConfig: SecurityConfig = {
  twoFactorAuth: false,
  passwordExpiration: 90,
  ipRestriction: false,
  failedLoginLimit: 5,
  sessionTimeout: 60,
};

export const initialApiConfig: ApiConfig = {
  apiEnabled: true,
  rateLimit: 100,
  webhookUrl: '', // À configurer dans /admin/configuration si nécessaire
  umamiEnabled: true, // Activé par défaut pour le développement local
  umamiSiteId: '484ec662-e403-4498-a654-ca04b9b504c3', // ID du site Umami (local development)
};

// Configuration initiale globale
export const initialConfigs: AllConfigs = {
  general: initialGeneralConfig,
  appearance: initialAppearanceConfig,
  homepage: initialHomepageConfig,
  notifications: initialNotificationsConfig,
  security: initialSecurityConfig,
  api: initialApiConfig,
};
