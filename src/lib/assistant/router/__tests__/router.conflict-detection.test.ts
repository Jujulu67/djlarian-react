/**
 * Tests pour la détection de conflits dans les actions bulk
 *
 * Objectif : Vérifier que les conflits ne sont pas détectés à tort
 * quand les projets n'ont pas réellement changé
 */

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
import { ProjectCommandType } from '../types';
import type { Project } from '@/lib/domain/projects';

import { classifyQuery } from '../../query-parser/classifier';
import { detectFilters } from '../../query-parser/filters';
import { extractUpdateData } from '../../query-parser/updates';
import { filterProjects } from '@/lib/domain/projects';
import { resetTestProjectFactory, createTestProject } from './test-project-factory';

const mockClassifyQuery = classifyQuery as jest.MockedFunction<typeof classifyQuery>;
const mockDetectFilters = detectFilters as jest.MockedFunction<typeof detectFilters>;
const mockExtractUpdateData = extractUpdateData as jest.MockedFunction<typeof extractUpdateData>;
const mockFilterProjects = filterProjects as jest.MockedFunction<typeof filterProjects>;

function createMockClassification(overrides: Partial<ReturnType<typeof classifyQuery>> = {}) {
  return {
    isMetaQuestion: false,
    isUpdate: true,
    isCreate: false,
    isCount: false,
    isList: false,
    lang: 'fr' as const,
    hasActionVerb: true,
    hasProjectMention: false,
    isProjectInNonMusicalContext: false,
    hasProjectRelatedFilters: false,
    isActionVerbButNotProjectRelated: false,
    isQuestionAboutAssistantProjects: false,
    isConversationalQuestion: false,
    understood: true,
    isComplex: false,
    isDetailsViewRequested: false,
    isAllProjectsRequested: false,
    ...overrides,
  };
}

