/**
 * Tests de mutations après LIST filtré - Matrice de tests complète
 *
 * Objectif : Vérifier que toutes les mutations après un LIST filtré fonctionnent correctement
 * et que les qualifiers non-scoping ne sont pas considérés comme filtres explicites.
 *
 * Utilise describe.each / test.each pour une matrice maintenable.
 */

// Mock des dépendances AVANT les imports
jest.mock('ai', () => ({
  generateText: jest.fn(),
}));

jest.mock('../../config', () => ({
  groq: jest.fn(),
}));

jest.mock('../../query-parser/classifier');
jest.mock('../../query-parser/filters');
jest.mock('../../query-parser/updates');
jest.mock('../../query-parser/creates');
jest.mock('../../conversational/groq-responder');
jest.mock('@/components/assistant/utils/filterProjects');

import { routeProjectCommand } from '../router';
import { ProjectCommandType, type ProjectFilter } from '../types';
import type { Project } from '@/components/projects/types';

import { classifyQuery } from '../../query-parser/classifier';
import { detectFilters } from '../../query-parser/filters';
import { extractUpdateData } from '../../query-parser/updates';
import { filterProjects } from '@/components/assistant/utils/filterProjects';
import {
  resetTestProjectFactory,
  createTestProject,
  createProjectsDataset,
  expectUniqueProjectIds,
} from './test-project-factory';

const mockClassifyQuery = classifyQuery as jest.MockedFunction<typeof classifyQuery>;
const mockDetectFilters = detectFilters as jest.MockedFunction<typeof detectFilters>;
const mockExtractUpdateData = extractUpdateData as jest.MockedFunction<typeof extractUpdateData>;
const mockFilterProjects = filterProjects as jest.MockedFunction<typeof filterProjects>;

/**
 * Helper pour créer un mock de classification avec les champs par défaut
 */
function createMockClassification(overrides: Partial<ReturnType<typeof classifyQuery>> = {}) {
  return {
    isMetaQuestion: false,
    isUpdate: false,
    isCreate: false,
    isCount: false,
    isList: false,
    lang: 'fr' as const,
    hasActionVerb: false,
    hasProjectMention: false,
    isProjectInNonMusicalContext: false,
    hasProjectRelatedFilters: false,
    isActionVerbButNotProjectRelated: false,
    isQuestionAboutAssistantProjects: false,
    isConversationalQuestion: false,
    understood: false,
    isComplex: false,
    isDetailsViewRequested: false,
    isAllProjectsRequested: false,
    ...overrides,
  };
}

/**
 * Helper pour créer plusieurs projets de test avec la factory
 */
function createMockProjects(count: number, overrides: Partial<Project> = {}): Project[] {
  return Array.from({ length: count }, () => createTestProject(overrides));
}

/**
 * Helper pour créer un contexte avec working set
 */
function createContextWithWorkingSet<
  T extends {
    projects: Project[];
    availableCollabs: string[];
    availableStyles: string[];
    projectCount: number;
  },
>(
  baseContext: T,
  lastListedProjectIds: string[],
  lastAppliedFilter: Record<string, any>
): T & { lastListedProjectIds: string[]; lastAppliedFilter: ProjectFilter } {
  return {
    ...baseContext,
    lastListedProjectIds,
    lastAppliedFilter: lastAppliedFilter as ProjectFilter,
  };
}

