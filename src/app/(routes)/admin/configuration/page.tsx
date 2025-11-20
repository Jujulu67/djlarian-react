'use client';

import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import isEqual from 'lodash/isEqual'; // Import de isEqual
import {
  ArrowLeft,
  Settings,
  Globe,
  Layout,
  Bell,
  Shield,
  Save,
  Zap,
  Clock,
  Calendar,
  User,
  Database,
  RefreshCcw,
  Home,
  History,
  Image as ImageIcon,
} from 'lucide-react';
import dynamic from 'next/dynamic'; // Import pour le chargement dynamique
import Link from 'next/link';
import { useState, useEffect, useCallback, useRef } from 'react';

import DatabaseSwitch from '@/components/admin/DatabaseSwitch'; // Import du switch de base de données
import ToggleRow from '@/components/config/ToggleRow'; // Import du composant ToggleRow
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import Modal from '@/components/ui/Modal';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { logger } from '@/lib/logger';
import { isNotEmpty } from '@/lib/utils/arrayHelpers';
import { useConfigs } from '@/stores/useConfigs'; // Import du store Zustand
import {
  AllConfigs,
  initialConfigs,
  GeneralConfig,
  AppearanceConfig,
  HomepageConfig,
  NotificationsConfig,
  SecurityConfig,
  ApiConfig,
  ConfigSection,
} from '@/types/config'; // Import centralisé

import HistoryModal from './components/HistoryModal';

// Chargement dynamique des composants d'onglet
const HomepageTab = dynamic(() => import('./tabs/HomepageTab'), {
  ssr: false,
  loading: () => <TabLoader />,
});
const AppearanceTab = dynamic(() => import('./tabs/AppearanceTab'), {
  ssr: false,
  loading: () => <TabLoader />,
});
const SecurityTab = dynamic(() => import('./tabs/SecurityTab'), {
  ssr: false,
  loading: () => <TabLoader />,
});
const ApiTab = dynamic(() => import('./tabs/ApiTab'), {
  ssr: false,
  loading: () => <TabLoader />,
});
const ImagesTab = dynamic(() => import('./tabs/ImagesTab'), {
  ssr: false,
  loading: () => <TabLoader />,
});

// Composant de chargement simple pour les onglets dynamiques
const TabLoader = () => (
  <div className="p-6 flex justify-center items-center min-h-[200px]">
    <RefreshCcw className="h-6 w-6 animate-spin text-purple-400" />
  </div>
);

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
      logger.error(
        'Erreur lors de la sauvegarde:',
        err instanceof Error ? err.message : String(err)
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      maxWidth="max-w-2xl"
      showLoader={false}
      bgClass="glass bg-opacity-90"
      borderClass="border-purple-500/30"
      onClose={onClose}
    >
      <div className="w-full">
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
    </Modal>
  );
};

