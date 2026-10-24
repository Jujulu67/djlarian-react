import { useCallback, useEffect, useRef, useState } from 'react';

import { logger } from '@/lib/logger';
import { AllConfigs, initialConfigs } from '@/types/config';

/** Sous-ensemble du store Zustand `useConfigs` utilisé par la synchronisation. */
type ConfigStore = AllConfigs & {
  setAllConfigs: (newConfigs: AllConfigs) => void;
  resetConfigs: () => void;
};

/**
 * Synchronisation des configurations avec l'API : chargement, sauvegarde,
 * snapshots, annulation de modifications et application de snapshots.
 */
export function useConfigSync(store: ConfigStore) {
  const {
    general,
    appearance,
    homepage,
    notifications,
    security,
    api,
    setAllConfigs,
    resetConfigs,
  } = store;

  const [isLoading, setIsLoading] = useState(true); // Commence en chargement
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Ref pour stocker la configuration précédente pour le diff
  const previousConfigs = useRef<AllConfigs | null>(null);

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

  return {
    isLoading,
    error,
    successMessage,
    previousConfigs,
    fetchConfigurations,
    handleSaveWithName,
    handleRevertChange,
    handleApplySnapshot,
  };
}
