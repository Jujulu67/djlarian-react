/**
 * Tests pour les garde-fous du routeur
 *
 * Objectif : Vérifier que le routeur gère correctement les cas edge
 * comme LastListedIds avec un tableau vide.
 */

import { routeProjectCommand } from '../router';
import { ProjectCommandType } from '../types';
import type { Project } from '@/components/projects/types';

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

import { classifyQuery } from '../../query-parser/classifier';
import { detectFilters } from '../../query-parser/filters';
import { extractUpdateData } from '../../query-parser/updates';
import { filterProjects } from '@/components/assistant/utils/filterProjects';

const mockClassifyQuery = classifyQuery as jest.MockedFunction<typeof classifyQuery>;
const mockDetectFilters = detectFilters as jest.MockedFunction<typeof detectFilters>;
const mockExtractUpdateData = extractUpdateData as jest.MockedFunction<typeof extractUpdateData>;
const mockFilterProjects = filterProjects as jest.MockedFunction<typeof filterProjects>;

describe('Router - Garde-fous', () => {
  const mockProjects: Project[] = [
    {
      id: '1',
      name: 'Projet 1',
      status: 'EN_COURS',
      progress: 50,
      collab: null,
      style: null,
      deadline: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      order: 0,
      userId: 'user1',
      label: null,
      labelFinal: null,
      releaseDate: null,
      externalLink: null,
      streamsJ7: null,
      streamsJ14: null,
      streamsJ21: null,
      streamsJ28: null,
      streamsJ56: null,
      streamsJ84: null,
      streamsJ180: null,
      streamsJ365: null,
      note: null,
    },
    {
      id: '2',
      name: 'Projet 2',
      status: 'TERMINE',
      progress: 100,
      collab: null,
      style: null,
      deadline: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      order: 0,
      userId: 'user1',
      label: null,
      labelFinal: null,
      releaseDate: null,
      externalLink: null,
      streamsJ7: null,
      streamsJ14: null,
      streamsJ21: null,
      streamsJ28: null,
      streamsJ56: null,
      streamsJ84: null,
      streamsJ180: null,
      streamsJ365: null,
      note: null,
    },
  ];

  const mockContext = {
    projects: mockProjects,
    availableCollabs: [],
    availableStyles: [],
    projectCount: mockProjects.length,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Garde-fou: LastListedIds avec tableau vide', () => {
    it('devrait demander confirmation si lastListedProjectIds est vide', async () => {
      mockDetectFilters.mockReturnValue({
        filters: {},
        fieldsToShow: ['progress'],
      });
      mockClassifyQuery.mockReturnValue({
        isList: false,
        isCount: false,
        isUpdate: true,
        isCreate: false,
        isConversationalQuestion: false,
        hasActionVerb: true,
        hasProjectMention: true,
        isProjectInNonMusicalContext: false,
        hasProjectRelatedFilters: false,
        isActionVerbButNotProjectRelated: false,
        isQuestionAboutAssistantProjects: false,
        understood: true,
        isComplex: false,
        isDetailsViewRequested: false,
        isAllProjectsRequested: false,
        lang: 'fr' as const,
      });
      mockExtractUpdateData.mockReturnValue({
        newProgress: 20,
      });
      mockFilterProjects.mockReturnValue({
        filtered: mockProjects,
        nullProgressCount: 0,
        hasProgressFilter: false,
      });

      // Contexte avec lastListedProjectIds vide (tableau vide)
      const contextWithEmptyIds = {
        ...mockContext,
        lastListedProjectIds: [], // Tableau vide
      };

      const result = await routeProjectCommand('passe leur progression à 20%', {
        context: contextWithEmptyIds,
      });

      // Le routeur devrait demander confirmation avec le type dédié
      expect(result.type).toBe(ProjectCommandType.GENERAL);
      if (result.type === ProjectCommandType.GENERAL && 'confirmationType' in result) {
        expect(result.confirmationType).toBe('scope_missing');
        expect(result.response).toContain(
          'Tu veux appliquer cette modification à tous les projets'
        );
        expect(result.response).toContain('progression');
        expect(result.proposedMutation).toBeDefined();
        expect(result.proposedMutation.newProgress).toBe(20);
        expect(result.totalProjectsCount).toBe(mockProjects.length);
      }
    });

    it('devrait demander confirmation si lastListedProjectIds est undefined', async () => {
      mockDetectFilters.mockReturnValue({
        filters: {},
        fieldsToShow: ['progress'],
      });
      mockClassifyQuery.mockReturnValue({
        isList: false,
        isCount: false,
        isUpdate: true,
        isCreate: false,
        isConversationalQuestion: false,
        hasActionVerb: true,
        hasProjectMention: true,
        isProjectInNonMusicalContext: false,
        hasProjectRelatedFilters: false,
        isActionVerbButNotProjectRelated: false,
        isQuestionAboutAssistantProjects: false,
        understood: true,
        isComplex: false,
        isDetailsViewRequested: false,
        isAllProjectsRequested: false,
        lang: 'fr' as const,
      });
      mockExtractUpdateData.mockReturnValue({
        newProgress: 20,
      });
      mockFilterProjects.mockReturnValue({
        filtered: mockProjects,
        nullProgressCount: 0,
        hasProgressFilter: false,
      });

      // Contexte sans lastListedProjectIds (undefined)
      const contextWithoutIds = {
        ...mockContext,
        // lastListedProjectIds n'est pas défini
      };

      const result = await routeProjectCommand('passe leur progression à 20%', {
        context: contextWithoutIds,
      });

      // Le routeur devrait demander confirmation avec le type dédié
      expect(result.type).toBe(ProjectCommandType.GENERAL);
      if (result.type === ProjectCommandType.GENERAL && 'confirmationType' in result) {
        expect(result.confirmationType).toBe('scope_missing');
        expect(result.response).toContain(
          'Tu veux appliquer cette modification à tous les projets'
        );
        expect(result.response).toContain('progression');
        expect(result.proposedMutation).toBeDefined();
        expect(result.proposedMutation.newProgress).toBe(20);
        expect(result.totalProjectsCount).toBe(mockProjects.length);
      }
    });

    it('devrait demander confirmation même si aucun projet dans la base', async () => {
      mockDetectFilters.mockReturnValue({
        filters: {},
        fieldsToShow: ['progress'],
      });
      mockClassifyQuery.mockReturnValue({
        isList: false,
        isCount: false,
        isUpdate: true,
        isCreate: false,
        isConversationalQuestion: false,
        hasActionVerb: true,
        hasProjectMention: true,
        isProjectInNonMusicalContext: false,
        hasProjectRelatedFilters: false,
        isActionVerbButNotProjectRelated: false,
        isQuestionAboutAssistantProjects: false,
        understood: true,
        isComplex: false,
        isDetailsViewRequested: false,
        isAllProjectsRequested: false,
        lang: 'fr' as const,
      });
      mockExtractUpdateData.mockReturnValue({
        newProgress: 20,
      });
      mockFilterProjects.mockReturnValue({
        filtered: [], // Aucun projet trouvé
        nullProgressCount: 0,
        hasProgressFilter: false,
      });

      // Contexte avec lastListedProjectIds vide et aucun projet dans la base
      const contextWithEmptyProjects = {
        ...mockContext,
        projects: [], // Aucun projet
        projectCount: 0,
        lastListedProjectIds: [],
      };

      const result = await routeProjectCommand('passe leur progression à 20%', {
        context: contextWithEmptyProjects,
      });

      // Le routeur devrait demander confirmation (même avec 0 projets)
      expect(result.type).toBe(ProjectCommandType.GENERAL);
      if (result.type === ProjectCommandType.GENERAL) {
        expect(result.response).toContain(
          'Tu veux appliquer cette modification à tous les projets'
        );
        expect(result.response).toContain('progression');
      }
    });
  });
});