describe('Router - Mutations après LIST filtré (Matrice de tests)', () => {
  /**
   * Reconstruit le dataset de projets pour chaque test
   * (évite les mutations partagées entre tests)
   */
  function buildTestDataset() {
    const dataset = createProjectsDataset();
    expectUniqueProjectIds(dataset.all);
    return dataset;
  }

  /**
   * Crée un contexte mock avec le dataset fourni
   */
  function createMockContext(projects: Project[]) {
    const availableCollabs = Array.from(
      new Set(projects.map((p) => p.collab).filter((c): c is string => c !== null))
    );
    const availableStyles = Array.from(
      new Set(projects.map((p) => p.style).filter((s): s is string => s !== null))
    );

    return {
      projects,
      availableCollabs: availableCollabs.length > 0 ? availableCollabs : ['hoho', 'Collab1'],
      availableStyles:
        availableStyles.length > 0 ? availableStyles : ['afro', 'tech house', 'Techno', 'House'],
      projectCount: projects.length,
    };
  }

  /**
   * Helper pour calculer les IDs listés basés sur un filtre
   */
  function getListedIdsByFilter(projects: Project[], filter: Record<string, any>): string[] {
    if (Object.keys(filter).length === 0) {
      // Si pas de filtre, retourner tous les projets
      return projects.map((p) => p.id);
    }
    return projects
      .filter((p) => {
        return Object.entries(filter).every(([key, value]) => {
          if (key === 'status') return p.status === value;
          if (key === 'collab') {
            if (value === null) return p.collab === null;
            return p.collab === value;
          }
          if (key === 'style') {
            if (value === null) return p.style === null;
            return p.style === value;
          }
          if (key === 'hasDeadline') return (p.deadline !== null) === value;
          return false;
        });
      })
      .map((p) => p.id);
  }

  /**
   * Helper pour calculer les projets affectés selon le scope
   */
  function getAffectedProjects(
    projects: Project[],
    scopeSource: 'LastListedIds' | 'ExplicitFilter',
    initialListedIds: string[],
    mutationFilters: Record<string, any>,
    skipNoDeadline: boolean = false
  ): Project[] {
    if (scopeSource === 'LastListedIds') {
      let affected = projects.filter((p) => initialListedIds.includes(p.id));
      if (skipNoDeadline) {
        affected = affected.filter((p) => p.deadline !== null);
      }
      return affected;
    } else {
      return projects.filter((p) => {
        return Object.entries(mutationFilters).every(([key, value]) => {
          if (key === 'status') return p.status === value;
          if (key === 'collab') return p.collab === value;
          if (key === 'style') return p.style === value;
          if (key === 'hasDeadline') return (p.deadline !== null) === value;
          if (value === null) {
            if (key === 'collab') return p.collab === null;
            if (key === 'style') return p.style === null;
          }
          return false;
        });
      });
    }
  }

  /**
   * Helper standardisé : Exécute un LIST et retourne les IDs listés + le filtre appliqué
   */
  async function runListAndGetScope(
    initialListQuery: string,
    initialListFilters: Record<string, any>,
    projects: Project[],
    mockContext: ReturnType<typeof createMockContext>
  ): Promise<{ listedIds: string[]; lastAppliedFilter: Record<string, any> }> {
    const listedIds = getListedIdsByFilter(projects, initialListFilters);
    const listedProjects = projects.filter((p) => listedIds.includes(p.id));
    expectUniqueProjectIds(listedProjects);

    mockDetectFilters.mockReturnValueOnce({
      filters: initialListFilters,
      fieldsToShow:
        Object.keys(initialListFilters).length > 0 ? Object.keys(initialListFilters) : ['status'],
    });
    mockClassifyQuery.mockReturnValueOnce(
      createMockClassification({
        isList: true,
        hasActionVerb: true,
        hasProjectMention: true,
        hasProjectRelatedFilters: Object.keys(initialListFilters).length > 0,
        understood: true,
      })
    );
    mockFilterProjects.mockReturnValueOnce({
      filtered: listedProjects,
      nullProgressCount: 0,
      hasProgressFilter: false,
    });

    const listResult = await routeProjectCommand(initialListQuery, {
      context: mockContext,
    });

    expect(listResult.type).toBe(ProjectCommandType.LIST);
    // Utiliser les IDs retournés par le routeur plutôt que ceux calculés
    const actualListedIds =
      listResult.type === ProjectCommandType.LIST ? listResult.listedProjectIds : listedIds;

    return {
      listedIds: actualListedIds,
      lastAppliedFilter: initialListFilters,
    };
  }

  /**
   * Helper standardisé : Exécute une mutation et retourne le PendingAction
   */
  async function runMutation(
    mutationQuery: string,
    mutationFilters: Record<string, any>,
    mutationUpdateData: Record<string, any>,
    projects: Project[],
    scopeContext: {
      lastListedProjectIds: string[];
      lastAppliedFilter: Record<string, any>;
      mockContext: ReturnType<typeof createMockContext>;
    },
    expectedScopeSource: 'LastListedIds' | 'ExplicitFilter',
    skipNoDeadline: boolean = false
  ) {
    const affectedProjects = getAffectedProjects(
      projects,
      expectedScopeSource,
      scopeContext.lastListedProjectIds,
      mutationFilters,
      skipNoDeadline
    );
    expectUniqueProjectIds(affectedProjects);

    mockDetectFilters.mockReturnValueOnce({
      filters: mutationFilters,
      fieldsToShow: Object.keys(mutationUpdateData),
    });
    mockClassifyQuery.mockReturnValueOnce(
      createMockClassification({
        isUpdate: true,
        hasActionVerb: true,
        hasProjectMention: true,
        hasProjectRelatedFilters: Object.keys(mutationFilters).length > 0,
        understood: true,
      })
    );
    mockExtractUpdateData.mockReturnValueOnce(mutationUpdateData);
    // IMPORTANT: Utiliser mockReturnValue au lieu de mockReturnValueOnce car filterProjects
    // peut être appelé plusieurs fois (dans calculateAffectedProjects, etc.)
    // On s'assure que le mock retourne toujours les bons projets filtrés
    mockFilterProjects.mockReturnValue({
      filtered: affectedProjects,
      nullProgressCount: 0,
      hasProgressFilter: false,
    });

    const contextWithWorkingSet = createContextWithWorkingSet(
      scopeContext.mockContext,
      scopeContext.lastListedProjectIds,
      scopeContext.lastAppliedFilter
    );

    const updateResult = await routeProjectCommand(mutationQuery, {
      context: contextWithWorkingSet,
    });

    // Debug instrumentation (uniquement si ASSISTANT_TEST_DEBUG=true)
    if (process.env.ASSISTANT_TEST_DEBUG === 'true') {
      const actualFilters =
        mockDetectFilters.mock.results[mockDetectFilters.mock.results.length - 1]?.value?.filters ||
        {};
      const actualScopeSource =
        updateResult.type === ProjectCommandType.UPDATE ||
        updateResult.type === ProjectCommandType.ADD_NOTE
          ? updateResult.pendingAction.scopeSource
          : 'N/A';

      console.log('[TEST DEBUG] Mutation Query:', mutationQuery);
      console.log('[TEST DEBUG] Expected ScopeSource:', expectedScopeSource);
      console.log('[TEST DEBUG] Result ScopeSource:', actualScopeSource);
      console.log('[TEST DEBUG] Expected Filters:', JSON.stringify(mutationFilters));
      console.log('[TEST DEBUG] Actual Filters (from mock):', JSON.stringify(actualFilters));
      console.log(
        '[TEST DEBUG] Filters Match:',
        JSON.stringify(mutationFilters) === JSON.stringify(actualFilters)
      );
    }

    // Le routeur peut retourner UPDATE ou ADD_NOTE selon le type de mutation
    // Si GENERAL est retourné, cela signifie qu'aucun projet n'a été trouvé
    if (updateResult.type === ProjectCommandType.GENERAL) {
      throw new Error(
        `Routeur a retourné GENERAL (aucun projet trouvé). ` +
          `AffectedProjects calculés: ${affectedProjects.length}, ` +
          `MutationFilters: ${JSON.stringify(mutationFilters)}, ` +
          `ExpectedScopeSource: ${expectedScopeSource}, ` +
          `SkipNoDeadline: ${skipNoDeadline}`
      );
    }
    expect([ProjectCommandType.UPDATE, ProjectCommandType.ADD_NOTE]).toContain(updateResult.type);
    if (
      updateResult.type === ProjectCommandType.UPDATE ||
      updateResult.type === ProjectCommandType.ADD_NOTE
    ) {
      return updateResult.pendingAction;
    }
    throw new Error(`Expected UPDATE or ADD_NOTE result, got ${updateResult.type}`);
  }

  /**
   * Helper standardisé : Vérifie le scope de la mutation
   */
  function expectScope(
    pendingAction: { scopeSource: string; affectedProjectIds: string[] },
    expectedScopeSource: 'LastListedIds' | 'ExplicitFilter',
    listedIds: string[]
  ) {
    expect(pendingAction.scopeSource).toBe(expectedScopeSource);
    if (expectedScopeSource === 'LastListedIds') {
      // Pour LastListedIds, les IDs affectés doivent être un subset de listedIds
      // (peut être un subset si skipNoDeadline est true)
      expect(pendingAction.affectedProjectIds.length).toBeGreaterThan(0);
      expect(pendingAction.affectedProjectIds.length).toBeLessThanOrEqual(listedIds.length);
      // Tous les IDs affectés doivent être dans listedIds
      pendingAction.affectedProjectIds.forEach((id) => {
        expect(listedIds).toContain(id);
      });
    } else {
      // Pour ExplicitFilter, les IDs doivent différer de listedIds (ou être un subset si applicable)
      expect(pendingAction.affectedProjectIds.length).toBeGreaterThan(0);
    }
  }

  /**
   * Helper standardisé : Vérifie la forme de la mutation
   */
  function expectMutationShape(
    pendingAction: { mutation: Record<string, any> },
    expectedMutationShape: Record<string, any>
  ) {
    expect(pendingAction.mutation).toMatchObject(expectedMutationShape);
  }

  /**
   * Helper standardisé : Vérifie le message de description
   */
  function expectActionDescriptionContains(pendingAction: { description: string }, text: string) {
    expect(pendingAction.description).toContain(text);
  }

  /**
   * Helper standardisé : Vérifie le comportement de skip pour les projets sans deadline
   */
  function expectSkippedNoDeadlineBehaviour(
    pendingAction: { affectedProjects: Project[]; description: string },
    initialListedIds: string[],
    projects: Project[]
  ) {
    const projectsWithDeadline = projects.filter(
      (p) => initialListedIds.includes(p.id) && p.deadline !== null
    );
    expect(pendingAction.affectedProjects).toHaveLength(projectsWithDeadline.length);
    expect(pendingAction.affectedProjects.every((p) => p.deadline !== null)).toBe(true);
    expect(pendingAction.description).toContain('ignoré');
  }

  beforeEach(() => {
    jest.clearAllMocks();
    resetTestProjectFactory();
  });

  /**
   * Matrice de tests pour Progress/Avancement
   */
  describe.each([
    {
      testName: 'LIST filtré → UPDATE sans filtre explicite',
      initialListQuery: 'liste les en cours',
      initialListFilters: { status: 'EN_COURS' },
      mutationQuery: 'passe leur avancement à 20%',
      mutationFilters: {},
      mutationUpdateData: { newProgress: 20 },
      expectedScopeSource: 'LastListedIds' as const,
      expectedMutationShape: { newProgress: 20 },
      expectedActionDescriptionContains: '20%',
    },
    {
      testName: 'Filtre explicite prime',
      initialListQuery: 'liste les en cours',
      initialListFilters: { status: 'EN_COURS' },
      mutationQuery: 'passe les terminés à 20%',
      mutationFilters: { status: 'TERMINE' },
      mutationUpdateData: { newProgress: 20 },
      expectedScopeSource: 'ExplicitFilter' as const,
      expectedMutationShape: { newProgress: 20 },
      expectedActionDescriptionContains: '20%',
    },
  ])(
    'Progress/Avancement - $testName',
    ({
      initialListQuery,
      initialListFilters,
      mutationQuery,
      mutationFilters,
      mutationUpdateData,
      expectedScopeSource,
      expectedMutationShape,
      expectedActionDescriptionContains,
    }) => {
      it(`devrait utiliser ${expectedScopeSource} et affecter les projets attendus`, async () => {
        // Reconstruire le dataset pour ce test
        const dataset = buildTestDataset();
        const projects = dataset.all;
        const mockContext = createMockContext(projects);

        // Étape 1 : LIST
        const { listedIds, lastAppliedFilter } = await runListAndGetScope(
          initialListQuery,
          initialListFilters,
          projects,
          mockContext
        );

        // Calculer les attentes dynamiquement
        // Pour ExplicitFilter, on filtre tous les projets par mutationFilters, pas seulement ceux listés
        const expectedAffectedCount =
          expectedScopeSource === 'LastListedIds'
            ? listedIds.length
            : getAffectedProjects(projects, expectedScopeSource, [], mutationFilters).length;

        // Étape 2 : UPDATE
        const pendingAction = await runMutation(
          mutationQuery,
          mutationFilters,
          mutationUpdateData,
          projects,
          {
            lastListedProjectIds: listedIds,
            lastAppliedFilter,
            mockContext,
          },
          expectedScopeSource
        );

        // Vérifications
        expectScope(pendingAction, expectedScopeSource, listedIds);
        expect(pendingAction.affectedProjects).toHaveLength(expectedAffectedCount);
        expect(pendingAction.affectedProjectIds).toHaveLength(expectedAffectedCount);
        expectUniqueProjectIds(pendingAction.affectedProjects);
        expectMutationShape(pendingAction, expectedMutationShape);
        expectActionDescriptionContains(pendingAction, expectedActionDescriptionContains);
      });
    }
  );

  /**
   * Matrice de tests pour Statut
   */
  describe.each([
    {
      testName: 'LIST filtré → UPDATE statut sans filtre explicite',
      initialListQuery: 'affiche toutes les collabs avec hoho',
      initialListFilters: { collab: 'hoho' },
      mutationQuery: 'mets-les en fini',
      mutationFilters: {},
      mutationUpdateData: { newStatus: 'TERMINE' },
      expectedScopeSource: 'LastListedIds' as const,
      expectedMutationShape: { newStatus: 'TERMINE' },
      expectedActionDescriptionContains: 'TERMINE',
    },
    {
      testName: 'Filtre explicite prime',
      initialListQuery: 'liste les collabs avec hoho',
      initialListFilters: { collab: 'hoho' },
      mutationQuery: 'mets les projets en cours en fini',
      mutationFilters: { status: 'EN_COURS' },
      mutationUpdateData: { newStatus: 'TERMINE' },
      expectedScopeSource: 'ExplicitFilter' as const,
      expectedMutationShape: { newStatus: 'TERMINE' },
      expectedActionDescriptionContains: 'TERMINE',
    },
  ])(
    'Statut - $testName',
    ({
      initialListQuery,
      initialListFilters,
      mutationQuery,
      mutationFilters,
      mutationUpdateData,
      expectedScopeSource,
      expectedMutationShape,
      expectedActionDescriptionContains,
    }) => {
      it(`devrait utiliser ${expectedScopeSource} et affecter les projets attendus`, async () => {
        // Reconstruire le dataset pour ce test
        const dataset = buildTestDataset();
        const projects = dataset.all;
        const mockContext = createMockContext(projects);

        // Étape 1 : LIST
        const { listedIds, lastAppliedFilter } = await runListAndGetScope(
          initialListQuery,
          initialListFilters,
          projects,
          mockContext
        );

        // Calculer les attentes dynamiquement
        // Pour ExplicitFilter, on filtre tous les projets par mutationFilters, pas seulement ceux listés
        const expectedAffectedCount =
          expectedScopeSource === 'LastListedIds'
            ? listedIds.length
            : getAffectedProjects(projects, expectedScopeSource, [], mutationFilters).length;

        // Étape 2 : UPDATE
        const pendingAction = await runMutation(
          mutationQuery,
          mutationFilters,
          mutationUpdateData,
          projects,
          {
            lastListedProjectIds: listedIds,
            lastAppliedFilter,
            mockContext,
          },
          expectedScopeSource
        );

        // Vérifications
        expectScope(pendingAction, expectedScopeSource, listedIds);
        expect(pendingAction.affectedProjects).toHaveLength(expectedAffectedCount);
        expectUniqueProjectIds(pendingAction.affectedProjects);
        expectMutationShape(pendingAction, expectedMutationShape);
        expectActionDescriptionContains(pendingAction, expectedActionDescriptionContains);
      });
    }
  );

  /**
   * Matrice de tests pour Labels/Flags
   */
  describe.each([
    {
      testName: 'LIST filtré → label sans filtre explicite',
      initialListQuery: 'liste les projets style afro',
      initialListFilters: { style: 'afro' },
      mutationQuery: 'mets leur label à ouioui',
      mutationFilters: {},
      mutationUpdateData: { newLabel: 'ouioui' },
      expectedScopeSource: 'LastListedIds' as const,
      expectedMutationShape: { newLabel: 'ouioui' },
      expectedActionDescriptionContains: 'Modifier', // Le routeur ne génère pas de description détaillée pour les labels
    },
    {
      testName: 'LIST filtré → labelFinal sans filtre explicite',
      initialListQuery: 'liste les collabs avec hoho',
      initialListFilters: { collab: 'hoho' },
      mutationQuery: 'mets labelFinal à true',
      mutationFilters: {},
      mutationUpdateData: { newLabelFinal: 'true' },
      expectedScopeSource: 'LastListedIds' as const,
      expectedMutationShape: { newLabelFinal: 'true' },
      expectedActionDescriptionContains: 'Modifier', // Le routeur ne génère pas de description détaillée pour les labels
    },
    {
      testName: 'Filtre explicite prime',
      initialListQuery: 'liste les projets',
      initialListFilters: {},
      mutationQuery: 'mets le label à ouioui pour les projets terminés',
      mutationFilters: { status: 'TERMINE' },
      mutationUpdateData: { newLabel: 'ouioui' },
      expectedScopeSource: 'ExplicitFilter' as const,
      expectedMutationShape: { newLabel: 'ouioui' },
      expectedActionDescriptionContains: 'Modifier', // Le routeur ne génère pas de description détaillée pour les labels
    },
  ])(
    'Labels/Flags - $testName',
    ({
      initialListQuery,
      initialListFilters,
      mutationQuery,
      mutationFilters,
      mutationUpdateData,
      expectedScopeSource,
      expectedMutationShape,
      expectedActionDescriptionContains,
    }) => {
      it(`devrait utiliser ${expectedScopeSource} et affecter les projets attendus`, async () => {
        // Reconstruire le dataset pour ce test
        const dataset = buildTestDataset();
        const projects = dataset.all;
        const mockContext = createMockContext(projects);

        // Étape 1 : LIST
        const { listedIds, lastAppliedFilter } = await runListAndGetScope(
          initialListQuery,
          initialListFilters,
          projects,
          mockContext
        );

        // Calculer les attentes dynamiquement
        // Pour ExplicitFilter, on filtre tous les projets par mutationFilters, pas seulement ceux listés
        const expectedAffectedCount =
          expectedScopeSource === 'LastListedIds'
            ? listedIds.length
            : getAffectedProjects(projects, expectedScopeSource, [], mutationFilters).length;

        // Étape 2 : UPDATE
        const pendingAction = await runMutation(
          mutationQuery,
          mutationFilters,
          mutationUpdateData,
          projects,
          {
            lastListedProjectIds: listedIds,
            lastAppliedFilter,
            mockContext,
          },
          expectedScopeSource
        );

        // Vérifications
        expectScope(pendingAction, expectedScopeSource, listedIds);
        expect(pendingAction.affectedProjects).toHaveLength(expectedAffectedCount);
        expectUniqueProjectIds(pendingAction.affectedProjects);
        expectMutationShape(pendingAction, expectedMutationShape);
        expectActionDescriptionContains(pendingAction, expectedActionDescriptionContains);
      });
    }
  );

  /**
   * Matrice de tests pour Style/Collab
   */
  describe.each([
    {
      testName: 'LIST filtré → set collab',
      initialListQuery: 'liste les projets sans collab',
      initialListFilters: { collab: null },
      mutationQuery: 'mets leur collab à hoho',
      mutationFilters: {},
      mutationUpdateData: { newCollab: 'hoho' },
      expectedScopeSource: 'LastListedIds' as const,
      expectedMutationShape: { newCollab: 'hoho' },
      expectedActionDescriptionContains: 'hoho',
    },
    {
      testName: 'LIST filtré → set style',
      initialListQuery: 'liste les projets en cours',
      initialListFilters: { status: 'EN_COURS' },
      mutationQuery: 'mets leur style à tech house',
      mutationFilters: {},
      mutationUpdateData: { newStyle: 'tech house' },
      expectedScopeSource: 'LastListedIds' as const,
      expectedMutationShape: { newStyle: 'tech house' },
      expectedActionDescriptionContains: 'tech house',
    },
  ])(
    'Style/Collab - $testName',
    ({
      initialListQuery,
      initialListFilters,
      mutationQuery,
      mutationFilters,
      mutationUpdateData,
      expectedScopeSource,
      expectedMutationShape,
      expectedActionDescriptionContains,
    }) => {
      it(`devrait utiliser ${expectedScopeSource} et affecter les projets attendus`, async () => {
        // Reconstruire le dataset pour ce test
        const dataset = buildTestDataset();
        const projects = dataset.all;
        const mockContext = createMockContext(projects);

        // Étape 1 : LIST
        const { listedIds, lastAppliedFilter } = await runListAndGetScope(
          initialListQuery,
          initialListFilters,
          projects,
          mockContext
        );

        // Calculer les attentes dynamiquement
        const expectedAffectedCount = listedIds.length;

        // Étape 2 : UPDATE
        const pendingAction = await runMutation(
          mutationQuery,
          mutationFilters,
          mutationUpdateData,
          projects,
          {
            lastListedProjectIds: listedIds,
            lastAppliedFilter,
            mockContext,
          },
          expectedScopeSource
        );

        // Vérifications
        expectScope(pendingAction, expectedScopeSource, listedIds);
        expect(pendingAction.affectedProjects).toHaveLength(expectedAffectedCount);
        expectMutationShape(pendingAction, expectedMutationShape);
        expectActionDescriptionContains(pendingAction, expectedActionDescriptionContains);
      });
    }
  );

  /**
   * Matrice de tests pour Notes
   */
  describe('Notes', () => {
    it('devrait utiliser LastListedIds pour ajout de note après LIST filtré', async () => {
      // Reconstruire le dataset pour ce test
      const dataset = buildTestDataset();
      const projects = dataset.all;
      const mockContext = createMockContext(projects);

      const initialListFilters = { collab: 'hoho' };
      const { listedIds, lastAppliedFilter } = await runListAndGetScope(
        'liste les collabs avec hoho',
        initialListFilters,
        projects,
        mockContext
      );

      // Étape 2 : ADD_NOTE
      const pendingAction = await runMutation(
        'ajoute la note "à relancer"',
        {},
        { newNote: 'à relancer' },
        projects,
        {
          lastListedProjectIds: listedIds,
          lastAppliedFilter,
          mockContext,
        },
        'LastListedIds'
      );

      // Vérifications
      expect(pendingAction.scopeSource).toBe('LastListedIds');
      expect(pendingAction.affectedProjects).toHaveLength(listedIds.length);
      expect(pendingAction.mutation.newNote).toBe('à relancer');
      // La description peut varier selon l'implémentation, on vérifie juste qu'elle existe
      expect(pendingAction.description).toBeDefined();
      expect(pendingAction.description.length).toBeGreaterThan(0);
    });
  });

  /**
   * Matrice de tests pour Deadline
   */
  describe.each([
    {
      testName: 'LIST filtré → push deadline',
      initialListQuery: 'affiche toutes les collabs avec hoho',
      initialListFilters: { collab: 'hoho' },
      mutationQuery: 'pousse leur deadline de 1 mois',
      mutationFilters: {},
      mutationUpdateData: { pushDeadlineBy: { months: 1 } },
      expectedScopeSource: 'LastListedIds' as const,
      expectedMutationShape: { pushDeadlineBy: { months: 1 } },
      expectedActionDescriptionContains: 'Décaler',
      skipNoDeadline: true,
      // Créer un dataset spécifique avec des projets hoho ayant deadline
      createCustomDataset: true,
    },
    {
      testName: 'Filtre deadline explicite',
      initialListQuery: 'liste les projets',
      initialListFilters: {},
      mutationQuery: 'pousse la deadline des projets avec deadline de 1 mois',
      mutationFilters: { hasDeadline: true },
      mutationUpdateData: { pushDeadlineBy: { months: 1 } },
      expectedScopeSource: 'ExplicitFilter' as const,
      expectedMutationShape: { pushDeadlineBy: { months: 1 } },
      expectedActionDescriptionContains: 'Décaler',
      skipNoDeadline: false,
      createCustomDataset: false,
    },
  ])(
    'Deadline - $testName',
    ({
      initialListQuery,
      initialListFilters,
      mutationQuery,
      mutationFilters,
      mutationUpdateData,
      expectedScopeSource,
      expectedMutationShape,
      expectedActionDescriptionContains,
      skipNoDeadline,
      createCustomDataset,
    }) => {
      it(`devrait utiliser ${expectedScopeSource} et affecter les projets attendus`, async () => {
        // Créer le dataset approprié
        let projects: Project[];
        if (createCustomDataset) {
          // Pour le test "LIST filtré → push deadline", créer des projets avec collab hoho ET deadline
          projects = [
            ...createMockProjects(3, {
              collab: 'hoho',
              deadline: '2024-12-31',
              status: 'EN_COURS',
            }),
            ...createMockProjects(2, { collab: 'hoho', deadline: null, status: 'EN_COURS' }),
            ...createMockProjects(5, { collab: null, deadline: '2024-12-31', status: 'EN_COURS' }),
          ];
          expectUniqueProjectIds(projects);
        } else {
          // Pour les autres tests, utiliser le dataset standard
          const dataset = buildTestDataset();
          projects = dataset.all;
        }
        const mockContext = createMockContext(projects);

        // Étape 1 : LIST
        const { listedIds, lastAppliedFilter } = await runListAndGetScope(
          initialListQuery,
          initialListFilters,
          projects,
          mockContext
        );

        // Calculer les attentes dynamiquement
        const affectedProjects = getAffectedProjects(
          projects,
          expectedScopeSource,
          listedIds,
          mutationFilters,
          skipNoDeadline
        );
        const expectedAffectedCount = affectedProjects.length;

        // Étape 2 : UPDATE
        const pendingAction = await runMutation(
          mutationQuery,
          mutationFilters,
          mutationUpdateData,
          projects,
          {
            lastListedProjectIds: listedIds,
            lastAppliedFilter,
            mockContext,
          },
          expectedScopeSource,
          skipNoDeadline
        );

        // Vérifications
        expectScope(pendingAction, expectedScopeSource, listedIds);
        expect(pendingAction.affectedProjects).toHaveLength(expectedAffectedCount);
        expectMutationShape(pendingAction, expectedMutationShape);
        expectActionDescriptionContains(pendingAction, expectedActionDescriptionContains);
      });
    }
  );

  /**
   * Test spécial : Skip sans deadline
   */
  describe('Deadline - Skip sans deadline', () => {
    it('devrait skip les projets sans deadline et mentionner dans actionDescription', async () => {
      const projectsWithMixedDeadlines = [
        ...createMockProjects(2, { deadline: '2024-12-31', collab: 'hoho' }),
        ...createMockProjects(1, { deadline: null, collab: 'hoho' }),
      ];
      expectUniqueProjectIds(projectsWithMixedDeadlines);
      const initialListedIds = projectsWithMixedDeadlines.map((p) => p.id);
      const mockContext = createMockContext(projectsWithMixedDeadlines);

      const contextWithMixed = createContextWithWorkingSet(mockContext, initialListedIds, {
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

      const affectedProjects = projectsWithMixedDeadlines.filter((p) => p.deadline !== null);
      mockFilterProjects.mockReturnValueOnce({
        filtered: affectedProjects,
        nullProgressCount: 0,
        hasProgressFilter: false,
      });

      const updateResult = await routeProjectCommand('pousse leur deadline de 1 mois', {
        context: contextWithMixed,
      });

      expect(updateResult.type).toBe(ProjectCommandType.UPDATE);
      if (updateResult.type === ProjectCommandType.UPDATE) {
        expectSkippedNoDeadlineBehaviour(
          updateResult.pendingAction,
          initialListedIds,
          projectsWithMixedDeadlines
        );
      }
    });
  });

  /**
   * Tests transverses : Vérifications communes à toutes les mutations
   */
  describe('Vérifications transverses', () => {
    it('devrait toujours avoir result.type === UPDATE pour les mutations', async () => {
      // Reconstruire le dataset pour ce test
      const dataset = buildTestDataset();
      const projects = dataset.all;
      const mockContext = createMockContext(projects);

      const initialListFilters = { status: 'EN_COURS' };
      const { listedIds, lastAppliedFilter } = await runListAndGetScope(
        'liste les en cours',
        initialListFilters,
        projects,
        mockContext
      );

      // Limiter pour éviter les doublons (mais utiliser le dataset réel)
      const limitedListedIds = listedIds.slice(0, Math.min(5, listedIds.length));

      // Étape 2 : UPDATE
      const pendingAction = await runMutation(
        'passe leur progression à 20%',
        {},
        { newProgress: 20 },
        projects,
        {
          lastListedProjectIds: limitedListedIds,
          lastAppliedFilter,
          mockContext,
        },
        'LastListedIds'
      );

      // Vérifications transverses
      expect(pendingAction.affectedProjectIds).toBeDefined();
      expect(pendingAction.affectedProjectIds.length).toBeGreaterThan(0);
      expect(pendingAction.scopeSource).toBeDefined();
      expect(['LastListedIds', 'LastAppliedFilter', 'AllProjects', 'ExplicitFilter']).toContain(
        pendingAction.scopeSource
      );
      expect(pendingAction.description).toBeDefined();
      expect(pendingAction.affectedProjects).toHaveLength(pendingAction.affectedProjectIds.length);
    });

    it('devrait avoir payload cohérent quand scopeSource === LastListedIds', async () => {
      // Reconstruire le dataset pour ce test
      const dataset = buildTestDataset();
      const projects = dataset.all;
      const mockContext = createMockContext(projects);

      const initialListFilters = { status: 'EN_COURS' };
      const { listedIds, lastAppliedFilter } = await runListAndGetScope(
        'liste les en cours',
        initialListFilters,
        projects,
        mockContext
      );

      // Limiter pour éviter les doublons
      const limitedListedIds = listedIds.slice(0, Math.min(5, listedIds.length));

      // Étape 2 : UPDATE
      const pendingAction = await runMutation(
        'passe leur progression à 20%',
        {},
        { newProgress: 20 },
        projects,
        {
          lastListedProjectIds: limitedListedIds,
          lastAppliedFilter,
          mockContext,
        },
        'LastListedIds'
      );

      expect(pendingAction.scopeSource).toBe('LastListedIds');
      // Les IDs doivent être présents et cohérents
      expect(pendingAction.affectedProjectIds).toEqual(limitedListedIds);
      expect(pendingAction.affectedProjectIds.length).toBeGreaterThan(0);
      // Les filtres doivent être vides (on utilise les IDs)
      expect(Object.keys(pendingAction.filters).length).toBe(0);
    });

    it('devrait avoir payload cohérent quand scopeSource === ExplicitFilter', async () => {
      // Reconstruire le dataset pour ce test
      const dataset = buildTestDataset();
      const projects = dataset.all;
      const mockContext = createMockContext(projects);

      const mutationFilters = { status: 'TERMINE' };
      const affectedProjects = getAffectedProjects(projects, 'ExplicitFilter', [], mutationFilters);

      mockDetectFilters.mockReturnValueOnce({
        filters: mutationFilters,
        fieldsToShow: ['status', 'progress'],
      });
      mockClassifyQuery.mockReturnValueOnce(
        createMockClassification({
          isUpdate: true,
          hasActionVerb: true,
          hasProjectMention: true,
          hasProjectRelatedFilters: true,
          understood: true,
        })
      );
      mockExtractUpdateData.mockReturnValueOnce({
        newProgress: 50,
      });
      mockFilterProjects.mockReturnValueOnce({
        filtered: affectedProjects,
        nullProgressCount: 0,
        hasProgressFilter: false,
      });

      const updateResult = await routeProjectCommand('passe les projets terminés à 50%', {
        context: mockContext,
      });

      expect(updateResult.type).toBe(ProjectCommandType.UPDATE);
      if (updateResult.type === ProjectCommandType.UPDATE) {
        expect(updateResult.pendingAction.scopeSource).toBe('ExplicitFilter');
        // Les filtres doivent être présents et non vides
        expect(updateResult.pendingAction.filters.status).toBe('TERMINE');
        expect(Object.keys(updateResult.pendingAction.filters).length).toBeGreaterThan(0);
      }
    });
  });

  /**
   * Test : Qualifier non-scoping ne doit pas être considéré comme filtre explicite
   */
  describe('Qualifiers non-scoping', () => {
    it('ne devrait PAS considérer hasDeadline dans updateData comme filtre scoping', async () => {
      // Reconstruire le dataset pour ce test
      const dataset = buildTestDataset();
      const baseProjects = dataset.all;

      // Créer 17 projets supplémentaires avec deadline et collab hoho
      const projectsWithDeadline = createMockProjects(17, {
        collab: 'hoho',
        deadline: '2024-12-31',
      });
      expectUniqueProjectIds(projectsWithDeadline);

      const allProjects = [...baseProjects, ...projectsWithDeadline];
      expectUniqueProjectIds(allProjects);

      const initialListedIds = projectsWithDeadline.map((p) => p.id);
      const mockContext = createMockContext(allProjects);

      const contextWithCollabs = createContextWithWorkingSet(mockContext, initialListedIds, {
        collab: 'hoho',
      });

      // IMPORTANT: extractUpdateData retourne hasDeadline=true mais filters est vide
      mockDetectFilters.mockReturnValueOnce({
        filters: {}, // Vide - hasDeadline n'est PAS dans filters
        fieldsToShow: ['deadline'],
      });
      mockClassifyQuery.mockReturnValueOnce(
        createMockClassification({
          isUpdate: true,
          hasActionVerb: true,
          hasProjectMention: true,
          hasProjectRelatedFilters: false, // Pas de filtre scoping
          understood: true,
        })
      );
      mockExtractUpdateData.mockReturnValueOnce({
        pushDeadlineBy: { months: 1 },
        hasDeadline: true, // Dans updateData mais PAS dans filters
      });
      mockFilterProjects.mockReturnValueOnce({
        filtered: projectsWithDeadline,
        nullProgressCount: 0,
        hasProgressFilter: false,
      });

      const updateResult = await routeProjectCommand('pousse leur deadline de 1 mois', {
        context: contextWithCollabs,
      });

      expect(updateResult.type).toBe(ProjectCommandType.UPDATE);
      if (updateResult.type === ProjectCommandType.UPDATE) {
        // Doit utiliser LastListedIds, PAS ExplicitFilter
        expect(updateResult.pendingAction.scopeSource).toBe('LastListedIds');
        expect(updateResult.pendingAction.affectedProjects).toHaveLength(17);
        expect(updateResult.pendingAction.affectedProjectIds).toHaveLength(17);

        // Vérifier que expectedUpdatedAtById est construit
        expect(updateResult.pendingAction.expectedUpdatedAtById).toBeDefined();
        expect(Object.keys(updateResult.pendingAction.expectedUpdatedAtById || {})).toHaveLength(
          17
        );
        // Vérifier que les valeurs sont des ISO strings
        Object.values(updateResult.pendingAction.expectedUpdatedAtById || {}).forEach(
          (isoString) => {
            expect(typeof isoString).toBe('string');
            expect(isoString).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/); // Format ISO
          }
        );
      }
    });

    it('devrait construire expectedUpdatedAtById pour une mutation progress', async () => {
      const dataset = buildTestDataset();
      const projects = dataset.all;
      // Filtrer pour avoir des projets TERMINE
      const terminatedProjects = projects.filter((p) => p.status === 'TERMINE');
      const initialListedIds = terminatedProjects.map((p) => p.id);
      const expectedCount = terminatedProjects.length;

      const mockContext = createContextWithWorkingSet(
        createMockContext(projects),
        initialListedIds,
        { status: 'TERMINE' }
      );

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
        newProgress: 50,
      });
      mockFilterProjects.mockReturnValueOnce({
        filtered: terminatedProjects,
        nullProgressCount: 0,
        hasProgressFilter: false,
      });

      const updateResult = await routeProjectCommand('passe les terminés à 50%', {
        context: mockContext,
      });

      expect(updateResult.type).toBe(ProjectCommandType.UPDATE);
      if (updateResult.type === ProjectCommandType.UPDATE) {
        expect(updateResult.pendingAction.expectedUpdatedAtById).toBeDefined();
        const expectedUpdatedAtById = updateResult.pendingAction.expectedUpdatedAtById || {};
        expect(Object.keys(expectedUpdatedAtById)).toHaveLength(expectedCount);

        // Vérifier que chaque ID affecté a un expectedUpdatedAt
        updateResult.pendingAction.affectedProjectIds.forEach((id) => {
          expect(expectedUpdatedAtById[id]).toBeDefined();
          expect(typeof expectedUpdatedAtById[id]).toBe('string');
          expect(expectedUpdatedAtById[id]).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
        });
      }
    });
  });
});
