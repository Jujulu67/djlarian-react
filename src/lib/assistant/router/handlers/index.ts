/**
 * Barrel exports pour les handlers du router
 *
 * Ce module re-exporte tous les handlers individuels pour utilisation
 * dans router.ts et router-handlers.ts.
 */

// Types partagés
export type { ScopeResult, DetailIntentResult } from './types';
export { DETAILED_FIELDS_TO_SHOW } from './types';

// Handlers
export { isCapabilitiesQuestion, getCapabilitiesResponse } from './capabilities';
export { handleConversationalQuery } from './conversational';
export { handleCreateCommand } from './create';
export { handleListCommand } from './list';
export { handleDetailIntent } from './details';
export { handleUpdateCommand } from './update';
