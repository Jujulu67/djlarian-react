import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  HistoryIcon,
  ClockIcon,
  RotateCcw,
  RefreshCw,
  CheckCircle,
  XCircle,
  BookmarkIcon,
  User,
  Calendar,
  PlusCircle,
  Settings,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { logger } from '@/lib/logger';

interface ConfigHistoryItem {
  id: string;
  configId: string;
  previousValue: string;
  newValue: string;
  createdAt: string;
  createdBy?: string;
  description?: string;
  reverted: boolean;
  config: {
    section: string;
    key: string;
  };
}

interface ConfigSnapshot {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  createdBy?: string;
}

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRevertChange: (historyItem: ConfigHistoryItem) => Promise<void>;
  onApplySnapshot: (snapshot: ConfigSnapshot) => Promise<void>;
}

// Fonction utilitaire pour formater les valeurs
const formatConfigValue = (value: string) => {
  if (value === 'true') return 'Activé';
  if (value === 'false') return 'Désactivé';
  return value;
};

export default function HistoryModal({
  isOpen,
  onClose,
  onRevertChange,
  onApplySnapshot,
}: HistoryModalProps) {
  const [activeTab, setActiveTab] = useState<'changes' | 'snapshots'>('changes');
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<ConfigHistoryItem[]>([]);
  const [snapshots, setSnapshots] = useState<ConfigSnapshot[]>([]);
  const [revertingId, setRevertingId] = useState<string | null>(null);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const [applyingBaseConfig, setApplyingBaseConfig] = useState(false);
  const [defaultConfigsData, setDefaultConfigsData] = useState<Record<string, unknown>>({});

  // Récupérer l'historique et les snapshots
  useEffect(() => {
    if (isOpen) {
      fetchHistoryData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, activeTab]);

  useEffect(() => {
    // Charger les configurations par défaut
    const fetchDefaultConfigs = async () => {
      try {
        const res = await fetch('/api/admin/config/default');
        if (res.ok) {
          const data = await res.json();
          setDefaultConfigsData(data);
        }
      } catch (error) {
        logger.error('Erreur lors du chargement des configurations par défaut:', error);
      }
    };

    if (isOpen && activeTab === 'snapshots') {
      fetchDefaultConfigs();
    }
  }, [isOpen, activeTab]);

  const fetchHistoryData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/config/history?type=${activeTab}`);
      if (res.ok) {
        const data = await res.json();
        if (activeTab === 'changes') {
          setHistory(data);
        } else {
          setSnapshots(data);
        }
      }
    } catch (error) {
      logger.error(`Erreur lors de la récupération des ${activeTab}:`, error);
    } finally {
      setLoading(false);
    }
  };

  // Gérer la réversion d'une modification
  const handleRevert = async (historyItem: ConfigHistoryItem) => {
    if (historyItem.reverted) return; // Déjà annulée

    setRevertingId(historyItem.id);
    try {
      await onRevertChange(historyItem);
      // Actualiser l'historique après l'annulation
      fetchHistoryData();
    } catch (error) {
      logger.error("Erreur lors de l'annulation de la modification:", error);
    } finally {
      setRevertingId(null);
    }
  };

  // Gérer le rétablissement d'une modification annulée
  const handleRestoreReverted = async (historyItem: ConfigHistoryItem) => {
    if (!historyItem.reverted) return; // N'est pas annulée

    setRevertingId(historyItem.id);
    try {
      await fetch('/api/admin/config/history', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'restore-reverted',
          id: historyItem.id,
        }),
      });
      // Actualiser l'historique après le rétablissement
      fetchHistoryData();
      toast.success('Modification rétablie avec succès');
    } catch (error) {
      logger.error('Erreur lors du rétablissement de la modification:', error);
      toast.error('Erreur lors du rétablissement');
    } finally {
      setRevertingId(null);
    }
  };

  // Gérer l'application d'un snapshot
  const handleApplySnapshot = async (snapshot: ConfigSnapshot) => {
    setApplyingId(snapshot.id);
    try {
      await onApplySnapshot(snapshot);
      // Fermer le modal après l'application d'un snapshot
      onClose();
    } catch (error) {
      logger.error("Erreur lors de l'application du snapshot:", error);
      setApplyingId(null);
    }
  };

  // Fonction pour reset la config
  const handleResetConfig = async () => {
    if (
      !window.confirm(
        "Êtes-vous sûr de vouloir réinitialiser toutes les configurations aux valeurs par défaut ? Cette action peut être annulée via l'historique des modifications et les sauvegardes."
      )
    )
      return;
    setResetting(true);
    try {
      const res = await fetch('/api/admin/config/reset', { method: 'POST' });
      if (res.ok) {
        toast.success('Configuration réinitialisée avec succès !');
        fetchHistoryData();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Erreur lors de la réinitialisation.');
      }
    } catch (error) {
      toast.error('Erreur réseau lors de la réinitialisation.');
    } finally {
      setResetting(false);
    }
  };

  // Fonction pour appliquer la configuration de base
  const handleApplyBaseConfig = async () => {
    setApplyingBaseConfig(true);
    try {
      const res = await fetch('/api/admin/config/reset', { method: 'POST' });
      if (res.ok) {
        toast.success('Configuration de base appliquée avec succès !');
        onClose();
      } else {
        const data = await res.json();
        toast.error(data.error || "Erreur lors de l'application de la configuration de base.");
      }
    } catch (error) {
      toast.error("Erreur réseau lors de l'application de la configuration de base.");
    } finally {
      setApplyingBaseConfig(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      maxWidth="max-w-4xl"
      showLoader={false}
      bgClass="bg-gradient-to-br from-[#12121a] to-[#0c0117]"
      borderClass="border-purple-500/20"
      onClose={onClose}
    >
      <div className="flex flex-col w-full max-h-[90vh] overflow-hidden">
        <div className="p-4 border-b border-purple-500/20 flex justify-between items-center">
          <h3 className="text-xl font-audiowide text-white flex items-center">
            <HistoryIcon className="mr-2 h-5 w-5 text-purple-400" />
            Historique des configurations
          </h3>
          <div className="flex gap-2">
            <Button
              size="sm"
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold rounded-md shadow focus:ring-2 focus:ring-purple-400 focus:outline-none transition-all duration-200 disabled:opacity-60 px-3 py-2 h-9 min-w-[110px]"
              onClick={handleResetConfig}
              disabled={resetting}
              aria-label="Réinitialiser la configuration"
            >
              {resetting ? (
                <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <RotateCcw className="h-4 w-4 mr-1" />
              )}
              Réinitialiser
            </Button>
          </div>
        </div>
        <div className="p-4 overflow-y-auto">
          <Tabs
            defaultValue="changes"
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as 'changes' | 'snapshots')}
            className="w-full"
          >
            <TabsList className="grid grid-cols-2 mb-4 gap-2 bg-transparent">
              <TabsTrigger
                value="changes"
                className="relative bg-purple-900/30 text-purple-200 font-semibold rounded-lg px-6 py-3 text-base transition-all duration-200 focus:ring-2 focus:ring-purple-400 focus:outline-none overflow-hidden data-[state=active]:text-white data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-blue-600 data-[state=active]:tab-animated-border"
                style={{ zIndex: 1 }}
              >
                <span className="relative z-10 flex items-center">
                  <ClockIcon className="h-5 w-5 mr-2" />
                  Modifications récentes
                </span>
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 rounded-lg border-2 border-transparent data-[state=active]:border-[3px] data-[state=active]:border-gradient-to-r data-[state=active]:from-purple-400 data-[state=active]:to-blue-400 data-[state=active]:animate-pulse"
                  style={{ boxShadow: '0 0 0 2px rgba(139,92,246,0.3)' }}
                />
              </TabsTrigger>
              <TabsTrigger
                value="snapshots"
                className="relative bg-purple-900/30 text-purple-200 font-semibold rounded-lg px-6 py-3 text-base transition-all duration-200 focus:ring-2 focus:ring-purple-400 focus:outline-none overflow-hidden data-[state=active]:text-white data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-blue-600 data-[state=active]:tab-animated-border"
                style={{ zIndex: 1 }}
              >
                <span className="relative z-10 flex items-center">
                  <BookmarkIcon className="h-5 w-5 mr-2" />
                  Sauvegardes
                </span>
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 rounded-lg border-2 border-transparent data-[state=active]:border-[3px] data-[state=active]:border-gradient-to-r data-[state=active]:from-purple-400 data-[state=active]:to-blue-400 data-[state=active]:animate-pulse"
                  style={{ boxShadow: '0 0 0 2px rgba(139,92,246,0.3)' }}
                />
              </TabsTrigger>
            </TabsList>

            <TabsContent value="changes" className="mt-0">
              <div className="max-h-[60vh] overflow-y-auto p-1">
                {loading ? (
                  <div className="flex justify-center p-8">
                    <RefreshCw className="h-8 w-8 text-purple-400 animate-spin" />
                  </div>
                ) : history.length === 0 ? (
                  <div className="text-center p-8 text-gray-400">
                    Aucune modification enregistrée
                  </div>
                ) : (
                  <div className="space-y-3">
                    {history.map((item) => (
                      <div
                        key={item.id}
                        className={`p-4 rounded-lg border ${
                          item.reverted
                            ? 'border-gray-500/20 bg-gray-500/5'
                            : 'border-purple-500/20 bg-purple-500/5'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="font-medium text-white flex items-center">
                              {item.config.section}.{item.config.key}
                              {item.reverted && (
                                <span className="ml-2 text-xs bg-gray-500/20 text-gray-400 px-2 py-0.5 rounded-full">
                                  Annulée
                                </span>
                              )}
                            </h4>
                            <p className="text-xs text-gray-400 mt-1">
                              {item.description || 'Modification manuelle'}
                            </p>
                          </div>
                          {!item.reverted ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-purple-500/20 bg-purple-500/10 hover:bg-purple-500/20"
                              onClick={() => handleRevert(item)}
                              disabled={revertingId === item.id}
                            >
                              {revertingId === item.id ? (
                                <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                              ) : (
                                <RotateCcw className="h-3 w-3 mr-1" />
                              )}
                              Annuler
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-green-500/20 bg-green-500/10 hover:bg-green-500/20"
                              onClick={() => handleRestoreReverted(item)}
                              disabled={revertingId === item.id}
                            >
                              {revertingId === item.id ? (
                                <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                              ) : (
                                <RotateCcw className="h-3 w-3 mr-1" />
                              )}
                              Rétablir
                            </Button>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-3 mt-3">
                          <div className="bg-black/30 p-2 rounded border border-red-500/20">
                            <p className="text-xs text-gray-400 mb-1">Valeur précédente :</p>
                            <p className="text-sm font-mono text-red-400 break-words">
                              {formatConfigValue(item.previousValue)}
                            </p>
                          </div>
                          <div className="bg-black/30 p-2 rounded border border-green-500/20">
                            <p className="text-xs text-gray-400 mb-1">Nouvelle valeur :</p>
                            <p className="text-sm font-mono text-green-400 break-words">
                              {formatConfigValue(item.newValue)}
                            </p>
                          </div>
                        </div>

                        <div className="mt-3 flex justify-between text-xs text-gray-400">
                          <span className="flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            {format(new Date(item.createdAt), 'dd MMMM yyyy à HH:mm', {
                              locale: fr,
                            })}
                          </span>
                          {item.createdBy && (
                            <span className="flex items-center">
                              <User className="h-3 w-3 mr-1" />
                              {item.createdBy}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="snapshots" className="mt-0">
              <div className="max-h-[60vh] overflow-y-auto p-1">
                {loading ? (
                  <div className="flex justify-center p-8">
                    <RefreshCw className="h-8 w-8 text-purple-400 animate-spin" />
                  </div>
                ) : (
                  <div>
                    {/* Config de base spéciale */}
                    <div className="p-4 rounded-lg border border-green-500/30 bg-green-500/5 mb-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-medium text-white flex items-center">
                            <Settings className="h-4 w-4 mr-2 text-green-400" />
                            Configuration de base
                          </h4>
                          <p className="text-sm text-gray-400 mt-1">
                            Valeurs par défaut recommandées par le système
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-green-500/30 bg-green-500/10 hover:bg-green-500/20"
                          onClick={handleApplyBaseConfig}
                          disabled={applyingBaseConfig}
                        >
                          {applyingBaseConfig ? (
                            <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                          ) : (
                            <CheckCircle className="h-3 w-3 mr-1" />
                          )}
                          Restaurer
                        </Button>
                      </div>
                    </div>

                    {snapshots.length === 0 ? (
                      <div className="text-center p-8 text-gray-400">
                        Aucune sauvegarde personnalisée enregistrée
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {snapshots.map((snapshot) => (
                          <div
                            key={snapshot.id}
                            className="p-4 rounded-lg border border-blue-500/20 bg-blue-500/5"
                          >
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <h4 className="font-medium text-white">{snapshot.name}</h4>
                                {snapshot.description && (
                                  <p className="text-sm text-gray-400 mt-1">
                                    {snapshot.description}
                                  </p>
                                )}
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-blue-500/20 bg-blue-500/10 hover:bg-blue-500/20"
                                onClick={() => handleApplySnapshot(snapshot)}
                                disabled={applyingId === snapshot.id}
                              >
                                {applyingId === snapshot.id ? (
                                  <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                                ) : (
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                )}
                                Restaurer
                              </Button>
                            </div>

                            <div className="mt-3 flex justify-between text-xs text-gray-400">
                              <span className="flex items-center">
                                <Calendar className="h-3 w-3 mr-1" />
                                {format(new Date(snapshot.createdAt), 'dd MMMM yyyy à HH:mm', {
                                  locale: fr,
                                })}
                              </span>
                              {snapshot.createdBy && (
                                <span className="flex items-center">
                                  <User className="h-3 w-3 mr-1" />
                                  {snapshot.createdBy}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      <style jsx global>{`
        .tab-animated-border {
          position: relative;
          z-index: 1;
        }
        .tab-animated-border[data-state='active'] {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
        }
        .tab-animated-border::after {
          content: '';
          position: absolute;
          inset: -6px;
          border-radius: 1rem;
          background: conic-gradient(
            from 0deg,
            #a78bfa 0deg,
            #60a5fa 40deg,
            #34d399 80deg,
            #000 120deg,
            #f87171 160deg,
            #000 200deg,
            #a78bfa 240deg,
            #000 280deg,
            #a78bfa 360deg
          ) !important;
          animation: tab-spin 1.2s linear infinite;
          z-index: 10;
          pointer-events: none;
        }
        .tab-animated-border::before {
          content: '';
          position: absolute;
          inset: -14px;
          border-radius: 1.5rem;
          background: conic-gradient(
            from 0deg,
            #a78bfa 0deg,
            #60a5fa 40deg,
            #34d399 80deg,
            #000 120deg,
            #f87171 160deg,
            #000 200deg,
            #a78bfa 240deg,
            #000 280deg,
            #a78bfa 360deg
          ) !important;
          filter: blur(12px);
          opacity: 0.6;
          animation: tab-spin 1.2s linear infinite;
          z-index: 5;
          pointer-events: none;
        }
        @keyframes tab-spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </Modal>
  );
}
