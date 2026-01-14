/**
 * Handlers internes pour le routeur de commandes projets
 *
 * Ce module a été refactoré en PR6 pour extraire les handlers
 * individuels dans des fichiers séparés.
 *
 * Les handlers sont maintenant dans:
 * - handlers/capabilities.ts
 * - handlers/conversational.ts
 * - handlers/create.ts
 * - handlers/list.ts
 * - handlers/details.ts
 * - handlers/update.ts
 *
 * Ce fichier conserve les re-exports pour compatibilité.
 */

// Re-export tous les handlers depuis le nouveau module
export {
  // Types
  type ScopeResult,
  type DetailIntentResult,
  DETAILED_FIELDS_TO_SHOW,
  // Handlers
  isCapabilitiesQuestion,
  getCapabilitiesResponse,
  handleConversationalQuery,
  handleCreateCommand,
  handleListCommand,
  handleDetailIntent,
  handleUpdateCommand,
} from './handlers';
