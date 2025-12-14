/**
 * Tests de séquence : LIST → "en détail"
 *
 * Valide que "en détail" après un LIST reliste le même scope en mode détaillé
 * et n'appelle JAMAIS Groq (anti-hallucination)
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
  createTestProject,
} from './test-project-factory';

import { detectFilters } from '../../query-parser/filters';
import { classifyQuery } from '../../query-parser/classifier';
import { filterProjects } from '@/components/assistant/utils/filterProjects';

const mockDetectFilters = detectFilters as jest.MockedFunction<typeof detectFilters>;
const mockClassifyQuery = classifyQuery as jest.MockedFunction<typeof classifyQuery>;
const mockFilterProjects = filterProjects as jest.MockedFunction<typeof filterProjects>;

// Mock fetch pour les appels à l'API Groq (pour vérifier qu'il n'est JAMAIS appelé)
const mockFetch = jest.fn();
global.fetch = mockFetch as any;

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
    isConversationalQuestion: false,
    isCount: false,
    ...overrides,
  };
}

describe('Router - LIST → "en détail" (anti-hallucination)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetTestProjectFactory();
    mockFetch.mockClear();
    // Par défaut, mock fetch pour retourner une réponse valide (si jamais appelé)
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ text: 'Réponse de fallback Groq' }),
    });
  });

  describe('Cas 1: LIST filtré → "en détail" avec LastListedIds', () => {
    it('devrait relister EXACTEMENT le même scope en mode détaillé (LastListedIds prioritaire)', async () => {
      // Créer un dataset avec 2 statuts (EN_COURS, TERMINE)
      const enCoursProjects: Project[] = [];
      const termineProjects: Project[] = [];

      for (let i = 0; i < 5; i++) {
        enCoursProjects.push(
          createTestProject({
            status: 'EN_COURS',
            progress: 50,
            collab: 'hoho',
            style: 'Techno',
            label: 'Label1',
          })
        );
      }

      for (let i = 0; i < 3; i++) {
        termineProjects.push(
          createTestProject({
            status: 'TERMINE',
            progress: 100,
            collab: 'Collab1',
            style: 'House',
            label: 'Label2',
          })
        );
      }

      const allProjects = [...enCoursProjects, ...termineProjects];
      expectUniqueProjectIds(allProjects);

      // Step 1: LIST "liste les en cours"
      const listedIds = enCoursProjects.map((p) => p.id);
      const mockContextStep1 = createContextWithWorkingSet(
        createMockContext(allProjects),
        [], // Pas de working set initial
        {}
      );

      mockDetectFilters.mockReturnValueOnce({
        filters: { status: 'EN_COURS' },
        fieldsToShow: ['progress', 'status'],
      });
      mockClassifyQuery.mockReturnValueOnce(
        createMockClassification({
          isList: true,
          understood: true,
        })
      );
      mockFilterProjects.mockReturnValueOnce({
        filtered: enCoursProjects,
        nullProgressCount: 0,
        hasProgressFilter: false,
      });

      const listResult = await routeProjectCommand('liste les en cours', {
        context: mockContextStep1,
      });

      expect(listResult.type).toBe(ProjectCommandType.LIST);
      if (listResult.type === ProjectCommandType.LIST) {
        expect(listResult.projects).toHaveLength(5);
        expect(listResult.listedProjectIds).toEqual(listedIds);
      }

      // Step 2: COMMAND "en détail" avec context contenant lastListedProjectIds
      const mockContextStep2 = createContextWithWorkingSet(
        createMockContext(allProjects),
        listedIds, // LastListedIds du step 1
        {
          status: 'EN_COURS', // LastAppliedFilter du step 1
        }
      );

      // "en détail" ne doit PAS être classifié comme LIST (c'est un intent spécial)
      // Il sera intercepté par le guard avant la classification
      mockDetectFilters.mockReturnValueOnce({
        filters: {},
        fieldsToShow: [],
      });
      // La classification peut être conversationnelle, mais le guard doit intercepter AVANT Groq
      mockClassifyQuery.mockReturnValueOnce(
        createMockClassification({
          isConversationalQuestion: true, // Simule le bug actuel
          hasActionVerb: false,
          understood: true,
        })
      );

      const detailResult = await routeProjectCommand('en détail', {
        context: mockContextStep2,
      });

      // Assertions critiques
      expect(detailResult.type).toBe(ProjectCommandType.LIST);
      expect(mockFetch).not.toHaveBeenCalled(); // Anti-hallucination : pas d'appel Groq

      if (detailResult.type === ProjectCommandType.LIST) {
        // Même scope (mêmes IDs, même ordre si stable)
        expect(detailResult.listedProjectIds).toEqual(listedIds);
        expect(detailResult.projects).toHaveLength(5);
        expect(detailResult.projects.map((p) => p.id)).toEqual(listedIds);

        // Mode détaillé activé
        expect(detailResult.displayMode).toBe('detailed');
        expect(detailResult.fieldsToShow).toContain('status');
        expect(detailResult.fieldsToShow).toContain('progress');
        expect(detailResult.fieldsToShow).toContain('collab');
        expect(detailResult.fieldsToShow).toContain('style');
        expect(detailResult.fieldsToShow).toContain('label');
        expect(detailResult.fieldsToShow.length).toBeGreaterThan(3); // Plus que compact
      }
    });
  });

  describe('Cas 2: "en détail" avec LastAppliedFilter (fallback)', () => {
    it('devrait utiliser LastAppliedFilter si pas de LastListedIds', async () => {
      const dataset = createProjectsDataset();
      const projects = dataset.all;
      expectUniqueProjectIds(projects);

      // Pas de lastListedProjectIds mais lastAppliedFilter présent
      const enCoursProjects = projects.filter((p) => p.status === 'EN_COURS');
      const mockContext = createContextWithWorkingSet(
        createMockContext(projects),
        [], // Pas de LastListedIds
        {
          status: 'EN_COURS', // Mais LastAppliedFilter présent
        }
      );

      mockDetectFilters.mockReturnValueOnce({
        filters: {},
        fieldsToShow: [],
      });
      mockClassifyQuery.mockReturnValueOnce(
        createMockClassification({
          isConversationalQuestion: true,
          hasActionVerb: false,
        })
      );
      mockFilterProjects.mockReturnValueOnce({
        filtered: enCoursProjects,
        nullProgressCount: 0,
        hasProgressFilter: false,
      });

      const detailResult = await routeProjectCommand('en détail', {
        context: mockContext,
      });

      expect(detailResult.type).toBe(ProjectCommandType.LIST);
      expect(mockFetch).not.toHaveBeenCalled(); // Anti-hallucination

      if (detailResult.type === ProjectCommandType.LIST) {
        expect(detailResult.projects.length).toBe(enCoursProjects.length);
        expect(detailResult.displayMode).toBe('detailed');
        expect(detailResult.fieldsToShow.length).toBeGreaterThan(3);
      }
    });
  });

  describe('Cas 3: "en détail" sans scope (demande clarification)', () => {
    it('devrait retourner un message de clarification (pas Groq)', async () => {
      const dataset = createProjectsDataset();
      const projects = dataset.all;

      // Ni lastListedProjectIds ni lastAppliedFilter
      const mockContext = createMockContext(projects);
      // Pas de working set

      mockDetectFilters.mockReturnValueOnce({
        filters: {},
        fieldsToShow: [],
      });
      mockClassifyQuery.mockReturnValueOnce(
        createMockClassification({
          isConversationalQuestion: true,
          hasActionVerb: false,
        })
      );

      const detailResult = await routeProjectCommand('en détail', {
        context: mockContext,
      });

      // Doit retourner GENERAL avec message de clarification, PAS appeler Groq
      expect(detailResult.type).toBe(ProjectCommandType.GENERAL);
      expect(mockFetch).not.toHaveBeenCalled(); // Anti-hallucination

      if (detailResult.type === ProjectCommandType.GENERAL) {
        expect(detailResult.response).toContain('scope récent');
        expect(detailResult.response).toContain('lister');
      }
    });
  });

  describe('Variantes de "en détail"', () => {
    it('devrait détecter toutes les variantes de "en détail"', async () => {
      const dataset = createProjectsDataset();
      const projects = dataset.all;
      const listedIds = projects.slice(0, 3).map((p) => p.id);

      const variants = [
        'en détail',
        'en details',
        'détails',
        'detail',
        'plus de détails',
        'affiche en détail',
        'affiche le détail',
      ];

      for (const variant of variants) {
        jest.clearAllMocks();

        const mockContext = createContextWithWorkingSet(createMockContext(projects), listedIds, {});

        mockDetectFilters.mockReturnValueOnce({
          filters: {},
          fieldsToShow: [],
        });
        mockClassifyQuery.mockReturnValueOnce(
          createMockClassification({
            isConversationalQuestion: true,
            hasActionVerb: false,
          })
        );

        const result = await routeProjectCommand(variant, {
          context: mockContext,
        });

        expect(result.type).toBe(ProjectCommandType.LIST);
        expect(mockFetch).not.toHaveBeenCalled(); // Anti-hallucination

        if (result.type === ProjectCommandType.LIST) {
          expect(result.displayMode).toBe('detailed');
        }
      }
    });
  });
});
