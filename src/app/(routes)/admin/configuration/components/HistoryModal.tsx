import { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Button } from '@/components/ui/Button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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

  // Récupérer l'historique et les snapshots
  useEffect(() => {
    if (isOpen) {
      fetchHistoryData();
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
      console.error(`Erreur lors de la récupération des ${activeTab}:`, error);
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
      console.error("Erreur lors de l'annulation de la modification:", error);
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
      console.error("Erreur lors de l'application du snapshot:", error);
      setApplyingId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-gradient-to-br from-[#12121a] to-[#0c0117] rounded-xl border border-purple-500/20 w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="p-4 border-b border-purple-500/20 flex justify-between items-center">
          <h3 className="text-xl font-audiowide text-white flex items-center">
            <HistoryIcon className="mr-2 h-5 w-5 text-purple-400" />
            Historique des configurations
          </h3>
          <Button variant="outline" size="sm" className="border-purple-500/20" onClick={onClose}>
            <XCircle className="h-4 w-4 mr-1" />
            Fermer
          </Button>
        </div>

        <div className="p-4">
          <Tabs
            defaultValue="changes"
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as 'changes' | 'snapshots')}
            className="w-full"
          >
            <TabsList className="grid grid-cols-2 mb-4">
              <TabsTrigger value="changes" className="data-[state=active]:bg-purple-500/20">
                <ClockIcon className="h-4 w-4 mr-2" />
                Modifications récentes
              </TabsTrigger>
              <TabsTrigger value="snapshots" className="data-[state=active]:bg-purple-500/20">
                <BookmarkIcon className="h-4 w-4 mr-2" />
                Sauvegardes
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
                          {!item.reverted && (
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
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-3 mt-3">
                          <div className="bg-black/30 p-2 rounded border border-red-500/20">
                            <p className="text-xs text-gray-400 mb-1">Valeur précédente :</p>
                            <p className="text-sm font-mono text-red-400 break-words">
                              {item.previousValue}
                            </p>
                          </div>
                          <div className="bg-black/30 p-2 rounded border border-green-500/20">
                            <p className="text-xs text-gray-400 mb-1">Nouvelle valeur :</p>
                            <p className="text-sm font-mono text-green-400 break-words">
                              {item.newValue}
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
                ) : snapshots.length === 0 ? (
                  <div className="text-center p-8 text-gray-400">Aucune sauvegarde enregistrée</div>
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
                              <p className="text-sm text-gray-400 mt-1">{snapshot.description}</p>
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
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
