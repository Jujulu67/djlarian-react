/**
 * Types pour le routeur de commandes projets
 * Définit les structures de données pour le routing et le traitement des commandes
 */

import type { Project } from '@/components/projects/types';
import type { QueryFilters } from '@/components/assistant/types';

/**
 * Type de commande projet détecté par le routeur
 */
export enum ProjectCommandType {
  /** Listing de projets (avec ou sans filtres) */
  LIST = 'list',
  /** Création de projet(s) */
  CREATE = 'create',
  /** Modification de projet(s) via filtre */
  UPDATE = 'update',
  /** Ajout de note à un projet */
  ADD_NOTE = 'add_note',
  /** Question généraliste (pas de commande projet) */
  GENERAL = 'general',
}

/**
 * Filtres de projet pour le listing
 */
export interface ProjectFilter extends QueryFilters {
  /** Tri par champ */
  sortBy?: keyof Project | null;
  /** Direction du tri */
  sortDirection?: 'asc' | 'desc';
  /** Année de release */
  year?: number;
}

/**
 * Mutation à appliquer à un projet
 */
export interface ProjectMutation {
  /** Nouveau statut */
  newStatus?: string;
  /** Nouvelle deadline */
  newDeadline?: string;
  /** Décalage de deadline (relatif) */
  pushDeadlineBy?: {
    days?: number;
    weeks?: number;
    months?: number;
    years?: number;
  };
  /** Nouvelle progression */
  newProgress?: number;
  /** Nouveau collaborateur */
  newCollab?: string;
  /** Nouveau style */
  newStyle?: string;
  /** Nouveau label */
  newLabel?: string;
  /** Nouveau label final */
  newLabelFinal?: string;
  /** Note à ajouter */
  newNote?: string;
  /** Nom du projet (pour note spécifique) */
  projectName?: string;
}

/**
 * Diff avant→après pour un projet
 */
export interface ProjectPreviewDiff {
  /** ID du projet */
  id: string;
  /** Nom du projet */
  name: string;
  /** Liste des changements formatés (ex: "progress 30% → 50%", "status EN_COURS → TERMINE") */
  changes: string[];
}

/**
 * Action en attente de confirmation
 */
export interface PendingConfirmationAction {
  /** ID unique de l'action */
  actionId: string;
  /** Type de commande */
  type: ProjectCommandType.UPDATE | ProjectCommandType.ADD_NOTE;
  /** Filtres appliqués pour sélectionner les projets */
  filters: QueryFilters;
  /** Mutation à appliquer */
  mutation: ProjectMutation;
  /** Liste des projets qui seront impactés (complets pour affichage) */
  affectedProjects: Project[];
  /** IDs des projets affectés (pour persistance précise quand scope = LastListedIds) */
  affectedProjectIds: string[];
  /** Source du scope utilisé (pour tracer l'origine et décider de la persistance) */
  scopeSource: 'LastListedIds' | 'LastAppliedFilter' | 'AllProjects' | 'ExplicitFilter';
  /** Champs à afficher dans l'UI (comme pour un listing) */
  fieldsToShow: string[];
  /** Message de description de l'action */
  description: string;
  /** ID de corrélation pour tracer la requête de bout en bout (optionnel) */
  requestId?: string;
  /** Diff avant→après pour les 3 premiers projets affectés (optionnel) */
  previewDiff?: ProjectPreviewDiff[];
}

/**
 * Résultat d'une commande de listing
 */
export interface ListCommandResult {
  type: ProjectCommandType.LIST;
  /** Projets filtrés et triés */
  projects: Project[];
  /** Nombre total de projets */
  count: number;
  /** Champs à afficher dans l'UI */
  fieldsToShow: string[];
  /** Message de réponse */
  message: string;
  /** Filtres appliqués pour ce listing (pour mémoire de travail) */
  appliedFilter: ProjectFilter;
  /** IDs des projets listés (pour mémoire de travail) */
  listedProjectIds: string[];
  /** ID de corrélation pour tracer la requête de bout en bout (optionnel) */
  requestId?: string;
}

/**
 * Résultat d'une commande de création
 */
export interface CreateCommandResult {
  type: ProjectCommandType.CREATE;
  /** Projet créé (structure minimale, le vrai projet sera créé côté serveur) */
  project: Project;
  /** Message de réponse */
  message: string;
  /** Données brutes de création pour l'API */
  createData?: {
    name: string;
    collab?: string;
    deadline?: string;
    progress?: number;
    status?: string;
    style?: string;
  };
  /** ID de corrélation pour tracer la requête de bout en bout (optionnel) */
  requestId?: string;
}

/**
 * Résultat d'une commande nécessitant confirmation
 */
export interface PendingActionResult {
  type: ProjectCommandType.UPDATE | ProjectCommandType.ADD_NOTE;
  /** Action en attente de confirmation */
  pendingAction: PendingConfirmationAction;
  /** Message de réponse */
  message: string;
  /** ID de corrélation pour tracer la requête de bout en bout (optionnel) */
  requestId?: string;
}

/**
 * Résultat d'une question généraliste
 */
export interface GeneralCommandResult {
  type: ProjectCommandType.GENERAL;
  /** Réponse textuelle de Groq */
  response: string;
  /** ID de corrélation pour tracer la requête de bout en bout (optionnel) */
  requestId?: string;
}

/**
 * Résultat d'une demande de confirmation de scope manquant
 *
 * Différent de PendingUpdateConfirmation : cette confirmation demande à l'utilisateur
 * s'il veut appliquer une mutation à tous les projets (car pas de scope récent).
 */
export interface PendingScopeConfirmationResult {
  type: ProjectCommandType.GENERAL;
  /** Type spécial pour identifier cette confirmation */
  confirmationType: 'scope_missing';
  /** Message demandant confirmation */
  response: string;
  /** Mutation qui serait appliquée si confirmé */
  proposedMutation: ProjectMutation;
  /** Nombre total de projets qui seraient affectés */
  totalProjectsCount: number;
  /** ID de corrélation pour tracer la requête de bout en bout (optionnel) */
  requestId?: string;
}

/**
 * Résultat d'une commande projet
 */
export type ProjectCommandResult =
  | ListCommandResult
  | CreateCommandResult
  | PendingActionResult
  | GeneralCommandResult
  | PendingScopeConfirmationResult;

/**
 * Contexte disponible pour le routeur
 */
export interface RouterContext {
  /** Tous les projets en mémoire côté client */
  projects: Project[];
  /** Collaborateurs disponibles (extraits des projets) */
  availableCollabs: string[];
  /** Styles disponibles (extraits des projets) */
  availableStyles: string[];
  /** Nombre total de projets */
  projectCount: number;
  /** Filtres appliqués lors du dernier listing (mémoire de travail) */
  lastAppliedFilter?: ProjectFilter;
  /** IDs des projets listés lors du dernier listing (mémoire de travail) */
  lastListedProjectIds?: string[];
}

/**
 * Options pour le routeur
 */
export interface RouterOptions {
  /** Contexte avec projets en mémoire */
  context: RouterContext;
  /** Historique de conversation optionnel */
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string; timestamp: Date }>;
  /** Filtres de la dernière requête (pour inférence) - DEPRECATED, utiliser context.lastAppliedFilter */
  lastFilters?: QueryFilters;
  /** ID de corrélation pour tracer la requête de bout en bout (optionnel) */
  requestId?: string;
}