describe('Router - Détection de conflits (faux positifs)', () => {
  beforeEach(() => {
    resetTestProjectFactory();
    jest.clearAllMocks();
  });

  it('devrait construire expectedUpdatedAtById correctement pour 29 projets avec caractères spéciaux', async () => {
    // Créer 29 projets avec des noms contenant des caractères spéciaux
    const projects: Project[] = [
      createTestProject({
        name: 'Insomnia',
        progress: 30,
        status: 'EN_COURS',
        deadline: '2026-02-13',
      }),
      createTestProject({
        name: 'Fall Again',
        progress: 30,
        status: 'EN_COURS',
        deadline: '2026-02-13',
      }),
      createTestProject({
        name: "All Or Nothin'",
        progress: 30,
        status: 'EN_COURS',
        deadline: '2026-02-13',
      }),
      createTestProject({
        name: "I'll Be There",
        progress: 30,
        status: 'EN_COURS',
        deadline: '2026-02-13',
      }),
      createTestProject({
        name: 'Come On And Run',
        progress: 30,
        status: 'EN_COURS',
        deadline: '2026-02-13',
      }),
      createTestProject({
        name: 'Dnb Kulture',
        progress: 30,
        status: 'EN_COURS',
        deadline: '2026-02-13',
      }),
      createTestProject({
        name: 'Arcando',
        progress: 30,
        status: 'EN_COURS',
        deadline: '2026-02-13',
      }),
      createTestProject({
        name: 'Old School Chords',
        progress: 30,
        status: 'EN_COURS',
        deadline: '2026-02-13',
      }),
      createTestProject({ name: 'Deep', progress: 30, status: 'EN_COURS', deadline: '2026-02-13' }),
      createTestProject({
        name: 'Bounce It',
        progress: 30,
        status: 'EN_COURS',
        deadline: '2026-02-13',
      }),
      createTestProject({
        name: 'Clayne Chords',
        progress: 30,
        status: 'EN_COURS',
        deadline: '2026-02-13',
      }),
      createTestProject({
        name: 'Swedish',
        progress: 30,
        status: 'EN_COURS',
        deadline: '2026-02-13',
      }),
      createTestProject({
        name: 'Funky',
        progress: 30,
        status: 'EN_COURS',
        deadline: '2026-02-13',
      }),
      createTestProject({
        name: 'Retrovicii',
        progress: 30,
        status: 'EN_COURS',
        deadline: '2026-02-13',
      }),
      createTestProject({
        name: 'Orexo Collab',
        progress: 30,
        status: 'EN_COURS',
        deadline: '2026-02-13',
      }),
      createTestProject({
        name: 'Remix Replay',
        progress: 30,
        status: 'EN_COURS',
        deadline: '2026-02-13',
      }),
      createTestProject({
        name: 'Jay Eskar',
        progress: 30,
        status: 'EN_COURS',
        deadline: '2026-02-13',
      }),
      createTestProject({
        name: 'Dirty Palm Espagnol',
        progress: 30,
        status: 'EN_COURS',
        deadline: '2026-02-13',
      }),
      createTestProject({
        name: 'Oxygen',
        progress: 30,
        status: 'EN_COURS',
        deadline: '2026-02-13',
      }),
      createTestProject({
        name: 'Test`',
        progress: 30,
        status: 'EN_COURS',
        deadline: '2026-02-13',
      }),
      createTestProject({
        name: 'Nouveau`',
        progress: 30,
        status: 'EN_COURS',
        deadline: '2026-02-13',
      }),
      createTestProject({
        name: 'Mon Projet`',
        progress: 30,
        status: 'EN_COURS',
        deadline: '2026-02-13',
      }),
      createTestProject({
        name: 'Test`',
        progress: 30,
        status: 'EN_COURS',
        deadline: '2026-02-13',
      }), // Doublon
      createTestProject({
        name: 'New Project`',
        progress: 30,
        status: 'EN_COURS',
        deadline: '2026-02-13',
      }),
      createTestProject({
        name: '? 🎵)',
        progress: 30,
        status: 'EN_COURS',
        deadline: '2026-02-13',
      }),
      createTestProject({ name: 'Pue', progress: 30, status: 'EN_COURS', deadline: '2026-02-13' }),
      createTestProject({ name: 'toto', progress: 30, status: 'EN_COURS', deadline: null }), // Pas de deadline
      createTestProject({ name: 'tata', progress: 30, status: 'EN_COURS', deadline: null }), // Pas de deadline
      createTestProject({ name: 'Tototo', progress: null, status: 'EN_COURS', deadline: null }), // Pas de progress ni deadline
    ];

    // S'assurer que tous les projets ont un updatedAt valide
    const now = new Date('2024-01-15T10:00:00Z');
    projects.forEach((p, index) => {
      // Simuler des updatedAt légèrement différents pour chaque projet
      const updatedAt = new Date(now.getTime() + index * 1000); // +1 seconde par projet
      p.updatedAt = updatedAt.toISOString();
    });

    const lastListedProjectIds = projects.map((p) => p.id);

    mockClassifyQuery.mockReturnValue(createMockClassification({ isUpdate: true }));
    mockDetectFilters.mockReturnValue({
      filters: {},
      fieldsToShow: [],
    });
    mockExtractUpdateData.mockReturnValue({
      newProgress: 40,
    });

    const context = {
      projects,
      availableCollabs: [],
      availableStyles: [],
      projectCount: projects.length,
      lastListedProjectIds,
      lastAppliedFilter: {},
    };

    const result = await routeProjectCommand('passe avancement à 40%', {
      context,
      conversationHistory: [],
      lastFilters: {},
    });

    expect(result.type).toBe(ProjectCommandType.UPDATE);
    if (result.type === ProjectCommandType.UPDATE) {
      expect(result.pendingAction.affectedProjects).toHaveLength(29);
      expect(result.pendingAction.affectedProjectIds).toHaveLength(29);

      // Vérifier que expectedUpdatedAtById est construit pour tous les projets
      expect(result.pendingAction.expectedUpdatedAtById).toBeDefined();
      const expectedUpdatedAtById = result.pendingAction.expectedUpdatedAtById || {};

      // Vérifier que tous les projets ont un expectedUpdatedAt
      expect(Object.keys(expectedUpdatedAtById)).toHaveLength(29);

      // Vérifier que les IDs correspondent
      lastListedProjectIds.forEach((id) => {
        expect(expectedUpdatedAtById[id]).toBeDefined();
        expect(typeof expectedUpdatedAtById[id]).toBe('string');
        // Vérifier le format ISO
        expect(expectedUpdatedAtById[id]).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      });

      // Vérifier que les updatedAt correspondent aux projets
      projects.forEach((project) => {
        if (expectedUpdatedAtById[project.id]) {
          const expectedTime = new Date(expectedUpdatedAtById[project.id]).getTime();
          const projectTime = new Date(project.updatedAt).getTime();
          // Les timestamps doivent correspondre (tolérance de 1 seconde pour les arrondis)
          expect(Math.abs(expectedTime - projectTime)).toBeLessThan(1000);
        }
      });
    }
  });

  it('devrait gérer les projets avec updatedAt null ou undefined', async () => {
    const projects: Project[] = [
      createTestProject({ name: 'Projet 1', progress: 30, status: 'EN_COURS' }),
      createTestProject({ name: 'Projet 2', progress: 30, status: 'EN_COURS' }),
    ];

    // Projet 1 avec updatedAt valide
    projects[0].updatedAt = new Date('2024-01-15T10:00:00Z').toISOString();
    // Projet 2 sans updatedAt (null)
    projects[1].updatedAt = null as any;

    const lastListedProjectIds = projects.map((p) => p.id);

    mockClassifyQuery.mockReturnValue(createMockClassification({ isUpdate: true }));
    mockDetectFilters.mockReturnValue({
      filters: {},
      fieldsToShow: [],
    });
    mockExtractUpdateData.mockReturnValue({
      newProgress: 40,
    });

    const context = {
      projects,
      availableCollabs: [],
      availableStyles: [],
      projectCount: projects.length,
      lastListedProjectIds,
      lastAppliedFilter: {},
    };

    const result = await routeProjectCommand('passe avancement à 40%', {
      context,
      conversationHistory: [],
      lastFilters: {},
    });

    expect(result.type).toBe(ProjectCommandType.UPDATE);
    if (result.type === ProjectCommandType.UPDATE) {
      // Le projet avec updatedAt null ne doit pas être dans expectedUpdatedAtById
      // (sera considéré comme conflit côté serveur, ce qui est le comportement attendu)
      const expectedUpdatedAtById = result.pendingAction.expectedUpdatedAtById || {};

      // Seul le projet avec updatedAt valide doit être dans le mapping
      expect(Object.keys(expectedUpdatedAtById)).toHaveLength(1);
      expect(expectedUpdatedAtById[projects[0].id]).toBeDefined();
      expect(expectedUpdatedAtById[projects[1].id]).toBeUndefined();
    }
  });
});
