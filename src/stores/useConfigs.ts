import { create } from 'zustand';
import { AllConfigs, initialConfigs } from '@/types/config';

// Interface pour le store Zustand, incluant les configurations et la fonction de mise à jour
interface ConfigsState extends AllConfigs {
  // Fonction générique pour mettre à jour une valeur dans une section spécifique
  update: <S extends keyof AllConfigs, K extends keyof AllConfigs[S]>(
    section: S,
    key: K,
    value: AllConfigs[S][K]
  ) => void;
  // Fonction pour remplacer toutes les configurations (utile après fetch)
  setAllConfigs: (newConfigs: AllConfigs) => void;
  // Fonction pour réinitialiser aux valeurs initiales
  resetConfigs: () => void;
}

export const useConfigs = create<ConfigsState>((set) => ({
  // Initialise le store avec les configurations par défaut
  ...initialConfigs,

  // Implémentation de la fonction de mise à jour
  update: (section, key, value) =>
    set((state) => ({
      // Crée un nouvel objet pour la section mise à jour
      [section]: {
        // Copie les valeurs existantes de la section
        ...state[section],
        // Met à jour la clé spécifique avec la nouvelle valeur
        [key]: value,
      },
    })),

  // Implémentation pour remplacer toutes les configurations
  setAllConfigs: (newConfigs) => set(newConfigs),

  // Implémentation pour réinitialiser
  resetConfigs: () => set(initialConfigs),
}));
