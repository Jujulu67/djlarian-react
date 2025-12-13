/**
 * Tests de séquences réalistes (stateful)
 *
 * Valide le "working set" + mémoire de travail dans un flux réel
 * Scénarios: LIST → UPDATE, LIST filtré → UPDATE, etc.
 */

import { routeProjectCommand } from '../router';
import { ProjectCommandType } from '../types';
import type { Project } from '@/components/projects/types';
import { createProjectsDataset, expectUniqueProjectIds } from './test-project-factory';

// Mock des dépendances
jest.mock('../../query-parser/filters', () => ({
  detectFilters: jest.fn(),
}));

jest.mock('../../query-parser/classifier', () => ({
  classifyQuery: jest.fn(),
}));

jest.mock('../../query-parser/updates', () => ({
  extractUpdateData: jest.fn(),
}));

jest.mock('@/components/assistant/utils/filterProjects', () => ({
  filterProjects: jest.fn(),
}));

jest.mock('../../conversational/groq-responder', () => ({
  getConversationalResponse: jest.fn(),
}));

import { detectFilters } from '../../query-parser/filters';
import { classifyQuery } from '../../query-parser/classifier';
import { extractUpdateData } from '../../query-parser/updates';
import { filterProjects } from '@/components/assistant/utils/filterProjects';

const mockDetectFilters = detectFilters as jest.MockedFunction<typeof detectFilters>;
const mockClassifyQuery = classifyQuery as jest.MockedFunction<typeof classifyQuery>;
const mockExtractUpdateData = extractUpdateData as jest.MockedFunction<typeof extractUpdateData>;
const mockFilterProjects = filterProjects as jest.MockedFunction<typeof filterProjects>;

function createMockContext(projects: Project[]) {
  return {
    projects,
    availableCollabs: ['hoho', 'Collab1'],
    availableStyles: ['afro', 'tech house', 'Techno', 'House'],
    projectCount: projects.length,
  };
}

function createContextWithWorkingSet(
  baseContext: ReturnType<typeof createMockContext>,
  lastListedIds: string[],
  lastAppliedFilter?: Record<string, any>
) {
  return {
    ...baseContext,
    lastListedProjectIds: lastListedIds,
    lastAppliedFilter: lastAppliedFilter || {},
  };
}

function createMockClassification(overrides: Partial<any> = {}) {
  return {
    isUpdate: false,
    isList: false,
    isCreate: false,
    hasActionVerb: false,
    hasProjectMention: false,
    hasProjectRelatedFilters: false,
    understood: true,
    ...overrides,
  };
}

