/**
 * Mocks partagés pour les tests du router
 *
 * Ce fichier centralise les mocks utilisés par tous les tests du router
 * pour éviter la duplication et garantir la cohérence.
 *
 * IMPORTANT: Ce fichier doit être importé AVANT les imports des modules mockés
 * dans les fichiers de test.
 */

// Mock ai (pour generateText)
jest.mock('ai', () => ({
  generateText: jest.fn(),
}));

// Mock config (pour groq)
// Chemin depuis src/lib/assistant/router/__tests__/ vers src/lib/assistant/config
jest.mock('../../config', () => ({
  groq: jest.fn(),
}));

// Mock query-parser modules
// Chemins depuis src/lib/assistant/router/__tests__/ vers src/lib/assistant/query-parser/
jest.mock('../../query-parser/classifier', () => ({
  classifyQuery: jest.fn(),
}));

jest.mock('../../query-parser/filters', () => ({
  detectFilters: jest.fn(),
}));

jest.mock('../../query-parser/updates', () => ({
  extractUpdateData: jest.fn(),
}));

jest.mock('../../query-parser/creates', () => ({
  extractCreateData: jest.fn(),
}));

// Mock filterProjects
// Chemin depuis src/lib/assistant/router/__tests__/ vers src/components/assistant/utils/
jest.mock('@/components/assistant/utils/filterProjects', () => ({
  filterProjects: jest.fn(),
}));

// Mock conversational groq-responder
// Chemin depuis src/lib/assistant/router/__tests__/ vers src/lib/assistant/conversational/
jest.mock('../../conversational/groq-responder', () => ({
  getConversationalResponse: jest.fn(),
}));
