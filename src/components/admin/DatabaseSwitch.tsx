'use client';

import { Database, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

import ToggleRow from '@/components/config/ToggleRow';
import { logger } from '@/lib/logger';

export default function DatabaseSwitch() {
  const [useProduction, setUseProduction] = useState(false);
  const [loading, setLoading] = useState(true);
  const [locked, setLocked] = useState(false);
  const [switching, setSwitching] = useState(false);

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

        // ✅ Hot swap: pas de redémarrage nécessaire
        toast.success(data.message || 'Base de données changée avec succès (hot swap) !', {
          duration: 3000,
          icon: '✅',
        });
      } else {
        const error = await response.json();
        toast.error(error.error || 'Erreur lors du changement de base de données');
      }
    } catch (error) {
      logger.error('Erreur lors du switch', error);
      toast.error('Erreur lors du changement de base de données');
    } finally {
      setSwitching(false);
    }
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
          <p className="text-sm text-gray-400">
            Basculez entre la base locale et la production (hot swap)
          </p>
        </div>
      </div>

      <ToggleRow
        label={useProduction ? 'Base de production (Neon)' : 'Base locale (PostgreSQL)'}
        desc={
          useProduction
            ? 'Connecté à la base de données de production. ⚠️ Modifications en temps réel.'
            : 'Connecté à la base de données locale PostgreSQL. Sécurisé pour les tests.'
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
                : "Vous utilisez la base de données locale PostgreSQL. Les modifications n'affectent que votre environnement de développement."}
            </p>
          </div>
        </div>
      </div>

      {switching && (
        <div className="flex items-center gap-2 text-sm text-purple-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Changement en cours (hot swap)...</span>
        </div>
      )}

      {!locked && !switching && (
        <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
          <p className="text-xs text-gray-400">
            ⚡ <strong>Hot Swap :</strong> Le changement est instantané, aucun redémarrage
            nécessaire.
          </p>
        </div>
      )}
    </div>
  );
}
