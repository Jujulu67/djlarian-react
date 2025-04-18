'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import {
  ArrowLeft,
  Settings,
  Globe,
  Layout,
  Bell,
  Shield,
  Mail,
  Save,
  RotateCcw,
  Zap,
  Clock,
  Calendar,
  User,
  Database,
  RefreshCcw,
  Lock,
  Home,
  BookmarkPlus,
  History,
  Music,
  Eye,
  CalendarDays,
  Video,
  GripVertical,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import CreateSnapshotModal from './components/CreateSnapshotModal';
import HistoryModal from './components/HistoryModal';

// Composant StrictModeDroppable pour résoudre le problème de compatibilité avec React 18 StrictMode
const StrictModeDroppable = ({ children, ...props }: React.ComponentProps<typeof Droppable>) => {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    // Utilisation de requestAnimationFrame pour s'assurer que le composant est monté correctement
    const animation = requestAnimationFrame(() => setEnabled(true));

    return () => {
      cancelAnimationFrame(animation);
      setEnabled(false);
    };
  }, []);

  if (!enabled) {
    return null;
  }

  return <Droppable {...props}>{children}</Droppable>;
};

// Modal de sauvegarde de configuration
interface SaveConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, description: string) => Promise<void>;
  changesSummary: string;
}

const SaveConfigModal = ({ isOpen, onClose, onSave, changesSummary }: SaveConfigModalProps) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Générer un nom par défaut basé sur la date actuelle
      const date = new Date();
      setName(`Config ${date.toLocaleDateString()} ${date.toLocaleTimeString()}`);
      setDescription('');
      setError(null);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Veuillez fournir un nom pour cette sauvegarde.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSave(name, description);
      onClose();
    } catch (err) {
      setError('Une erreur est survenue lors de la sauvegarde. Veuillez réessayer.');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="glass bg-opacity-90 w-full max-w-2xl p-6 rounded-xl border border-purple-500/30 shadow-xl">
        <h2 className="text-2xl font-semibold text-white mb-4">Sauvegarder la configuration</h2>

        {error && (
          <div className="bg-red-500/20 border border-red-500/30 text-red-300 px-4 py-2 rounded-lg mb-4">
            {error}
          </div>
        )}

        <div className="mb-4">
          <h3 className="text-sm font-medium text-purple-300 mb-2">Résumé des modifications</h3>
          <div
            className="bg-black/60 p-4 rounded-md text-sm text-gray-300 max-h-[350px] overflow-y-auto font-mono border border-gray-800 whitespace-pre"
            dangerouslySetInnerHTML={{ __html: changesSummary }}
          />
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <Label htmlFor="snapshotName" className="text-gray-200 font-medium">
                Nom de la sauvegarde
              </Label>
              <Input
                id="snapshotName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-purple-500/10 border-purple-500/20 focus:border-purple-500/50 text-white mt-1"
                placeholder="ex: Mise à jour section stream"
                disabled={isSubmitting}
              />
            </div>

            <div>
              <Label htmlFor="snapshotDescription" className="text-gray-200 font-medium">
                Description (optionnelle)
              </Label>
              <Textarea
                id="snapshotDescription"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="bg-purple-500/10 border-purple-500/20 focus:border-purple-500/50 text-white mt-1"
                placeholder="Décrivez brièvement les modifications apportées..."
                rows={3}
                disabled={isSubmitting}
              />
            </div>

            <div className="flex justify-end space-x-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="border-gray-600 text-gray-300 hover:bg-gray-800"
                disabled={isSubmitting}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-6"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <RefreshCcw className="mr-2 h-4 w-4 animate-spin" />
                    Sauvegarde...
                  </>
                ) : (
                  'Sauvegarder'
                )}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

type ConfigSection = 'general' | 'appearance' | 'homepage' | 'notifications' | 'security' | 'api';

// Définir les types pour chaque section de configuration
interface GeneralConfig {
  siteName: string;
  siteDescription: string;
  contactEmail: string;
  timeZone: string;
  dateFormat: string;
}

interface AppearanceConfig {
  primaryColor: string;
  secondaryColor: string;
  darkMode: boolean;
  animationsEnabled: boolean;
  logoUrl: string;
  faviconUrl: string;
}

