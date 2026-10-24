'use client';

import { ArrowLeft, Save, RefreshCcw, History } from 'lucide-react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { useConfigs } from '@/stores/useConfigs';

import { ConfigInfoCards } from './components/ConfigInfoCards';
import { ConfigSidebar } from './components/ConfigSidebar';
import { GeneralSettingsSection } from './components/GeneralSettingsSection';
import HistoryModal from './components/HistoryModal';
import { NotificationsSection } from './components/NotificationsSection';
import { SaveConfigModal } from './components/SaveConfigModal';
import { useActiveSection } from './hooks/useActiveSection';
import { useConfigSync } from './hooks/useConfigSync';
import { buildChangesSummary } from './utils/buildChangesSummary';

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

export default function ConfigurationPage() {
  const [historyOpen, setHistoryOpen] = useState(false);
  const [saveModalOpen, setSaveModalOpen] = useState(false);

  // Utilisation du store Zustand
  const configurations = useConfigs();
  const { general, appearance, homepage, notifications, security, api, update } = configurations;

  const {
    isLoading,
    error,
    successMessage,
    previousConfigs,
    fetchConfigurations,
    handleSaveWithName,
    handleRevertChange,
    handleApplySnapshot,
  } = useConfigSync(configurations);

  const { activeSection, handleSectionClick } = useActiveSection();

  // Fonction pour générer un résumé des modifications en utilisant lodash/isEqual
  const getChangesSummary = () =>
    buildChangesSummary(
      { general, appearance, homepage, notifications, security, api },
      previousConfigs.current
    );

  // Fonction pour ouvrir la modale de sauvegarde
  const openSaveModal = () => {
    setSaveModalOpen(true);
  };

  // Affichage pendant le chargement initial
  if (isLoading && !general.siteName) {
    // Vérifie une valeur pour éviter le flash
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gradient-to-br from-black via-[#0c0117] to-black">
        <p className="text-white text-xl animate-pulse">Chargement des configurations...</p>
      </div>
    );
  }

  // Affichage en cas d'erreur de fetch initial
  if (error && !general.siteName) {
    // Affiche l'erreur seulement si le fallback n'a pas fonctionné
    return (
      <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center bg-gradient-to-br from-black via-[#0c0117] to-black text-red-400">
        <p className="text-xl mb-4">Erreur critique lors du chargement : {error}</p>
        <Button onClick={fetchConfigurations} className="bg-red-500/20 hover:bg-red-500/30">
          Réessayer
        </Button>
        {/* Bouton d'initialisation si nécessaire */}
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-br from-black via-[#0c0117] to-black text-white">
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
            className="flex items-center text-white hover:text-gray-300 transition-colors mb-6"
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
          <ConfigSidebar activeSection={activeSection} handleSectionClick={handleSectionClick} />

          <div className="col-span-12 lg:col-span-9">
            <div className="glass rounded-xl backdrop-blur-md overflow-hidden border border-purple-500/20">
              {/* Fond gradient (inchangé) */}
              <div className="absolute inset-0 bg-gradient-to-br from-purple-600/5 via-indigo-600/5 to-blue-600/5 opacity-70 transition-opacity"></div>

              {/* --- Section Générale (refactorisée) --- */}
              {activeSection === 'general' && (
                <GeneralSettingsSection general={general} update={update} />
              )}

              {/* --- Section Apparence (placeholder) --- */}
              {activeSection === 'appearance' && <AppearanceTab />}

              {/* --- Section Homepage (lazy loaded) --- */}
              {activeSection === 'homepage' && <HomepageTab />}

              {/* --- Section Notifications (refactorisée) --- */}
              {activeSection === 'notifications' && (
                <NotificationsSection notifications={notifications} update={update} />
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

        <ConfigInfoCards />
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
