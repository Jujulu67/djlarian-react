'use client';

import { useState, useEffect } from 'react';
import { Database, AlertTriangle, CheckCircle2, Loader2, RefreshCw } from 'lucide-react';
import ToggleRow from '@/components/config/ToggleRow';
import { toast } from 'react-hot-toast';
import { logger } from '@/lib/logger';

export default function DatabaseSwitch() {
  const [useProduction, setUseProduction] = useState(false);
  const [loading, setLoading] = useState(true);
  const [locked, setLocked] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [restarting, setRestarting] = useState(false);
  const [restartProgress, setRestartProgress] = useState(0);

  // Charger l'état actuel
  useEffect(() => {
    const fetchState = async () => {
      try {
        const response = await fetch('/api/admin/database/switch');
        if (response.ok) {
          const data = await response.json();
          setUseProduction(data.useProduction);
          setLocked(data.locked || false);
        }
              } catch (error) {
                logger.error("Erreur lors du chargement de l'état", error);
              } finally {
        setLoading(false);
      }
    };

    fetchState();
  }, []);

  const handleToggle = async (checked: boolean) => {
    if (locked) {
      toast.error("Le switch de base de données n'est pas disponible en production");
      return;
    }

    // Avertissement si on passe en production
    if (checked) {
      const confirmed = window.confirm(
        '⚠️ ATTENTION : Vous allez utiliser la base de données de PRODUCTION.\n\n' +
          'Toutes les modifications affecteront les données réelles.\n\n' +
          'Êtes-vous sûr de vouloir continuer ?'
      );
      if (!confirmed) {
        return;
      }
    }

    setSwitching(true);

    try {
      const response = await fetch('/api/admin/database/switch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ useProduction: checked }),
      });

      if (response.ok) {
        const data = await response.json();
        setUseProduction(checked);

        // Démarrer le processus de redémarrage
        setSwitching(false);
        setRestarting(true);
        setRestartProgress(0);

        // Simuler le redémarrage avec un polling
        await waitForServerRestart();

        setRestarting(false);
        toast.success('Serveur redémarré avec succès !', {
          duration: 3000,
          icon: '✅',
        });
      } else {
        const error = await response.json();
        toast.error(error.error || 'Erreur lors du changement de base de données');
        setSwitching(false);
      }
            } catch (error) {
              logger.error('Erreur lors du switch', error);
              toast.error('Erreur lors du changement de base de données');
              setSwitching(false);
            }
  };

  const waitForServerRestart = async () => {
    const maxAttempts = 60; // 60 secondes max (plus de temps pour redémarrer manuellement)
    const delay = 1000; // 1 seconde entre chaque tentative

    // Attendre un peu avant de commencer à poller
    await new Promise((resolve) => setTimeout(resolve, 2000));

    let lastRestartRequired = true;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      // Progression basée sur le temps écoulé
      setRestartProgress(Math.min((attempt / maxAttempts) * 100, 95));

      try {
        const response = await fetch('/api/admin/database/restart-check', {
          method: 'GET',
          cache: 'no-store',
        });

        if (response.ok) {
          const data = await response.json();

          // Si le serveur répond ET qu'il n'y a plus de redémarrage requis, c'est bon
          if (!data.restartRequired && lastRestartRequired) {
            // Le serveur a été redémarré et le marqueur a été supprimé
            setRestartProgress(100);
            await new Promise((resolve) => setTimeout(resolve, 500));
            return;
          }

          lastRestartRequired = data.restartRequired || false;
        }
      } catch (error) {
        // Le serveur n'est pas encore prêt, continuer à attendre
      }

      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    // Si on arrive ici, le serveur n'a pas redémarré dans les temps
    // Mais on continue à attendre en arrière-plan
    setRestartProgress(95);
    toast.error(
      'Le serveur prend plus de temps que prévu. Continuez à attendre ou vérifiez manuellement.',
      {
        duration: 5000,
      }
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-5 w-5 animate-spin text-purple-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="bg-purple-500/20 w-10 h-10 flex items-center justify-center rounded-lg">
          <Database className="h-5 w-5 text-purple-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">Base de données</h3>
          <p className="text-sm text-gray-400">Basculez entre la base locale et la production</p>
        </div>
      </div>

      <ToggleRow
        label={useProduction ? 'Base de production (Neon)' : 'Base locale (SQLite)'}
        desc={
          useProduction
            ? 'Connecté à la base de données de production. ⚠️ Modifications en temps réel.'
            : 'Connecté à la base de données locale. Sécurisé pour les tests.'
        }
        value={useProduction}
        onChange={handleToggle}
        disabled={locked || switching}
      />

      {/* Indicateur de statut */}
      <div
        className={`p-4 rounded-lg border ${
          useProduction
            ? 'bg-yellow-500/10 border-yellow-500/20'
            : 'bg-green-500/10 border-green-500/20'
        }`}
      >
        <div className="flex items-start gap-3">
          {useProduction ? (
            <AlertTriangle className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
          ) : (
            <CheckCircle2 className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            <p className="text-sm font-medium text-white mb-1">
              {useProduction ? 'Mode Production' : 'Mode Développement'}
            </p>
            <p className="text-xs text-gray-400">
              {useProduction
                ? 'Vous utilisez actuellement la base de données de production. Toutes les modifications seront permanentes.'
                : "Vous utilisez la base de données locale (SQLite). Les modifications n'affectent que votre environnement de développement."}
            </p>
          </div>
        </div>
      </div>

      {switching && (
        <div className="flex items-center gap-2 text-sm text-purple-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Changement en cours...</span>
        </div>
      )}

      {restarting && (
        <div className="p-4 bg-purple-500/10 rounded-lg border border-purple-500/20">
          <div className="flex items-center gap-3 mb-3">
            <RefreshCw className="h-5 w-5 text-purple-400 animate-spin" />
            <div className="flex-1">
              <p className="text-sm font-medium text-white mb-1">
                Redémarrage du serveur en cours...
              </p>
              <p className="text-xs text-gray-400">
                Le serveur redémarre automatiquement. Cela peut prendre quelques secondes...
              </p>
            </div>
          </div>

          {/* Barre de progression */}
          <div className="w-full bg-gray-700/50 rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-purple-500 transition-all duration-300 ease-out"
              style={{ width: `${restartProgress}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-2 text-center">
            {Math.round(restartProgress)}% - Attente du serveur...
          </p>
        </div>
      )}

      {!locked && !switching && !restarting && (
        <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
          <p className="text-xs text-gray-400">
            💡 <strong>Note :</strong> Le serveur redémarrera automatiquement après le changement.
          </p>
        </div>
      )}
    </div>
  );
}