interface HomepageConfig {
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

interface NotificationsConfig {
  emailNotifications: boolean;
  adminAlerts: boolean;
  newUserNotifications: boolean;
  eventReminders: boolean;
  marketingEmails: boolean;
}

interface SecurityConfig {
  twoFactorAuth: boolean;
  passwordExpiration: number;
  ipRestriction: boolean;
  failedLoginLimit: number;
  sessionTimeout: number;
}

interface ApiConfig {
  apiEnabled: boolean;
  rateLimit: number;
  webhookUrl: string;
  umamiEnabled: boolean;
  umamiSiteId: string;
}

// Type global pour toutes les configurations
interface AllConfigs {
  general: GeneralConfig;
  appearance: AppearanceConfig;
  homepage: HomepageConfig;
  notifications: NotificationsConfig;
  security: SecurityConfig;
  api: ApiConfig;
}

const initialGeneralConfig: GeneralConfig = {
  siteName: '',
  siteDescription: '',
  contactEmail: '',
  timeZone: 'Europe/Paris',
  dateFormat: 'DD/MM/YYYY',
};

const initialAppearanceConfig: AppearanceConfig = {
  primaryColor: '#8B5CF6',
  secondaryColor: '#3B82F6',
  darkMode: true,
  animationsEnabled: true,
  logoUrl: '',
  faviconUrl: '',
};

const initialHomepageConfig: HomepageConfig = {
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
  twitchUsername: 'djlarian',
  twitchFollowButtonText: 'Follow on Twitch',
  twitchFollowButtonUrl: 'https://twitch.tv/djlarian',
  streamNotifyButtonText: 'Get Notified',
  streamStatsEnabled: true,
  streamFollowers: '24K+',
  streamHoursStreamed: '150+',
  streamTracksPlayed: '500+',
};

const initialNotificationsConfig: NotificationsConfig = {
  emailNotifications: true,
  adminAlerts: true,
  newUserNotifications: true,
  eventReminders: true,
  marketingEmails: false,
};

const initialSecurityConfig: SecurityConfig = {
  twoFactorAuth: false,
  passwordExpiration: 90,
  ipRestriction: false,
  failedLoginLimit: 5,
  sessionTimeout: 60,
};

const initialApiConfig: ApiConfig = {
  apiEnabled: true,
  rateLimit: 100,
  webhookUrl: '',
  umamiEnabled: false,
  umamiSiteId: '',
};

export default function ConfigurationPage() {
  const [activeSection, setActiveSection] = useState<ConfigSection>('general');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSnapshotModalOpen, setIsSnapshotModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [lastSavedConfig, setLastSavedConfig] = useState<AllConfigs | null>(null);

  // États pour stocker les configurations avec les types et valeurs initiales
  const [generalConfig, setGeneralConfig] = useState<GeneralConfig>(initialGeneralConfig);
  const [appearanceConfig, setAppearanceConfig] =
    useState<AppearanceConfig>(initialAppearanceConfig);
  const [homepageConfig, setHomepageConfig] = useState<HomepageConfig>(initialHomepageConfig);
  const [notificationsConfig, setNotificationsConfig] = useState<NotificationsConfig>(
    initialNotificationsConfig
  );
  const [securityConfig, setSecurityConfig] = useState<SecurityConfig>(initialSecurityConfig);
  const [apiConfig, setApiConfig] = useState<ApiConfig>(initialApiConfig);

  // Fonction pour récupérer les configurations depuis l'API
  const fetchConfigurations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/config');

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: AllConfigs = await response.json();

      // Mettre à jour les états avec les données de l'API
      // S'assurer que les clés existent avant de les assigner
      if (data.general) setGeneralConfig(data.general);
      if (data.appearance) setAppearanceConfig(data.appearance);
      if (data.homepage) setHomepageConfig(data.homepage);
      if (data.notifications) setNotificationsConfig(data.notifications);
      if (data.security) setSecurityConfig(data.security);
      if (data.api) setApiConfig(data.api);

      // Stocker la configuration récupérée comme dernière configuration sauvegardée
      setLastSavedConfig(data);
    } catch (e) {
      console.error('Erreur lors de la récupération des configurations:', e);

      // En cas d'erreur avec l'API, utiliser des valeurs par défaut pour pouvoir continuer
      // Mode de secours (fallback) pour le développement
      console.log('Utilisation des valeurs par défaut (mode fallback)');

      // Valeurs par défaut pour chaque section - utilisées uniquement si l'API échoue
      setGeneralConfig({
        siteName: 'DJ Larian',
        siteDescription: 'Site officiel de DJ Larian - Musique électronique et événements.',
        contactEmail: 'contact@djlarian.com',
        timeZone: 'Europe/Paris',
        dateFormat: 'DD/MM/YYYY',
      });

      setAppearanceConfig({
        primaryColor: '#8B5CF6',
        secondaryColor: '#3B82F6',
        darkMode: true,
        animationsEnabled: true,
        logoUrl: '/images/logo.png',
        faviconUrl: '/favicon.ico',
      });

      setHomepageConfig({
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
        twitchUsername: 'djlarian',
        twitchFollowButtonText: 'Follow on Twitch',
        twitchFollowButtonUrl: 'https://twitch.tv/djlarian',
        streamNotifyButtonText: 'Get Notified',
        streamStatsEnabled: true,
        streamFollowers: '24K+',
        streamHoursStreamed: '150+',
        streamTracksPlayed: '500+',
      });

      setNotificationsConfig({
        emailNotifications: true,
        adminAlerts: true,
        newUserNotifications: true,
        eventReminders: true,
        marketingEmails: false,
      });

      setSecurityConfig({
        twoFactorAuth: false,
        passwordExpiration: 90,
        ipRestriction: false,
        failedLoginLimit: 5,
        sessionTimeout: 60,
      });

      setApiConfig({
        apiEnabled: true,
        rateLimit: 100,
        webhookUrl: '',
        umamiEnabled: true,
        umamiSiteId: 'your-umami-site-id',
      });

      // Toujours afficher l'erreur pour le débogage, mais ne pas bloquer l'UI
      setError(
        "Mode fallback activé - La connexion à l'API a échoué, mais l'interface reste fonctionnelle avec des valeurs par défaut."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // Charger les configurations au montage du composant
  useEffect(() => {
    fetchConfigurations();
  }, [fetchConfigurations]);

  // Fonction pour sauvegarder les configurations
  const saveConfigurations = async () => {
    setIsSaveModalOpen(true);
  };

  // Fonction pour effectuer la sauvegarde avec un nom personnalisé
  const handleSaveWithName = async (name: string, description: string) => {
    setLoading(true);
    setError(null);
    const allConfigs: AllConfigs = {
      general: generalConfig,
      appearance: appearanceConfig,
      homepage: homepageConfig,
      notifications: notificationsConfig,
      security: securityConfig,
      api: apiConfig,
    };

    try {
      const response = await fetch('/api/admin/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          configs: allConfigs,
          snapshot: true,
          snapshotName: name,
          snapshotDescription: description,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Stocker la configuration qui vient d'être sauvegardée
      setLastSavedConfig(allConfigs);

      // Afficher une notification de succès
      console.log('Configurations sauvegardées avec succès !');
      alert('Configurations sauvegardées avec succès !');
    } catch (e) {
      console.error('Erreur lors de la sauvegarde des configurations:', e);
      setError('Impossible de sauvegarder les configurations. Veuillez réessayer.');
      alert('Erreur lors de la sauvegarde. Voir la console pour plus de détails.');
      throw e;
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour réinitialiser les configurations
  const resetConfigurations = async () => {
    if (
      confirm('Êtes-vous sûr de vouloir réinitialiser les configurations aux valeurs par défaut ?')
    ) {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/admin/config/reset', { method: 'POST' });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        console.log('Configurations réinitialisées avec succès !');
        // Recharger les configurations après la réinitialisation
        await fetchConfigurations();
      } catch (e) {
        console.error('Erreur lors de la réinitialisation des configurations:', e);
        setError('Impossible de réinitialiser les configurations. Veuillez réessayer.');
      } finally {
        setLoading(false);
      }
    }
  };

  // Fonction pour créer un snapshot des configurations actuelles
  const createSnapshot = async (name: string, description: string) => {
    setLoading(true);
    setError(null);
    const allConfigs: AllConfigs = {
      general: generalConfig,
      appearance: appearanceConfig,
      homepage: homepageConfig,
      notifications: notificationsConfig,
      security: securityConfig,
      api: apiConfig,
    };

    try {
      const response = await fetch('/api/admin/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          configs: allConfigs,
          snapshot: true,
          snapshotName: name,
          snapshotDescription: description,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Afficher une notification de succès
      console.log('Snapshot créé avec succès !');
      alert('Snapshot créé avec succès !');
    } catch (e) {
      console.error('Erreur lors de la création du snapshot:', e);
      setError('Impossible de créer le snapshot. Veuillez réessayer.');
      alert('Erreur lors de la création du snapshot. Voir la console pour plus de détails.');
      throw e; // Propager l'erreur pour que le modal puisse la gérer
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour annuler une modification spécifique
  const handleRevertChange = async (historyItem: any) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/config/history', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'revert-change',
          id: historyItem.id,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      console.log('Modification annulée avec succès !');
      // Recharger les configurations après l'annulation
      await fetchConfigurations();
    } catch (e) {
      console.error("Erreur lors de l'annulation de la modification:", e);
      setError("Impossible d'annuler la modification. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour appliquer un snapshot
  const handleApplySnapshot = async (snapshot: any) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/config/history', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'apply-snapshot',
          id: snapshot.id,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      console.log('Snapshot appliqué avec succès !');
      alert('Les configurations ont été restaurées depuis le snapshot.');
      // Recharger les configurations après l'application du snapshot
      await fetchConfigurations();
    } catch (e) {
      console.error("Erreur lors de l'application du snapshot:", e);
      setError("Impossible d'appliquer le snapshot. Veuillez réessayer.");
      alert('Erreur lors de la restauration du snapshot. Voir la console pour plus de détails.');
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour générer un résumé des modifications apportées
  const getChangesSummary = () => {
    if (!lastSavedConfig) return 'Aucune information sur la dernière configuration sauvegardée.';

    const changes: string[] = [];

    // Mappings des noms techniques vers des noms plus lisibles
    const labelMappings: Record<string, string> = {
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

    // Vérifier les modifications dans la section générale
    const generalChanges = Object.keys(generalConfig)
      .filter(
        (key) =>
          generalConfig[key as keyof GeneralConfig] !==
          lastSavedConfig.general[key as keyof GeneralConfig]
      )
      .map((key) => {
        const previousValue = lastSavedConfig.general[key as keyof GeneralConfig];
        const newValue = generalConfig[key as keyof GeneralConfig];
        const label = labelMappings[key] || key;
        return `    ${label}\n        <span class="text-gray-500">${previousValue}</span> <span class="text-cyan-300">→</span> <span class="text-white font-semibold">${newValue}</span>`;
      });

    if (generalChanges.length > 0) {
      changes.push(
        `<span class="text-cyan-300 font-bold">Général:</span>\n${generalChanges.join('\n')}`
      );
    }

    // Vérifier les modifications dans l'apparence
    const appearanceChanges = Object.keys(appearanceConfig)
      .filter(
        (key) =>
          appearanceConfig[key as keyof AppearanceConfig] !==
          lastSavedConfig.appearance[key as keyof AppearanceConfig]
      )
      .map((key) => {
        const previousValue = lastSavedConfig.appearance[key as keyof AppearanceConfig];
        const newValue = appearanceConfig[key as keyof AppearanceConfig];
        const label = labelMappings[key] || key;
        return `    ${label}\n        <span class="text-gray-500">${previousValue}</span> <span class="text-cyan-300">→</span> <span class="text-white font-semibold">${newValue}</span>`;
      });

    if (appearanceChanges.length > 0) {
      changes.push(
        `<span class="text-cyan-300 font-bold">Apparence:</span>\n${appearanceChanges.join('\n')}`
      );
    }

    // Vérifier les modifications dans la page d'accueil
    const homepageChanges = Object.keys(homepageConfig)
      .filter(
        (key) =>
          homepageConfig[key as keyof HomepageConfig] !==
          lastSavedConfig.homepage[key as keyof HomepageConfig]
      )
      .map((key) => {
        const previousValue = lastSavedConfig.homepage[key as keyof HomepageConfig];
        const newValue = homepageConfig[key as keyof HomepageConfig];
        const label = labelMappings[key] || key;
        return `    ${label}\n        <span class="text-gray-500">${previousValue}</span> <span class="text-cyan-300">→</span> <span class="text-white font-semibold">${newValue}</span>`;
      });

    if (homepageChanges.length > 0) {
      changes.push(
        `<span class="text-cyan-300 font-bold">Page d'accueil:</span>\n${homepageChanges.join('\n')}`
      );
    }

    // Vérifier les modifications dans les notifications
    const notificationsChanges = Object.keys(notificationsConfig)
      .filter(
        (key) =>
          notificationsConfig[key as keyof NotificationsConfig] !==
          lastSavedConfig.notifications[key as keyof NotificationsConfig]
      )
      .map((key) => {
        const previousValue = lastSavedConfig.notifications[key as keyof NotificationsConfig];
        const newValue = notificationsConfig[key as keyof NotificationsConfig];
        const label = labelMappings[key] || key;
        return `    ${label}\n        <span class="text-gray-500">${previousValue}</span> <span class="text-cyan-300">→</span> <span class="text-white font-semibold">${newValue}</span>`;
      });

    if (notificationsChanges.length > 0) {
      changes.push(
        `<span class="text-cyan-300 font-bold">Notifications:</span>\n${notificationsChanges.join('\n')}`
      );
    }

    // Vérifier les modifications dans la sécurité
    const securityChanges = Object.keys(securityConfig)
      .filter(
        (key) =>
          securityConfig[key as keyof SecurityConfig] !==
          lastSavedConfig.security[key as keyof SecurityConfig]
      )
      .map((key) => {
        const previousValue = lastSavedConfig.security[key as keyof SecurityConfig];
        const newValue = securityConfig[key as keyof SecurityConfig];
        const label = labelMappings[key] || key;
        return `    ${label}\n        <span class="text-gray-500">${previousValue}</span> <span class="text-cyan-300">→</span> <span class="text-white font-semibold">${newValue}</span>`;
      });

    if (securityChanges.length > 0) {
      changes.push(
        `<span class="text-cyan-300 font-bold">Sécurité:</span>\n${securityChanges.join('\n')}`
      );
    }

    // Vérifier les modifications dans l'API
    const apiChanges = Object.keys(apiConfig)
      .filter(
        (key) => apiConfig[key as keyof ApiConfig] !== lastSavedConfig.api[key as keyof ApiConfig]
      )
      .map((key) => {
        const previousValue = lastSavedConfig.api[key as keyof ApiConfig];
        const newValue = apiConfig[key as keyof ApiConfig];
        const label = labelMappings[key] || key;
        return `    ${label}\n        <span class="text-gray-500">${previousValue}</span> <span class="text-cyan-300">→</span> <span class="text-white font-semibold">${newValue}</span>`;
      });

    if (apiChanges.length > 0) {
      changes.push(`<span class="text-cyan-300 font-bold">API:</span>\n${apiChanges.join('\n')}`);
    }

    if (changes.length === 0) {
      return 'Aucune modification détectée.';
    }

    return changes.join('\n\n');
  };

  if (loading && !generalConfig.siteName) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-[#0c0117] to-black">
        <p className="text-white text-xl animate-pulse">Chargement des configurations...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-black via-[#0c0117] to-black text-red-400">
        <p className="text-xl mb-4">{error}</p>
        <div className="flex space-x-4">
          <Button onClick={fetchConfigurations} className="bg-red-500/20 hover:bg-red-500/30">
            Réessayer
          </Button>

          <Button
            onClick={async () => {
              try {
                setLoading(true);
                const response = await fetch('/api/admin/setup-config');
                if (!response.ok) {
                  throw new Error(`Erreur: ${response.status}`);
                }
                const data = await response.json();
                console.log("Résultat de l'initialisation:", data);
                alert('Tables de configuration initialisées. Veuillez rafraîchir la page.');
                // Rafraîchir les configurations après l'initialisation
                await fetchConfigurations();
              } catch (e) {
                console.error("Erreur lors de l'initialisation des configurations:", e);
                alert("Erreur lors de l'initialisation. Voir la console pour plus de détails.");
              } finally {
                setLoading(false);
              }
            }}
            className="bg-green-500/20 hover:bg-green-500/30"
          >
            Initialiser les tables de configuration
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-[#0c0117] to-black text-white">
      {loading && (
        <div className="fixed top-4 right-4 z-50">
          <div className="flex items-center space-x-2 bg-purple-900/80 backdrop-blur-sm text-white text-xs font-semibold px-3 py-1 rounded-full shadow-lg animate-pulse">
            <RefreshCcw className="h-3 w-3 animate-spin" />
            <span>Opération en cours...</span>
          </div>
        </div>
      )}
      <div className="container mx-auto px-4 py-12">
        <div className="mb-8">
          <Link
            href="/admin"
            className="flex items-center text-purple-400 hover:text-purple-300 transition-colors mb-6"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour au panel admin
          </Link>

          <div className="flex justify-between items-center mb-4">
            <h1 className="text-4xl font-audiowide text-white">
              <span className="text-gradient">Configuration</span>
            </h1>

            <div className="flex space-x-3">
              <Button
                className={`flex items-center bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={saveConfigurations}
                disabled={loading}
              >
                <Save className="mr-2 h-4 w-4" />
                Sauvegarder
              </Button>

              <Button
                variant="outline"
                className={`flex items-center border border-blue-500/30 text-blue-400 hover:bg-blue-500/10 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => setIsHistoryModalOpen(true)}
                disabled={loading}
              >
                <History className="mr-2 h-4 w-4" />
                Historique
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 lg:col-span-3">
            <div className="glass p-6 rounded-xl backdrop-blur-md border border-purple-500/20">
              <h2 className="text-xl font-semibold mb-4 text-purple-300">Sections</h2>
              <nav className="space-y-1">
                <button
                  onClick={() => setActiveSection('general')}
                  className={`w-full flex items-center p-3 rounded-lg transition-all ${
                    activeSection === 'general'
                      ? 'bg-purple-500/20 text-purple-300'
                      : 'hover:bg-purple-500/10 text-gray-300'
                  }`}
                >
                  <Settings className="h-5 w-5 mr-3" />
                  Général
                </button>

                <button
                  onClick={() => setActiveSection('appearance')}
                  className={`w-full flex items-center p-3 rounded-lg transition-all ${
                    activeSection === 'appearance'
                      ? 'bg-purple-500/20 text-purple-300'
                      : 'hover:bg-purple-500/10 text-gray-300'
                  }`}
                >
                  <Layout className="h-5 w-5 mr-3" />
                  Apparence
                </button>

                <button
                  onClick={() => setActiveSection('homepage')}
                  className={`w-full flex items-center p-3 rounded-lg transition-all ${
                    activeSection === 'homepage'
                      ? 'bg-purple-500/20 text-purple-300'
                      : 'hover:bg-purple-500/10 text-gray-300'
                  }`}
                >
                  <Home className="h-5 w-5 mr-3" />
                  Page d'accueil
                </button>

                <button
                  onClick={() => setActiveSection('notifications')}
                  className={`w-full flex items-center p-3 rounded-lg transition-all ${
                    activeSection === 'notifications'
                      ? 'bg-purple-500/20 text-purple-300'
                      : 'hover:bg-purple-500/10 text-gray-300'
                  }`}
                >
                  <Bell className="h-5 w-5 mr-3" />
                  Notifications
                </button>

                <button
                  onClick={() => setActiveSection('security')}
                  className={`w-full flex items-center p-3 rounded-lg transition-all ${
                    activeSection === 'security'
                      ? 'bg-purple-500/20 text-purple-300'
                      : 'hover:bg-purple-500/10 text-gray-300'
                  }`}
                >
                  <Shield className="h-5 w-5 mr-3" />
                  Sécurité
                </button>

                <button
                  onClick={() => setActiveSection('api')}
                  className={`w-full flex items-center p-3 rounded-lg transition-all ${
                    activeSection === 'api'
                      ? 'bg-purple-500/20 text-purple-300'
                      : 'hover:bg-purple-500/10 text-gray-300'
                  }`}
                >
                  <Globe className="h-5 w-5 mr-3" />
                  API & Intégrations
                </button>
              </nav>

              <div className="mt-8 p-4 bg-purple-900/20 rounded-lg border border-purple-500/20">
                <h3 className="text-purple-300 font-semibold mb-2 flex items-center">
                  <Zap className="h-4 w-4 mr-2" />
                  Info
                </h3>
                <p className="text-xs text-gray-400">
                  Les modifications apportées aux configurations seront appliquées immédiatement
                  après la sauvegarde. Certains changements peuvent nécessiter un redémarrage du
                  serveur.
                </p>
              </div>
            </div>
          </div>

          <div className="col-span-12 lg:col-span-9">
            <div className="glass rounded-xl backdrop-blur-md overflow-hidden border border-purple-500/20">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-600/5 via-indigo-600/5 to-blue-600/5 opacity-70 transition-opacity"></div>

              {activeSection === 'general' && (
                <div className="p-6 relative z-10">
                  <h2 className="text-2xl font-audiowide text-white mb-6 pb-2 border-b border-purple-500/20">
                    Configuration Générale
                  </h2>

                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="siteName">Nom du site</Label>
                        <Input
                          id="siteName"
                          value={generalConfig.siteName}
                          onChange={(e) =>
                            setGeneralConfig({ ...generalConfig, siteName: e.target.value })
                          }
                          className="bg-purple-500/10 border-purple-500/20 focus:border-purple-500/50"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="contactEmail">Email de contact</Label>
                        <Input
                          id="contactEmail"
                          type="email"
                          value={generalConfig.contactEmail}
                          onChange={(e) =>
                            setGeneralConfig({ ...generalConfig, contactEmail: e.target.value })
                          }
                          className="bg-purple-500/10 border-purple-500/20 focus:border-purple-500/50"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="siteDescription">Description du site</Label>
                      <Textarea
                        id="siteDescription"
                        value={generalConfig.siteDescription}
                        onChange={(e) =>
                          setGeneralConfig({ ...generalConfig, siteDescription: e.target.value })
                        }
                        className="bg-purple-500/10 border-purple-500/20 focus:border-purple-500/50"
                        rows={3}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="timeZone">Fuseau horaire</Label>
                        <select
                          id="timeZone"
                          value={generalConfig.timeZone}
                          onChange={(e) =>
                            setGeneralConfig({ ...generalConfig, timeZone: e.target.value })
                          }
                          className="w-full bg-purple-500/10 border border-purple-500/20 focus:border-purple-500/50 rounded-md p-2 text-white"
                        >
                          <option value="Europe/Paris">Europe/Paris</option>
                          <option value="America/New_York">America/New_York</option>
                          <option value="Asia/Tokyo">Asia/Tokyo</option>
                          <option value="Australia/Sydney">Australia/Sydney</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="dateFormat">Format de date</Label>
                        <select
                          id="dateFormat"
                          value={generalConfig.dateFormat}
                          onChange={(e) =>
                            setGeneralConfig({ ...generalConfig, dateFormat: e.target.value })
                          }
                          className="w-full bg-purple-500/10 border border-purple-500/20 focus:border-purple-500/50 rounded-md p-2 text-white"
                        >
                          <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                          <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                          <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeSection === 'appearance' && (
                <div className="p-6 relative z-10">
                  <h2 className="text-2xl font-audiowide text-white mb-6 pb-2 border-b border-purple-500/20">
                    Apparence
                  </h2>

                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="primaryColor">Couleur primaire</Label>
                        <div className="flex items-center space-x-2">
                          <Input
                            id="primaryColor"
                            type="color"
                            value={appearanceConfig.primaryColor}
                            onChange={(e) =>
                              setAppearanceConfig({
                                ...appearanceConfig,
                                primaryColor: e.target.value,
                              })
                            }
                            className="w-16 h-10 p-1 bg-transparent border border-purple-500/20"
                          />
                          <Input
                            type="text"
                            value={appearanceConfig.primaryColor}
                            onChange={(e) =>
                              setAppearanceConfig({
                                ...appearanceConfig,
                                primaryColor: e.target.value,
                              })
                            }
                            className="bg-purple-500/10 border-purple-500/20 focus:border-purple-500/50"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="secondaryColor">Couleur secondaire</Label>
                        <div className="flex items-center space-x-2">
                          <Input
                            id="secondaryColor"
                            type="color"
                            value={appearanceConfig.secondaryColor}
                            onChange={(e) =>
                              setAppearanceConfig({
                                ...appearanceConfig,
                                secondaryColor: e.target.value,
                              })
                            }
                            className="w-16 h-10 p-1 bg-transparent border border-purple-500/20"
                          />
                          <Input
                            type="text"
                            value={appearanceConfig.secondaryColor}
                            onChange={(e) =>
                              setAppearanceConfig({
                                ...appearanceConfig,
                                secondaryColor: e.target.value,
                              })
                            }
                            className="bg-purple-500/10 border-purple-500/20 focus:border-purple-500/50"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="logoUrl">URL du logo</Label>
                        <Input
                          id="logoUrl"
                          value={appearanceConfig.logoUrl}
                          onChange={(e) =>
                            setAppearanceConfig({ ...appearanceConfig, logoUrl: e.target.value })
                          }
                          className="bg-purple-500/10 border-purple-500/20 focus:border-purple-500/50"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="faviconUrl">URL du favicon</Label>
                        <Input
                          id="faviconUrl"
                          value={appearanceConfig.faviconUrl}
                          onChange={(e) =>
                            setAppearanceConfig({ ...appearanceConfig, faviconUrl: e.target.value })
                          }
                          className="bg-purple-500/10 border-purple-500/20 focus:border-purple-500/50"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-purple-500/10 rounded-lg border border-purple-500/20">
                      <div className="flex items-center">
                        <span className="text-white mr-3">Mode sombre</span>
                        <span className="text-xs text-gray-400">
                          Activer le thème sombre par défaut
                        </span>
                      </div>
                      <Switch
                        checked={appearanceConfig.darkMode}
                        onCheckedChange={(checked) =>
                          setAppearanceConfig({ ...appearanceConfig, darkMode: checked })
                        }
                        className="data-[state=checked]:bg-purple-600"
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-purple-500/10 rounded-lg border border-purple-500/20">
                      <div className="flex items-center">
                        <span className="text-white mr-3">Animations</span>
                        <span className="text-xs text-gray-400">
                          Activer les animations de l'interface
                        </span>
                      </div>
                      <Switch
                        checked={appearanceConfig.animationsEnabled}
                        onCheckedChange={(checked) =>
                          setAppearanceConfig({ ...appearanceConfig, animationsEnabled: checked })
                        }
                        className="data-[state=checked]:bg-purple-600"
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeSection === 'homepage' && (
                <div className="p-6 relative z-10">
                  <h2 className="text-2xl font-audiowide text-white mb-6 pb-2 border-b border-purple-500/20">
                    Configuration de la page d'accueil
                  </h2>

                  <Tabs defaultValue="hero" className="w-full">
                    <TabsList className="flex mb-6 p-1 bg-black/30 border border-purple-500/20 rounded-xl overflow-hidden">
                      <TabsTrigger
                        value="hero"
                        className="flex-1 py-3 px-4 data-[state=active]:bg-purple-600/20 data-[state=active]:text-white data-[state=active]:shadow-[0_0_10px_rgba(139,92,246,0.3)] rounded-lg transition-all duration-200 data-[state=inactive]:text-gray-400 data-[state=inactive]:hover:text-purple-300"
                      >
                        <Home className="w-4 h-4 mr-2" />
                        Héro
                      </TabsTrigger>
                      <TabsTrigger
                        value="releases"
                        className="flex-1 py-3 px-4 data-[state=active]:bg-purple-600/20 data-[state=active]:text-white data-[state=active]:shadow-[0_0_10px_rgba(139,92,246,0.3)] rounded-lg transition-all duration-200 data-[state=inactive]:text-gray-400 data-[state=inactive]:hover:text-purple-300"
                      >
                        <Music className="w-4 h-4 mr-2" />
                        Sorties
                      </TabsTrigger>
                      <TabsTrigger
                        value="visualizer"
                        className="flex-1 py-3 px-4 data-[state=active]:bg-purple-600/20 data-[state=active]:text-white data-[state=active]:shadow-[0_0_10px_rgba(139,92,246,0.3)] rounded-lg transition-all duration-200 data-[state=inactive]:text-gray-400 data-[state=inactive]:hover:text-purple-300"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Visualiseur
                      </TabsTrigger>
                      <TabsTrigger
                        value="events"
                        className="flex-1 py-3 px-4 data-[state=active]:bg-purple-600/20 data-[state=active]:text-white data-[state=active]:shadow-[0_0_10px_rgba(139,92,246,0.3)] rounded-lg transition-all duration-200 data-[state=inactive]:text-gray-400 data-[state=inactive]:hover:text-purple-300"
                      >
                        <CalendarDays className="w-4 h-4 mr-2" />
                        Événements
                      </TabsTrigger>
                      <TabsTrigger
                        value="stream"
                        className="flex-1 py-3 px-4 data-[state=active]:bg-purple-600/20 data-[state=active]:text-white data-[state=active]:shadow-[0_0_10px_rgba(139,92,246,0.3)] rounded-lg transition-all duration-200 data-[state=inactive]:text-gray-400 data-[state=inactive]:hover:text-purple-300"
                      >
                        <Video className="w-4 h-4 mr-2" />
                        Stream
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="hero" className="space-y-6">
                      <div className="space-y-2">
                        <Label htmlFor="heroTitle">Titre principal</Label>
                        <Input
                          id="heroTitle"
                          value={homepageConfig.heroTitle}
                          onChange={(e) =>
                            setHomepageConfig({ ...homepageConfig, heroTitle: e.target.value })
                          }
                          className="bg-purple-500/10 border-purple-500/20 focus:border-purple-500/50"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="heroSubtitle">Sous-titre</Label>
                        <Input
                          id="heroSubtitle"
                          value={homepageConfig.heroSubtitle}
                          onChange={(e) =>
                            setHomepageConfig({ ...homepageConfig, heroSubtitle: e.target.value })
                          }
                          className="bg-purple-500/10 border-purple-500/20 focus:border-purple-500/50"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="heroExploreButtonText">Texte du bouton Explorer</Label>
                          <Input
                            id="heroExploreButtonText"
                            value={homepageConfig.heroExploreButtonText}
                            onChange={(e) =>
                              setHomepageConfig({
                                ...homepageConfig,
                                heroExploreButtonText: e.target.value,
                              })
                            }
                            className="bg-purple-500/10 border-purple-500/20 focus:border-purple-500/50"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="heroExploreButtonUrl">URL du bouton Explorer</Label>
                          <Input
                            id="heroExploreButtonUrl"
                            value={homepageConfig.heroExploreButtonUrl}
                            onChange={(e) =>
                              setHomepageConfig({
                                ...homepageConfig,
                                heroExploreButtonUrl: e.target.value,
                              })
                            }
                            className="bg-purple-500/10 border-purple-500/20 focus:border-purple-500/50"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="heroEventsButtonText">Texte du bouton Événements</Label>
                          <Input
                            id="heroEventsButtonText"
                            value={homepageConfig.heroEventsButtonText}
                            onChange={(e) =>
                              setHomepageConfig({
                                ...homepageConfig,
                                heroEventsButtonText: e.target.value,
                              })
                            }
                            className="bg-purple-500/10 border-purple-500/20 focus:border-purple-500/50"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="heroEventsButtonUrl">URL du bouton Événements</Label>
                          <Input
                            id="heroEventsButtonUrl"
                            value={homepageConfig.heroEventsButtonUrl}
                            onChange={(e) =>
                              setHomepageConfig({
                                ...homepageConfig,
                                heroEventsButtonUrl: e.target.value,
                              })
                            }
                            className="bg-purple-500/10 border-purple-500/20 focus:border-purple-500/50"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="heroBackgroundVideo">URL de la vidéo d'arrière-plan</Label>
                        <Input
                          id="heroBackgroundVideo"
                          value={homepageConfig.heroBackgroundVideo}
                          onChange={(e) =>
                            setHomepageConfig({
                              ...homepageConfig,
                              heroBackgroundVideo: e.target.value,
                            })
                          }
                          className="bg-purple-500/10 border-purple-500/20 focus:border-purple-500/50"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="heroPosterImage">
                          URL de l'image poster (fallback vidéo)
                        </Label>
                        <Input
                          id="heroPosterImage"
                          value={homepageConfig.heroPosterImage}
                          onChange={(e) =>
                            setHomepageConfig({
                              ...homepageConfig,
                              heroPosterImage: e.target.value,
                            })
                          }
                          className="bg-purple-500/10 border-purple-500/20 focus:border-purple-500/50"
                        />
                      </div>
                    </TabsContent>

                    <TabsContent value="releases" className="space-y-6">
                      <div className="flex items-center justify-between p-4 bg-purple-500/10 rounded-lg border border-purple-500/20">
                        <div className="flex flex-col">
                          <span className="text-white font-medium">Section Sorties</span>
                          <span className="text-xs text-gray-400">
                            Afficher la section des dernières sorties
                          </span>
                        </div>
                        <Switch
                          checked={homepageConfig.releasesEnabled}
                          onCheckedChange={(checked) =>
                            setHomepageConfig({ ...homepageConfig, releasesEnabled: checked })
                          }
                          className="data-[state=checked]:bg-purple-600"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="releasesTitle">Titre de la section</Label>
                        <Input
                          id="releasesTitle"
                          value={homepageConfig.releasesTitle}
                          onChange={(e) =>
                            setHomepageConfig({ ...homepageConfig, releasesTitle: e.target.value })
                          }
                          className="bg-purple-500/10 border-purple-500/20 focus:border-purple-500/50"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="releasesCount">Nombre de sorties à afficher</Label>
                        <Input
                          id="releasesCount"
                          type="number"
                          min="1"
                          max="6"
                          value={homepageConfig.releasesCount}
                          onChange={(e) =>
                            setHomepageConfig({
                              ...homepageConfig,
                              releasesCount: parseInt(e.target.value) || 3,
                            })
                          }
                          className="bg-purple-500/10 border-purple-500/20 focus:border-purple-500/50"
                        />
                      </div>
                    </TabsContent>

                    <TabsContent value="visualizer" className="space-y-6">
                      <div className="flex items-center justify-between p-4 bg-purple-500/10 rounded-lg border border-purple-500/20">
                        <div className="flex flex-col">
                          <span className="text-white font-medium">Section Visualiseur</span>
                          <span className="text-xs text-gray-400">
                            Afficher la section du visualiseur audio
                          </span>
                        </div>
                        <Switch
                          checked={homepageConfig.visualizerEnabled}
                          onCheckedChange={(checked) =>
                            setHomepageConfig({ ...homepageConfig, visualizerEnabled: checked })
                          }
                          className="data-[state=checked]:bg-purple-600"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="visualizerTitle">Titre de la section</Label>
                        <Input
                          id="visualizerTitle"
                          value={homepageConfig.visualizerTitle}
                          onChange={(e) =>
                            setHomepageConfig({
                              ...homepageConfig,
                              visualizerTitle: e.target.value,
                            })
                          }
                          className="bg-purple-500/10 border-purple-500/20 focus:border-purple-500/50"
                        />
                      </div>
                    </TabsContent>

                    <TabsContent value="events" className="space-y-6">
                      <div className="flex items-center justify-between p-4 bg-purple-500/10 rounded-lg border border-purple-500/20">
                        <div className="flex flex-col">
                          <span className="text-white font-medium">Section Événements</span>
                          <span className="text-xs text-gray-400">
                            Afficher la section des événements à venir
                          </span>
                        </div>
                        <Switch
                          checked={homepageConfig.eventsEnabled}
                          onCheckedChange={(checked) =>
                            setHomepageConfig({ ...homepageConfig, eventsEnabled: checked })
                          }
                          className="data-[state=checked]:bg-purple-600"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="eventsTitle">Titre de la section</Label>
                        <Input
                          id="eventsTitle"
                          value={homepageConfig.eventsTitle}
                          onChange={(e) =>
                            setHomepageConfig({ ...homepageConfig, eventsTitle: e.target.value })
                          }
                          className="bg-purple-500/10 border-purple-500/20 focus:border-purple-500/50"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="eventsCount">Nombre d'événements à afficher</Label>
                        <Input
                          id="eventsCount"
                          type="number"
                          min="1"
                          max="10"
                          value={homepageConfig.eventsCount}
                          onChange={(e) =>
                            setHomepageConfig({
                              ...homepageConfig,
                              eventsCount: parseInt(e.target.value) || 3,
                            })
                          }
                          className="bg-purple-500/10 border-purple-500/20 focus:border-purple-500/50"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="eventsViewAllText">Texte du lien "Voir tout"</Label>
                          <Input
                            id="eventsViewAllText"
                            value={homepageConfig.eventsViewAllText}
                            onChange={(e) =>
                              setHomepageConfig({
                                ...homepageConfig,
                                eventsViewAllText: e.target.value,
                              })
                            }
                            className="bg-purple-500/10 border-purple-500/20 focus:border-purple-500/50"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="eventsViewAllUrl">URL du lien "Voir tout"</Label>
                          <Input
                            id="eventsViewAllUrl"
                            value={homepageConfig.eventsViewAllUrl}
                            onChange={(e) =>
                              setHomepageConfig({
                                ...homepageConfig,
                                eventsViewAllUrl: e.target.value,
                              })
                            }
                            className="bg-purple-500/10 border-purple-500/20 focus:border-purple-500/50"
                          />
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="stream" className="space-y-6">
                      <div className="flex items-center justify-between p-4 bg-purple-500/10 rounded-lg border border-purple-500/20">
                        <div className="flex flex-col">
                          <span className="text-white font-medium">Section Stream</span>
                          <span className="text-xs text-gray-400">
                            Afficher la section de diffusion en direct
                          </span>
                        </div>
                        <Switch
                          checked={homepageConfig.streamEnabled}
                          onCheckedChange={(checked) =>
                            setHomepageConfig({ ...homepageConfig, streamEnabled: checked })
                          }
                          className="data-[state=checked]:bg-purple-600"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="streamTitle">Titre de la section</Label>
                        <Input
                          id="streamTitle"
                          value={homepageConfig.streamTitle}
                          onChange={(e) =>
                            setHomepageConfig({ ...homepageConfig, streamTitle: e.target.value })
                          }
                          className="bg-purple-500/10 border-purple-500/20 focus:border-purple-500/50"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="streamSubtitle">Sous-titre</Label>
                        <Input
                          id="streamSubtitle"
                          value={homepageConfig.streamSubtitle}
                          onChange={(e) =>
                            setHomepageConfig({ ...homepageConfig, streamSubtitle: e.target.value })
                          }
                          className="bg-purple-500/10 border-purple-500/20 focus:border-purple-500/50"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="streamDescription">Description</Label>
                        <Textarea
                          id="streamDescription"
                          value={homepageConfig.streamDescription}
                          onChange={(e) =>
                            setHomepageConfig({
                              ...homepageConfig,
                              streamDescription: e.target.value,
                            })
                          }
                          className="bg-purple-500/10 border-purple-500/20 focus:border-purple-500/50"
                          rows={3}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="twitchUsername">Nom d'utilisateur Twitch</Label>
                        <Input
                          id="twitchUsername"
                          value={homepageConfig.twitchUsername}
                          onChange={(e) =>
                            setHomepageConfig({ ...homepageConfig, twitchUsername: e.target.value })
                          }
                          className="bg-purple-500/10 border-purple-500/20 focus:border-purple-500/50"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="twitchFollowButtonText">Texte du bouton Suivre</Label>
                          <Input
                            id="twitchFollowButtonText"
                            value={homepageConfig.twitchFollowButtonText}
                            onChange={(e) =>
                              setHomepageConfig({
                                ...homepageConfig,
                                twitchFollowButtonText: e.target.value,
                              })
                            }
                            className="bg-purple-500/10 border-purple-500/20 focus:border-purple-500/50"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="twitchFollowButtonUrl">URL du bouton Suivre</Label>
                          <Input
                            id="twitchFollowButtonUrl"
                            value={homepageConfig.twitchFollowButtonUrl}
                            onChange={(e) =>
                              setHomepageConfig({
                                ...homepageConfig,
                                twitchFollowButtonUrl: e.target.value,
                              })
                            }
                            className="bg-purple-500/10 border-purple-500/20 focus:border-purple-500/50"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="streamNotifyButtonText">
                          Texte du bouton de notification
                        </Label>
                        <Input
                          id="streamNotifyButtonText"
                          value={homepageConfig.streamNotifyButtonText}
                          onChange={(e) =>
                            setHomepageConfig({
                              ...homepageConfig,
                              streamNotifyButtonText: e.target.value,
                            })
                          }
                          className="bg-purple-500/10 border-purple-500/20 focus:border-purple-500/50"
                        />
                      </div>

                      <div className="flex items-center justify-between p-4 bg-purple-500/10 rounded-lg border border-purple-500/20">
                        <div className="flex flex-col">
                          <span className="text-white font-medium">Statistiques de stream</span>
                          <span className="text-xs text-gray-400">
                            Afficher les statistiques de diffusion
                          </span>
                        </div>
                        <Switch
                          checked={homepageConfig.streamStatsEnabled}
                          onCheckedChange={(checked) =>
                            setHomepageConfig({
                              ...homepageConfig,
                              streamStatsEnabled: checked,
                            })
                          }
                          className="data-[state=checked]:bg-purple-600"
                        />
                      </div>

                      {homepageConfig.streamStatsEnabled && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div className="space-y-2">
                            <Label htmlFor="streamFollowers">Nombre de followers</Label>
                            <Input
                              id="streamFollowers"
                              value={homepageConfig.streamFollowers}
                              onChange={(e) =>
                                setHomepageConfig({
                                  ...homepageConfig,
                                  streamFollowers: e.target.value,
                                })
                              }
                              className="bg-purple-500/10 border-purple-500/20 focus:border-purple-500/50"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="streamHoursStreamed">Heures de stream</Label>
                            <Input
                              id="streamHoursStreamed"
                              value={homepageConfig.streamHoursStreamed}
                              onChange={(e) =>
                                setHomepageConfig({
                                  ...homepageConfig,
                                  streamHoursStreamed: e.target.value,
                                })
                              }
                              className="bg-purple-500/10 border-purple-500/20 focus:border-purple-500/50"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="streamTracksPlayed">Pistes jouées</Label>
                            <Input
                              id="streamTracksPlayed"
                              value={homepageConfig.streamTracksPlayed}
                              onChange={(e) =>
                                setHomepageConfig({
                                  ...homepageConfig,
                                  streamTracksPlayed: e.target.value,
                                })
                              }
                              className="bg-purple-500/10 border-purple-500/20 focus:border-purple-500/50"
                            />
                          </div>
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>

                  <div className="mt-8 space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="sectionsOrder" className="flex items-center justify-between">
                        <span>Ordre des sections</span>
                        <span className="text-xs text-gray-400">
                          Glissez-déposez pour réorganiser
                        </span>
                      </Label>

                      <div className="bg-black/30 p-1 rounded-lg border border-purple-500/20">
                        <DragDropContext
                          onDragEnd={(result) => {
                            // Ignorer les drops en dehors de la zone
                            if (!result.destination) return;

                            console.log('DragDropContext onDragEnd', result);

                            // Parse la chaîne actuelle en tableau
                            const sections = homepageConfig.sectionsOrder
                              .split(',')
                              .filter(Boolean);

                            console.log('Sections avant réorganisation:', sections);

                            // Réorganiser le tableau
                            const [reorderedItem] = sections.splice(result.source.index, 1);
                            sections.splice(result.destination.index, 0, reorderedItem);

                            console.log('Sections après réorganisation:', sections);
                            console.log('Nouvel ordre:', sections.join(','));

                            // Mettre à jour la configuration avec la nouvelle chaîne
                            setHomepageConfig({
                              ...homepageConfig,
                              sectionsOrder: sections.join(','),
                            });
                          }}
                          dragHandleUsageInstructions="Utilisez les poignées de glissement pour réorganiser les sections"
                        >
                          <Droppable droppableId="sections-list" direction="vertical">
                            {(provided) => (
                              <div
                                {...provided.droppableProps}
                                ref={provided.innerRef}
                                className="space-y-2 p-2 min-h-[100px] rounded-md overflow-hidden"
                                style={{
                                  background: 'rgba(139, 92, 246, 0.05)',
                                  position: 'relative',
                                }}
                              >
                                {homepageConfig.sectionsOrder
                                  .split(',')
                                  .filter(Boolean)
                                  .map((section, index) => {
                                    console.log(
                                      'Rendering draggable for section:',
                                      section,
                                      'index:',
                                      index
                                    );

                                    // Définir des icônes et des noms lisibles pour chaque section
                                    const getSectionInfo = (id: string) => {
                                      switch (id) {
                                        case 'hero':
                                          return {
                                            icon: <Home className="h-4 w-4" />,
                                            name: 'Héro',
                                          };
                                        case 'releases':
                                          return {
                                            icon: <Music className="h-4 w-4" />,
                                            name: 'Sorties',
                                          };
                                        case 'visualizer':
                                          return {
                                            icon: <Eye className="h-4 w-4" />,
                                            name: 'Visualiseur',
                                          };
                                        case 'events':
                                          return {
                                            icon: <CalendarDays className="h-4 w-4" />,
                                            name: 'Événements',
                                          };
                                        case 'stream':
                                          return {
                                            icon: <Video className="h-4 w-4" />,
                                            name: 'Stream',
                                          };
                                        default:
                                          return {
                                            icon: <div className="h-4 w-4" />,
                                            name: section,
                                          };
                                      }
                                    };

                                    const { icon, name } = getSectionInfo(section);

                                    return (
                                      <Draggable key={section} draggableId={section} index={index}>
                                        {(provided, snapshot) => {
                                          // Définir les styles pour contrôler le positionnement
                                          const draggableStyle = provided.draggableProps.style;
                                          const style = {
                                            ...draggableStyle,
                                            width: snapshot.isDragging
                                              ? 'calc(100% - 16px)'
                                              : undefined,
                                            boxSizing: 'border-box' as const,
                                          };

                                          return (
                                            <div
                                              ref={provided.innerRef}
                                              {...provided.draggableProps}
                                              {...provided.dragHandleProps}
                                              className={`bg-purple-500/10 rounded-md border ${
                                                snapshot.isDragging
                                                  ? 'border-cyan-400 shadow-lg bg-purple-800/30 z-50'
                                                  : 'border-purple-500/20 hover:bg-purple-500/20'
                                              } flex items-center p-3 group transition-colors`}
                                              style={style}
                                            >
                                              <div
                                                className={`mr-3 ${snapshot.isDragging ? 'text-cyan-300' : 'text-gray-500'} hover:text-gray-300`}
                                              >
                                                <GripVertical className="h-5 w-5" />
                                              </div>
                                              <div className="flex items-center text-white">
                                                <span
                                                  className={`mr-2 ${snapshot.isDragging ? 'text-cyan-300' : 'text-purple-400'}`}
                                                >
                                                  {icon}
                                                </span>
                                                <span
                                                  className={
                                                    snapshot.isDragging
                                                      ? 'font-medium text-white'
                                                      : ''
                                                  }
                                                >
                                                  {name}
                                                </span>
                                              </div>
                                              <div
                                                onClick={(e) => {
                                                  // Empêcher la propagation pour éviter de déclencher le drag
                                                  e.stopPropagation();

                                                  // Ne pas modifier hero car il est toujours actif
                                                  if (section !== 'hero') {
                                                    const prop =
                                                      `${section}Enabled` as keyof HomepageConfig;
                                                    setHomepageConfig({
                                                      ...homepageConfig,
                                                      [prop]: !homepageConfig[prop],
                                                    });
                                                  }
                                                }}
                                                className={`ml-auto px-2 py-1 text-xs rounded-full cursor-pointer ${
                                                  section === 'hero'
                                                    ? 'bg-blue-500/20 text-blue-300 cursor-default'
                                                    : homepageConfig[
                                                          `${section}Enabled` as keyof HomepageConfig
                                                        ]
                                                      ? 'bg-green-500/20 text-green-300 hover:bg-green-500/40'
                                                      : 'bg-red-500/20 text-red-300 hover:bg-red-500/40'
                                                }`}
                                              >
                                                {section === 'hero'
                                                  ? 'Toujours actif'
                                                  : homepageConfig[
                                                        `${section}Enabled` as keyof HomepageConfig
                                                      ]
                                                    ? 'Actif'
                                                    : 'Inactif'}
                                              </div>
                                            </div>
                                          );
                                        }}
                                      </Draggable>
                                    );
                                  })}
                                {provided.placeholder}
                              </div>
                            )}
                          </Droppable>
                        </DragDropContext>
                      </div>
                      <p className="text-xs text-gray-400">
                        L'ordre des sections détermine leur position sur la page d'accueil. Les
                        sections désactivées ne seront pas affichées.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {activeSection === 'notifications' && (
                <div className="p-6 relative z-10">
                  <h2 className="text-2xl font-audiowide text-white mb-6 pb-2 border-b border-purple-500/20">
                    Notifications
                  </h2>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-purple-500/10 rounded-lg border border-purple-500/20">
                      <div className="flex flex-col">
                        <span className="text-white font-medium">Notifications par email</span>
                        <span className="text-xs text-gray-400">
                          Envoyer des notifications par email
                        </span>
                      </div>
                      <Switch
                        checked={notificationsConfig.emailNotifications}
                        onCheckedChange={(checked) =>
                          setNotificationsConfig({
                            ...notificationsConfig,
                            emailNotifications: checked,
                          })
                        }
                        className="data-[state=checked]:bg-purple-600"
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-purple-500/10 rounded-lg border border-purple-500/20">
                      <div className="flex flex-col">
                        <span className="text-white font-medium">Alertes administrateur</span>
                        <span className="text-xs text-gray-400">
                          Recevoir des alertes pour les actions administratives
                        </span>
                      </div>
                      <Switch
                        checked={notificationsConfig.adminAlerts}
                        onCheckedChange={(checked) =>
                          setNotificationsConfig({ ...notificationsConfig, adminAlerts: checked })
                        }
                        className="data-[state=checked]:bg-purple-600"
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-purple-500/10 rounded-lg border border-purple-500/20">
                      <div className="flex flex-col">
                        <span className="text-white font-medium">Nouveaux utilisateurs</span>
                        <span className="text-xs text-gray-400">
                          Notifications lors de l'inscription de nouveaux utilisateurs
                        </span>
                      </div>
                      <Switch
                        checked={notificationsConfig.newUserNotifications}
                        onCheckedChange={(checked) =>
                          setNotificationsConfig({
                            ...notificationsConfig,
                            newUserNotifications: checked,
                          })
                        }
                        className="data-[state=checked]:bg-purple-600"
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-purple-500/10 rounded-lg border border-purple-500/20">
                      <div className="flex flex-col">
                        <span className="text-white font-medium">Rappels d'événements</span>
                        <span className="text-xs text-gray-400">
                          Rappels automatiques avant les événements
                        </span>
                      </div>
                      <Switch
                        checked={notificationsConfig.eventReminders}
                        onCheckedChange={(checked) =>
                          setNotificationsConfig({
                            ...notificationsConfig,
                            eventReminders: checked,
                          })
                        }
                        className="data-[state=checked]:bg-purple-600"
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-purple-500/10 rounded-lg border border-purple-500/20">
                      <div className="flex flex-col">
                        <span className="text-white font-medium">Emails marketing</span>
                        <span className="text-xs text-gray-400">
                          Envoyer des emails promotionnels aux utilisateurs
                        </span>
                      </div>
                      <Switch
                        checked={notificationsConfig.marketingEmails}
                        onCheckedChange={(checked) =>
                          setNotificationsConfig({
                            ...notificationsConfig,
                            marketingEmails: checked,
                          })
                        }
                        className="data-[state=checked]:bg-purple-600"
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeSection === 'security' && (
                <div className="p-6 relative z-10">
                  <h2 className="text-2xl font-audiowide text-white mb-6 pb-2 border-b border-purple-500/20">
                    Sécurité
                  </h2>

                  <div className="space-y-6">
                    <div className="flex items-center justify-between p-4 bg-purple-500/10 rounded-lg border border-purple-500/20">
                      <div className="flex flex-col">
                        <span className="text-white font-medium">
                          Authentification à deux facteurs
                        </span>
                        <span className="text-xs text-gray-400">
                          Exiger la 2FA pour les comptes administrateurs
                        </span>
                      </div>
                      <Switch
                        checked={securityConfig.twoFactorAuth}
                        onCheckedChange={(checked) =>
                          setSecurityConfig({ ...securityConfig, twoFactorAuth: checked })
                        }
                        className="data-[state=checked]:bg-purple-600"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="passwordExpiration">
                          Expiration du mot de passe (jours)
                        </Label>
                        <Input
                          id="passwordExpiration"
                          type="number"
                          value={securityConfig.passwordExpiration}
                          onChange={(e) =>
                            setSecurityConfig({
                              ...securityConfig,
                              passwordExpiration: parseInt(e.target.value),
                            })
                          }
                          min="0"
                          className="bg-purple-500/10 border-purple-500/20 focus:border-purple-500/50"
                        />
                        <p className="text-xs text-gray-400">0 = pas d'expiration</p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="failedLoginLimit">Limite de tentatives de connexion</Label>
                        <Input
                          id="failedLoginLimit"
                          type="number"
                          value={securityConfig.failedLoginLimit}
                          onChange={(e) =>
                            setSecurityConfig({
                              ...securityConfig,
                              failedLoginLimit: parseInt(e.target.value),
                            })
                          }
                          min="1"
                          className="bg-purple-500/10 border-purple-500/20 focus:border-purple-500/50"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="sessionTimeout">Timeout de session (minutes)</Label>
                      <Input
                        id="sessionTimeout"
                        type="number"
                        value={securityConfig.sessionTimeout}
                        onChange={(e) =>
                          setSecurityConfig({
                            ...securityConfig,
                            sessionTimeout: parseInt(e.target.value),
                          })
                        }
                        min="5"
                        className="bg-purple-500/10 border-purple-500/20 focus:border-purple-500/50"
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-purple-500/10 rounded-lg border border-purple-500/20">
                      <div className="flex flex-col">
                        <span className="text-white font-medium">Restriction IP</span>
                        <span className="text-xs text-gray-400">
                          Limiter l'accès admin à certaines adresses IP
                        </span>
                      </div>
                      <Switch
                        checked={securityConfig.ipRestriction}
                        onCheckedChange={(checked) =>
                          setSecurityConfig({ ...securityConfig, ipRestriction: checked })
                        }
                        className="data-[state=checked]:bg-purple-600"
                      />
                    </div>

                    <div className="p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                      <div className="flex items-start">
                        <Lock className="h-5 w-5 text-yellow-400 mr-3 mt-0.5" />
                        <p className="text-sm text-gray-300">
                          Les paramètres de sécurité avancés tels que les politiques de mot de passe
                          et les journaux d'audit peuvent être configurés via le panneau de sécurité
                          dédié.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeSection === 'api' && (
                <div className="p-6 relative z-10">
                  <h2 className="text-2xl font-audiowide text-white mb-6 pb-2 border-b border-purple-500/20">
                    API & Intégrations
                  </h2>

                  <div className="space-y-6">
                    <div className="flex items-center justify-between p-4 bg-purple-500/10 rounded-lg border border-purple-500/20">
                      <div className="flex flex-col">
                        <span className="text-white font-medium">API activée</span>
                        <span className="text-xs text-gray-400">Activer l'accès API</span>
                      </div>
                      <Switch
                        checked={apiConfig.apiEnabled}
                        onCheckedChange={(checked) =>
                          setApiConfig({ ...apiConfig, apiEnabled: checked })
                        }
                        className="data-[state=checked]:bg-purple-600"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="rateLimit">Limite de requêtes API (par minute)</Label>
                      <Input
                        id="rateLimit"
                        type="number"
                        value={apiConfig.rateLimit}
                        onChange={(e) =>
                          setApiConfig({ ...apiConfig, rateLimit: parseInt(e.target.value) })
                        }
                        min="10"
                        className="bg-purple-500/10 border-purple-500/20 focus:border-purple-500/50"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="webhookUrl">URL de Webhook</Label>
                      <Input
                        id="webhookUrl"
                        type="url"
                        value={apiConfig.webhookUrl}
                        onChange={(e) => setApiConfig({ ...apiConfig, webhookUrl: e.target.value })}
                        placeholder="https://example.com/webhook"
                        className="bg-purple-500/10 border-purple-500/20 focus:border-purple-500/50"
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-purple-500/10 rounded-lg border border-purple-500/20">
                      <div className="flex flex-col">
                        <span className="text-white font-medium">Umami Analytics</span>
                        <span className="text-xs text-gray-400">Activer le suivi Umami</span>
                      </div>
                      <Switch
                        checked={apiConfig.umamiEnabled}
                        onCheckedChange={(checked) =>
                          setApiConfig({ ...apiConfig, umamiEnabled: checked })
                        }
                        className="data-[state=checked]:bg-purple-600"
                      />
                    </div>

                    {apiConfig.umamiEnabled && (
                      <div className="space-y-2">
                        <Label htmlFor="umamiSiteId">ID du site Umami</Label>
                        <Input
                          id="umamiSiteId"
                          value={apiConfig.umamiSiteId}
                          onChange={(e) =>
                            setApiConfig({ ...apiConfig, umamiSiteId: e.target.value })
                          }
                          className="bg-purple-500/10 border-purple-500/20 focus:border-purple-500/50"
                        />
                      </div>
                    )}

                    <div className="p-4 bg-purple-900/20 rounded-lg border border-purple-500/20">
                      <div className="flex items-start">
                        <RefreshCcw className="h-5 w-5 text-purple-400 mr-3 mt-0.5" />
                        <div>
                          <h3 className="text-purple-300 font-semibold mb-1">
                            Régénérer les clés API
                          </h3>
                          <p className="text-xs text-gray-400 mb-3">
                            Vous pouvez régénérer vos clés API si nécessaire. Toutes les
                            applications utilisant actuellement ces clés devront être mises à jour.
                          </p>
                          <Button
                            variant="outline"
                            className="border border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
                          >
                            Régénérer les clés API
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
          <Card className="glass border-purple-500/20 bg-transparent">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center text-gray-400">
                <User className="h-4 w-4 mr-2" />
                Version
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-white">v1.5.2</p>
              <p className="text-xs text-gray-400">Dernière mise à jour: 15/09/2023</p>
            </CardContent>
          </Card>

          <Card className="glass border-purple-500/20 bg-transparent">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center text-gray-400">
                <Database className="h-4 w-4 mr-2" />
                Base de données
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-white">Connectée</p>
              <p className="text-xs text-gray-400">PostgreSQL v14.5</p>
            </CardContent>
          </Card>

          <Card className="glass border-purple-500/20 bg-transparent">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center text-gray-400">
                <Clock className="h-4 w-4 mr-2" />
                Uptime
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-white">99.8%</p>
              <p className="text-xs text-gray-400">Dernier redémarrage: 45 jours</p>
            </CardContent>
          </Card>

          <Card className="glass border-purple-500/20 bg-transparent">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center text-gray-400">
                <Calendar className="h-4 w-4 mr-2" />
                Maintenance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-white">Planifiée</p>
              <p className="text-xs text-gray-400">Prochaine: 28/10/2023</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal pour l'historique et les snapshots */}
      <HistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        onRevertChange={handleRevertChange}
        onApplySnapshot={handleApplySnapshot}
      />

      {/* Modal pour la sauvegarde avec nom personnalisé */}
      <SaveConfigModal
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
        onSave={handleSaveWithName}
        changesSummary={getChangesSummary()}
      />
    </div>
  );
}
