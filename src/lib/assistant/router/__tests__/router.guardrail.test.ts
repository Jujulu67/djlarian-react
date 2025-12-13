/**
 * Tests garde-fous (anti scope explosion)
 *
 * Empêche la régression la plus dangereuse: une mutation sans filtre explicite
 * qui sort du LastListedIds (hors scope_missing).
 */

// Import des mocks partagés AVANT les autres imports
import './router-test-mocks';

import { routeProjectCommand } from '../router';
import { ProjectCommandType } from '../types';
import type { Project } from '@/components/projects/types';
import {
  resetTestProjectFactory,
  createProjectsDataset,
  expectUniqueProjectIds,
} from './test-project-factory';

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

describe('Router - Garde-fou anti scope explosion', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetTestProjectFactory();
  });

  it('devrait refuser une mutation sans filtre explicite qui sort du LastListedIds', async () => {
    // Setup: listing filtré (17 projets)
    const dataset = createProjectsDataset();
    const projects = dataset.all;
    expectUniqueProjectIds(projects);

    const listedIds = projects.slice(0, 17).map((p) => p.id);
    const listedCount = listedIds.length;
    const mockContext = createContextWithWorkingSet(createMockContext(projects), listedIds, {
      status: 'TERMINE',
    });

    // Mutation sans filtre explicite
    mockDetectFilters.mockReturnValueOnce({
      filters: {}, // Pas de filtre explicite
      fieldsToShow: ['progress'],
    });
    mockClassifyQuery.mockReturnValueOnce(
      createMockClassification({
        isUpdate: true,
        hasActionVerb: true,
        hasProjectMention: true,
        hasProjectRelatedFilters: false, // Pas de filtre explicite
        understood: true,
      })
    );
    mockExtractUpdateData.mockReturnValueOnce({
      newProgress: 40,
    });

    // Simuler un filtre qui retourne PLUS de projets que listés (danger!)
    // Le router devrait utiliser LastListedIds et limiter à 17
    const allTerminatedProjects = projects.filter((p) => p.status === 'TERMINE');
    mockFilterProjects.mockReturnValueOnce({
      filtered: allTerminatedProjects, // Plus que 17!
      nullProgressCount: 0,
      hasProgressFilter: false,
    });

    const updateResult = await routeProjectCommand('passe leur progression à 40%', {
      context: mockContext,
    });

    expect(updateResult.type).toBe(ProjectCommandType.UPDATE);
    if (updateResult.type === ProjectCommandType.UPDATE) {
      // GARDE-FOU: doit utiliser LastListedIds, pas AllProjects ou ExplicitFilter
      expect(updateResult.pendingAction.scopeSource).toBe('LastListedIds');

      // GARDE-FOU: affectedCount doit être <= listedCount
      expect(updateResult.pendingAction.affectedProjects.length).toBeLessThanOrEqual(listedCount);
      expect(updateResult.pendingAction.affectedProjectIds.length).toBeLessThanOrEqual(listedCount);

      // GARDE-FOU: ne doit PAS être AllProjects ou ExplicitFilter
      expect(updateResult.pendingAction.scopeSource).not.toBe('AllProjects');
      expect(updateResult.pendingAction.scopeSource).not.toBe('ExplicitFilter');
    }
  });

  it('devrait permettre scope_missing si vraiment aucun projet listé', async () => {
    // Setup: aucun listing précédent
    const dataset = createProjectsDataset();
    const projects = dataset.all;
    expectUniqueProjectIds(projects);

    const mockContext = createContextWithWorkingSet(
      createMockContext(projects),
      [], // Pas de listing précédent
      {} // Pas de filtre appliqué
    );

    // Mutation sans filtre explicite et sans listing
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
      filtered: projects.filter((p) => p.status === 'TERMINE'),
      nullProgressCount: 0,
      hasProgressFilter: false,
    });

    const updateResult = await routeProjectCommand('passe leur progression à 40%', {
      context: mockContext,
    });

    // Si pas de listing précédent, le router doit retourner GENERAL avec scope_missing
    // (pas de fallback automatique AllProjects)
    expect(updateResult.type).toBe(ProjectCommandType.GENERAL);
    if (updateResult.type === ProjectCommandType.GENERAL) {
      expect(updateResult.confirmationType).toBe('scope_missing');
      expect(updateResult.proposedMutation).toBeDefined();
      expect(updateResult.proposedMutation?.newProgress).toBe(40);
      expect(updateResult.totalProjectsCount).toBe(projects.length);
    }
  });
});