describe('Router - Séquences réalistes (stateful)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('LIST filtré → UPDATE "leur progression"', () => {
    it('devrait utiliser LastListedIds après un listing filtré', async () => {
      const dataset = createProjectsDataset();
      const projects = dataset.all.filter((p) => p.status === 'TERMINE').slice(0, 20);
      expectUniqueProjectIds(projects);

      // Étape 1: LIST filtré (terminés)
      const listedIds = projects.slice(0, 15).map((p) => p.id);
      const mockContext = createContextWithWorkingSet(createMockContext(projects), listedIds, {
        status: 'TERMINE',
      });

      mockDetectFilters.mockReturnValueOnce({
        filters: {},
        fieldsToShow: ['progress'],
      });
      mockClassifyQuery.mockReturnValueOnce(
        createMockClassification({
          isUpdate: true,
          hasActionVerb: true,
          hasProjectMention: true,
          hasProjectRelatedFilters: false,
          understood: true,
        })
      );
      mockExtractUpdateData.mockReturnValueOnce({
        newProgress: 40,
      });
      mockFilterProjects.mockReturnValueOnce({
        filtered: projects.slice(0, 15),
        nullProgressCount: 0,
        hasProgressFilter: false,
      });

      const updateResult = await routeProjectCommand('passe leur progression à 40%', {
        context: mockContext,
      });

      expect(updateResult.type).toBe(ProjectCommandType.UPDATE);
      if (updateResult.type === ProjectCommandType.UPDATE) {
        // Doit utiliser LastListedIds, PAS ExplicitFilter
        expect(updateResult.pendingAction.scopeSource).toBe('LastListedIds');
        expect(updateResult.pendingAction.affectedProjects).toHaveLength(15);
        expect(updateResult.pendingAction.affectedProjectIds).toHaveLength(15);
      }
    });
  });

  describe('LIST collab → push deadline "leur deadline"', () => {
    it('devrait utiliser LastListedIds après un listing par collab', async () => {
      const dataset = createProjectsDataset();
      const projects = dataset.all.filter((p) => p.collab === 'hoho').slice(0, 20);
      expectUniqueProjectIds(projects);

      const listedIds = projects.slice(0, 17).map((p) => p.id);
      const mockContext = createContextWithWorkingSet(createMockContext(projects), listedIds, {
        collab: 'hoho',
      });

      mockDetectFilters.mockReturnValueOnce({
        filters: {},
        fieldsToShow: ['deadline'],
      });
      mockClassifyQuery.mockReturnValueOnce(
        createMockClassification({
          isUpdate: true,
          hasActionVerb: true,
          hasProjectMention: true,
          hasProjectRelatedFilters: false,
          understood: true,
        })
      );
      mockExtractUpdateData.mockReturnValueOnce({
        pushDeadlineBy: { months: 1 },
      });
      mockFilterProjects.mockReturnValueOnce({
        filtered: projects.slice(0, 17),
        nullProgressCount: 0,
        hasProgressFilter: false,
      });

      const updateResult = await routeProjectCommand("pousse leur deadline d'un mois", {
        context: mockContext,
      });

      expect(updateResult.type).toBe(ProjectCommandType.UPDATE);
      if (updateResult.type === ProjectCommandType.UPDATE) {
        expect(updateResult.pendingAction.scopeSource).toBe('LastListedIds');
        expect(updateResult.pendingAction.affectedProjects).toHaveLength(17);
      }
    });
  });

  describe('UPDATE explicite après listing', () => {
    it('devrait utiliser ExplicitFilter si filtre explicite dans la mutation', async () => {
      const dataset = createProjectsDataset();
      const projects = dataset.all;
      expectUniqueProjectIds(projects);

      // Étape 1: LIST en cours
      const listedIds = projects
        .filter((p) => p.status === 'EN_COURS')
        .slice(0, 10)
        .map((p) => p.id);
      const mockContext = createContextWithWorkingSet(createMockContext(projects), listedIds, {
        status: 'EN_COURS',
      });

      // Étape 2: UPDATE explicite "passe les terminés à 20%"
      // Doit utiliser ExplicitFilter, PAS LastListedIds
      mockDetectFilters.mockReturnValueOnce({
        filters: { status: 'TERMINE' },
        fieldsToShow: ['progress'],
      });
      mockClassifyQuery.mockReturnValueOnce(
        createMockClassification({
          isUpdate: true,
          hasActionVerb: true,
          hasProjectMention: true,
          hasProjectRelatedFilters: true, // Filtre explicite
          understood: true,
        })
      );
      mockExtractUpdateData.mockReturnValueOnce({
        newProgress: 20,
      });
      const terminatedProjects = projects.filter((p) => p.status === 'TERMINE');
      mockFilterProjects.mockReturnValueOnce({
        filtered: terminatedProjects,
        nullProgressCount: 0,
        hasProgressFilter: false,
      });

      const updateResult = await routeProjectCommand('passe les terminés à 20%', {
        context: mockContext,
      });

      expect(updateResult.type).toBe(ProjectCommandType.UPDATE);
      if (updateResult.type === ProjectCommandType.UPDATE) {
        // Doit utiliser ExplicitFilter car filtre explicite dans la commande
        expect(updateResult.pendingAction.scopeSource).toBe('ExplicitFilter');
        expect(updateResult.pendingAction.filters.status).toBe('TERMINE');
      }
    });
  });
});