export default function ConfigurationPage() {
  const [activeSection, setActiveSection] = useState<ConfigSection>('general');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true); // Commence en chargement
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Utilisation du store Zustand
  const configurations = useConfigs();
  const {
    general,
    appearance,
    homepage,
    notifications,
    security,
    api,
    update,
    setAllConfigs,
    resetConfigs,
  } = configurations;

  // Ref pour stocker la configuration précédente pour le diff
  const previousConfigs = useRef<AllConfigs | null>(null);

  // --- MOCK IMAGES ---
  // (SUPPRIMÉ : toute la gestion d'état et de logique images, car déléguée à GestionImages)
  // ... existing code ...

  // --- Actions ---
  // (SUPPRIMÉ : fonctions handleRefresh, handleView, handleDownload, handleDelete, handleGoToLinked inutiles)
  // ... existing code ...

  // Fonction pour récupérer les configurations depuis l'API
  const fetchConfigurations = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/config');

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: AllConfigs = await response.json();

      // Mettre à jour le store Zustand avec les données de l'API
      setAllConfigs(data);
      // Stocker la configuration chargée comme référence pour le diff
      previousConfigs.current = JSON.parse(JSON.stringify(data)); // Copie profonde simple
    } catch (e) {
      logger.error(
        'Erreur lors de la récupération des configurations:',
        e instanceof Error ? e.message : String(e)
      );
      logger.debug('Utilisation des valeurs par défaut (mode fallback)');
      // Utiliser les valeurs initiales du store en cas d'erreur
      resetConfigs();
      previousConfigs.current = JSON.parse(JSON.stringify(initialConfigs)); // Utiliser les initiales comme ref

      // Toujours afficher l'erreur pour le débogage, mais ne pas bloquer l'UI
      setError(
        "Mode fallback activé - La connexion à l'API a échoué, mais l'interface reste fonctionnelle avec des valeurs par défaut."
      );
    } finally {
      setIsLoading(false);
    }
  }, [setAllConfigs, resetConfigs]); // Ajouter les dépendances du store

  // Charger les configurations au montage du composant
  useEffect(() => {
    fetchConfigurations();
  }, [fetchConfigurations]);

  // Fonction pour ouvrir la modale de sauvegarde
  const openSaveModal = () => {
    setSaveModalOpen(true);
  };

  // Fonction pour effectuer la sauvegarde avec un nom personnalisé
  const handleSaveWithName = async (name: string, description: string) => {
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null); // Réinitialiser le message de succès

    // Lire les configurations actuelles depuis le store Zustand
    const currentConfigs: AllConfigs = {
      general,
      appearance,
      homepage,
      notifications,
      security,
      api,
    };

    try {
      const response = await fetch('/api/admin/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          configs: currentConfigs, // Utiliser les configs du store
          snapshot: true,
          snapshotName: name,
          snapshotDescription: description,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Mettre à jour la référence pour le diff après une sauvegarde réussie
      previousConfigs.current = JSON.parse(JSON.stringify(currentConfigs));

      // La config est déjà à jour dans le store, pas besoin de setAllConfigs ici
      // Afficher une notification de succès
      logger.debug('Configurations sauvegardées avec succès !');
      setSuccessMessage('Configurations sauvegardées avec succès !');
      setTimeout(() => setSuccessMessage(null), 3000); // Cacher après 3s
    } catch (e) {
      logger.error(
        'Erreur lors de la sauvegarde des configurations:',
        e instanceof Error ? e.message : String(e)
      );
      setError('Impossible de sauvegarder les configurations. Veuillez réessayer.');
      // Ne pas utiliser alert(), l'erreur est déjà affichée dans la modale
      throw e; // Propager l'erreur pour la modale
    } finally {
      setIsLoading(false);
    }
  };

  // Fonction pour réinitialiser les configurations (utilise le store)
  const resetConfigurations = async () => {
    if (
      confirm('Êtes-vous sûr de vouloir réinitialiser les configurations aux valeurs par défaut ?')
    ) {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/admin/config/reset', { method: 'POST' });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        logger.debug('Configurations réinitialisées avec succès !');
        // Recharger les configurations après la réinitialisation
        await fetchConfigurations(); // Ceci va reset le store et mettre à jour previousConfigs
      } catch (e) {
        logger.error(
          'Erreur lors de la réinitialisation des configurations:',
          e instanceof Error ? e.message : String(e)
        );
        setError('Impossible de réinitialiser les configurations. Veuillez réessayer.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Fonction pour créer un snapshot des configurations actuelles (utilise le store)
  const createSnapshot = async (name: string, description: string) => {
    setIsLoading(true);
    setError(null);
    // Lire les configurations actuelles depuis le store Zustand
    const currentConfigs: AllConfigs = {
      general,
      appearance,
      homepage,
      notifications,
      security,
      api,
    };

    try {
      const response = await fetch('/api/admin/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          configs: currentConfigs, // Utiliser les configs du store
          snapshot: true,
          snapshotName: name,
          snapshotDescription: description,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Afficher une notification de succès
      logger.debug('Snapshot créé avec succès !');
      alert('Snapshot créé avec succès !'); // Conserver l'alerte pour l'instant
      // Pas besoin de màj previousConfigs ici car snapshot ne modifie pas l'état courant "sauvegardé"
    } catch (e) {
      logger.error(
        'Erreur lors de la création du snapshot:',
        e instanceof Error ? e.message : String(e)
      );
      setError('Impossible de créer le snapshot. Veuillez réessayer.');
      alert('Erreur lors de la création du snapshot. Voir la console pour plus de détails.');
      throw e; // Propager l'erreur pour que le modal puisse la gérer
    } finally {
      setIsLoading(false);
    }
  };

  // Fonction pour annuler une modification spécifique (recharge les configs)
  const handleRevertChange = async (historyItem: {
    id: string;
    configId: string;
    previousValue: string;
    newValue: string;
    createdAt: string;
    createdBy?: string;
    description?: string;
    reverted: boolean;
    config: { section: string; key: string };
  }) => {
    setIsLoading(true);
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

      logger.debug('Modification annulée avec succès !');
      // Recharger les configurations après l'annulation (mettra à jour le store et previousConfigs)
      await fetchConfigurations();
    } catch (e) {
      logger.error(
        "Erreur lors de l'annulation de la modification:",
        e instanceof Error ? e.message : String(e)
      );
      setError("Impossible d'annuler la modification. Veuillez réessayer.");
    } finally {
      setIsLoading(false);
    }
  };

  // Fonction pour appliquer un snapshot (recharge les configs)
  const handleApplySnapshot = async (snapshot: {
    id: string;
    name: string;
    description?: string;
    createdAt: string;
    createdBy?: string;
  }) => {
    setIsLoading(true);
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

      logger.debug('Snapshot appliqué avec succès !');
      alert('Les configurations ont été restaurées depuis le snapshot.');
      // Recharger les configurations après l'application (mettra à jour le store et previousConfigs)
      await fetchConfigurations();
    } catch (e) {
      logger.error(
        "Erreur lors de l'application du snapshot:",
        e instanceof Error ? e.message : String(e)
      );
      setError("Impossible d'appliquer le snapshot. Veuillez réessayer.");
      alert('Erreur lors de la restauration du snapshot. Voir la console pour plus de détails.');
    } finally {
      setIsLoading(false);
    }
  };

  // Fonction pour générer un résumé des modifications en utilisant lodash/isEqual
  const getChangesSummary = () => {
    if (!previousConfigs.current) {
      return 'Chargement de la configuration initiale...';
    }

    const currentConfigs: AllConfigs = {
      general,
      appearance,
      homepage,
      notifications,
      security,
      api,
    };
    const changes: string[] = [];

    // Mappings (inchangés)
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

    // Fonction pour formater la valeur (simple pour l'instant)
    const formatValue = (value: unknown): string => {
      if (typeof value === 'boolean') return value ? 'Activé' : 'Désactivé';
      if (value === null || value === undefined || value === '')
        return '<span class="text-gray-500">[Vide]</span>';
      // Tronquer les longues chaînes pour la lisibilité
      if (typeof value === 'string' && value.length > 50) return `"${value.substring(0, 47)}..."`;
      return JSON.stringify(value);
    };

    // Itérer sur chaque section et chaque clé
    (Object.keys(currentConfigs) as Array<keyof AllConfigs>).forEach((section) => {
      const sectionChanges: string[] = [];
      const currentSection = currentConfigs[section];
      const previousSection = previousConfigs.current![section];

      (Object.keys(currentSection) as Array<keyof typeof currentSection>).forEach((key) => {
        const currentValue = currentSection[key];
        const previousValue = previousSection[key];

        // Utiliser isEqual pour comparer les valeurs
        if (!isEqual(currentValue, previousValue)) {
          const label = labelMappings[`${section}.${key}`] || `${section}.${key}`;
          sectionChanges.push(
            `    ${label}\n        <span class="text-gray-500">${formatValue(previousValue)}</span> <span class="text-cyan-300">→</span> <span class="text-white font-semibold">${formatValue(currentValue)}</span>`
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
  };

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

  // Affichage pendant le chargement initial
  if (isLoading && !general.siteName) {
    // Vérifie une valeur pour éviter le flash
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-[#0c0117] to-black">
        <p className="text-white text-xl animate-pulse">Chargement des configurations...</p>
      </div>
    );
  }

  // Affichage en cas d'erreur de fetch initial
  if (error && !general.siteName) {
    // Affiche l'erreur seulement si le fallback n'a pas fonctionné
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-black via-[#0c0117] to-black text-red-400">
        <p className="text-xl mb-4">Erreur critique lors du chargement : {error}</p>
        <Button onClick={fetchConfigurations} className="bg-red-500/20 hover:bg-red-500/30">
          Réessayer
        </Button>
        {/* Bouton d'initialisation si nécessaire */}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-[#0c0117] to-black text-white">
      {/* Indicateurs de chargement, succès, erreur (inchangés) */}
      {isLoading && (
        <div className="fixed top-4 right-4 z-50">
          <div className="flex items-center space-x-2 bg-purple-900/80 backdrop-blur-sm text-white text-xs font-semibold px-3 py-1 rounded-full shadow-lg animate-pulse">
            <RefreshCcw className="h-3 w-3 animate-spin" />
            <span>Opération en cours...</span>
          </div>
        </div>
      )}
      {successMessage && (
        <div className="fixed top-4 right-4 z-50 bg-green-600/80 backdrop-blur-sm text-white text-xs font-semibold px-4 py-2 rounded-full shadow-lg">
          {successMessage}
        </div>
      )}
      {/* Affichage de l'erreur non bloquante (mode fallback) */}
      {error && general.siteName && (
        <div className="fixed bottom-4 left-4 z-50 bg-yellow-600/80 backdrop-blur-sm text-white text-xs font-semibold px-4 py-2 rounded-full shadow-lg">
          Attention : {error}
        </div>
      )}

      <div className="container mx-auto px-4 py-12">
        {/* Header (inchangé) */}
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
                className={`flex items-center bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={openSaveModal} // Ouvre la modale de sauvegarde
                disabled={isLoading}
              >
                <Save className="mr-2 h-4 w-4" />
                Sauvegarder
              </Button>

              <Button
                variant="outline"
                className={`flex items-center border border-blue-500/30 text-blue-400 hover:bg-blue-500/10 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => setHistoryOpen(true)}
                disabled={isLoading}
              >
                <History className="mr-2 h-4 w-4" />
                Historique
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Navigation latérale (inchangée) */}
          <div className="col-span-12 lg:col-span-3">
            <div className="glass p-6 rounded-xl backdrop-blur-md border border-purple-500/20">
              <h2 className="text-xl font-semibold mb-4 text-purple-300">Sections</h2>
              <nav className="space-y-1">
                <button
                  onClick={() => handleSectionClick('general')}
                  className={`w-full flex items-center p-3 rounded-lg transition-all ${activeSection === 'general' ? 'bg-purple-500/20 text-purple-300' : 'hover:bg-purple-500/10 text-gray-300'}`}
                >
                  <Settings className="h-5 w-5 mr-3" />
                  Général
                </button>
                <button
                  onClick={() => handleSectionClick('appearance')}
                  className={`w-full flex items-center p-3 rounded-lg transition-all ${activeSection === 'appearance' ? 'bg-purple-500/20 text-purple-300' : 'hover:bg-purple-500/10 text-gray-300'}`}
                >
                  <Layout className="h-5 w-5 mr-3" />
                  Apparence
                </button>

                <button
                  onClick={() => handleSectionClick('homepage')}
                  className={`w-full flex items-center p-3 rounded-lg transition-all ${activeSection === 'homepage' ? 'bg-purple-500/20 text-purple-300' : 'hover:bg-purple-500/10 text-gray-300'}`}
                >
                  <Home className="h-5 w-5 mr-3" />
                  Page d&apos;accueil
                </button>

                <button
                  onClick={() => handleSectionClick('notifications')}
                  className={`w-full flex items-center p-3 rounded-lg transition-all ${activeSection === 'notifications' ? 'bg-purple-500/20 text-purple-300' : 'hover:bg-purple-500/10 text-gray-300'}`}
                >
                  <Bell className="h-5 w-5 mr-3" />
                  Notifications
                </button>

                <button
                  onClick={() => handleSectionClick('security')}
                  className={`w-full flex items-center p-3 rounded-lg transition-all ${activeSection === 'security' ? 'bg-purple-500/20 text-purple-300' : 'hover:bg-purple-500/10 text-gray-300'}`}
                >
                  <Shield className="h-5 w-5 mr-3" />
                  Sécurité
                </button>

                <button
                  onClick={() => handleSectionClick('api')}
                  className={`w-full flex items-center p-3 rounded-lg transition-all ${activeSection === 'api' ? 'bg-purple-500/20 text-purple-300' : 'hover:bg-purple-500/10 text-gray-300'}`}
                >
                  <Globe className="h-5 w-5 mr-3" />
                  API & Intégrations
                </button>

                <button
                  onClick={() => handleSectionClick('images')}
                  className={`w-full flex items-center p-3 rounded-lg transition-all ${activeSection === 'images' ? 'bg-purple-500/20 text-purple-300' : 'hover:bg-purple-500/10 text-gray-300'}`}
                >
                  <ImageIcon className="h-5 w-5 mr-3" />
                  Gérer les images
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
              {/* Fond gradient (inchangé) */}
              <div className="absolute inset-0 bg-gradient-to-br from-purple-600/5 via-indigo-600/5 to-blue-600/5 opacity-70 transition-opacity"></div>

              {/* --- Section Générale (refactorisée) --- */}
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
                          value={general.siteName} // Utilise le store
                          onChange={(e) => update('general', 'siteName', e.target.value)} // Utilise update du store
                          className="bg-purple-500/10 border-purple-500/20 focus:border-purple-500/50"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="contactEmail">Email de contact</Label>
                        <Input
                          id="contactEmail"
                          type="email"
                          value={general.contactEmail} // Utilise le store
                          onChange={(e) => update('general', 'contactEmail', e.target.value)} // Utilise update du store
                          className="bg-purple-500/10 border-purple-500/20 focus:border-purple-500/50"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="siteDescription">Description du site</Label>
                      <Textarea
                        id="siteDescription"
                        value={general.siteDescription} // Utilise le store
                        onChange={(e) => update('general', 'siteDescription', e.target.value)} // Utilise update du store
                        className="bg-purple-500/10 border-purple-500/20 focus:border-purple-500/50"
                        rows={3}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="timeZone">Fuseau horaire</Label>
                        <select
                          id="timeZone"
                          value={general.timeZone} // Utilise le store
                          onChange={(e) => update('general', 'timeZone', e.target.value)} // Utilise update du store
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
                          value={general.dateFormat} // Utilise le store
                          onChange={(e) => update('general', 'dateFormat', e.target.value)} // Utilise update du store
                          className="w-full bg-purple-500/10 border border-purple-500/20 focus:border-purple-500/50 rounded-md p-2 text-white"
                        >
                          <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                          <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                          <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                        </select>
                      </div>
                    </div>

                    {/* Switch de base de données */}
                    <div className="mt-8 pt-6 border-t border-purple-500/20">
                      <DatabaseSwitch />
                    </div>
                  </div>
                </div>
              )}

              {/* --- Section Apparence (placeholder) --- */}
              {activeSection === 'appearance' && <AppearanceTab />}

              {/* --- Section Homepage (lazy loaded) --- */}
              {activeSection === 'homepage' && <HomepageTab />}

              {/* --- Section Notifications (refactorisée) --- */}
              {activeSection === 'notifications' && (
                <div className="p-6 relative z-10">
                  <h2 className="text-2xl font-audiowide text-white mb-6 pb-2 border-b border-purple-500/20">
                    Notifications
                  </h2>

                  <div className="space-y-4">
                    {/* Utilisation de ToggleRow et du store */}
                    <ToggleRow
                      label="Notifications par email"
                      desc="Envoyer des notifications par email"
                      value={notifications.emailNotifications}
                      onChange={(checked) => update('notifications', 'emailNotifications', checked)}
                    />
                    <ToggleRow
                      label="Alertes administrateur"
                      desc="Recevoir des alertes pour les actions administratives"
                      value={notifications.adminAlerts}
                      onChange={(checked) => update('notifications', 'adminAlerts', checked)}
                    />
                    <ToggleRow
                      label="Nouveaux utilisateurs"
                      desc="Notifications lors de l'inscription de nouveaux utilisateurs"
                      value={notifications.newUserNotifications}
                      onChange={(checked) =>
                        update('notifications', 'newUserNotifications', checked)
                      }
                    />
                    <ToggleRow
                      label="Rappels d'événements"
                      desc="Rappels automatiques avant les événements"
                      value={notifications.eventReminders}
                      onChange={(checked) => update('notifications', 'eventReminders', checked)}
                    />
                    <ToggleRow
                      label="Emails marketing"
                      desc="Envoyer des emails promotionnels aux utilisateurs"
                      value={notifications.marketingEmails}
                      onChange={(checked) => update('notifications', 'marketingEmails', checked)}
                    />
                  </div>
                </div>
              )}

              {/* --- Section Sécurité (placeholder) --- */}
              {activeSection === 'security' && <SecurityTab />}

              {/* --- Section API (placeholder) --- */}
              {activeSection === 'api' && <ApiTab />}

              {/* --- Section Images (maintenant un onglet dynamique) --- */}
              {activeSection === 'images' && <ImagesTab />}
            </div>
          </div>
        </div>

        {/* Cartes d'information (inchangées) */}
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

      {/* Modales (inchangées) */}
      <HistoryModal
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
        onRevertChange={handleRevertChange}
        onApplySnapshot={handleApplySnapshot}
      />

      <SaveConfigModal
        isOpen={saveModalOpen}
        onClose={() => setSaveModalOpen(false)}
        onSave={handleSaveWithName}
        changesSummary={getChangesSummary()} // Utilise maintenant la logique de diff
      />
    </div>
  );
}
