/**
 * Tests unitaires pour le routeur de commandes projets
 *
 * Objectif : 100% de couverture sur cette partie
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
import { ProjectCommandType } from '../types';
import type { Project } from '@/components/projects/types';

import { classifyQuery } from '../../query-parser/classifier';
import { detectFilters } from '../../query-parser/filters';
import { extractUpdateData } from '../../query-parser/updates';
import { extractCreateData } from '../../query-parser/creates';
import { getConversationalResponse } from '../../conversational/groq-responder';
import { filterProjects } from '@/components/assistant/utils/filterProjects';

const mockClassifyQuery = classifyQuery as jest.MockedFunction<typeof classifyQuery>;
const mockDetectFilters = detectFilters as jest.MockedFunction<typeof detectFilters>;
const mockExtractUpdateData = extractUpdateData as jest.MockedFunction<typeof extractUpdateData>;
const mockExtractCreateData = extractCreateData as jest.MockedFunction<typeof extractCreateData>;
const mockGetConversationalResponse = getConversationalResponse as jest.MockedFunction<
  typeof getConversationalResponse
>;
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

describe('Router - Classification et Routing', () => {
  const mockProjects: Project[] = [
    {
      id: '1',
      name: 'Projet 1',
      status: 'EN_COURS',
      progress: 50,
      collab: 'Collab1',
      style: 'Techno',
      deadline: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      order: 0,
      userId: 'user1',
    },
    {
      id: '2',
      name: 'Projet 2',
      status: 'TERMINE',
      progress: 100,
      collab: null,
      style: 'House',
      deadline: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      order: 1,
      userId: 'user1',
    },
  ];

  const mockContext = {
    projects: mockProjects,
    availableCollabs: ['Collab1'],
    availableStyles: ['Techno', 'House'],
    projectCount: 2,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Listing sans filtre', () => {
    it('devrait router vers LIST et retourner tous les projets', async () => {
      mockDetectFilters.mockReturnValue({ filters: {}, fieldsToShow: [] });
      mockClassifyQuery.mockReturnValue({
        isList: true,
        isCount: false,
        isUpdate: false,
        isCreate: false,
        isConversationalQuestion: false,
        hasActionVerb: true,
        hasProjectMention: true,
        isProjectInNonMusicalContext: false,
        hasProjectRelatedFilters: true,
        isActionVerbButNotProjectRelated: false,
        isQuestionAboutAssistantProjects: false,
        understood: true,
        isComplex: false,
        isMetaQuestion: false,
        lang: 'fr',
        isDetailsViewRequested: false,
        isAllProjectsRequested: false,
      });
      mockFilterProjects.mockReturnValue({
        filtered: mockProjects,
        nullProgressCount: 0,
        hasProgressFilter: false,
      });

      const result = await routeProjectCommand('liste les projets', {
        context: mockContext,
      });

      expect(result.type).toBe(ProjectCommandType.LIST);
      if (result.type === ProjectCommandType.LIST) {
        expect(result.projects).toHaveLength(2);
        expect(result.count).toBe(2);
        expect(result.message).toContain('2 projet(s)');
        expect(result.appliedFilter).toBeDefined();
        expect(result.listedProjectIds).toHaveLength(2);
        expect(result.listedProjectIds).toEqual(['1', '2']);
      }
    });
  });

  describe('Listing avec filtre', () => {
    it('devrait router vers LIST avec filtres appliqués', async () => {
      const filteredProjects = [mockProjects[0]];
      mockDetectFilters.mockReturnValue({
        filters: { status: 'EN_COURS' },
        fieldsToShow: ['status', 'progress'],
      });
      mockClassifyQuery.mockReturnValue({
        isList: true,
        isCount: false,
        isUpdate: false,
        isCreate: false,
        isConversationalQuestion: false,
        hasActionVerb: true,
        hasProjectMention: true,
        isProjectInNonMusicalContext: false,
        hasProjectRelatedFilters: true,
        isActionVerbButNotProjectRelated: false,
        isQuestionAboutAssistantProjects: false,
        understood: true,
        isComplex: false,
        isMetaQuestion: false,
        lang: 'fr',
        isDetailsViewRequested: false,
        isAllProjectsRequested: false,
      });
      mockFilterProjects.mockReturnValue({
        filtered: filteredProjects,
        nullProgressCount: 0,
        hasProgressFilter: false,
      });

      const result = await routeProjectCommand('liste les projets en cours', {
        context: mockContext,
      });

      expect(result.type).toBe(ProjectCommandType.LIST);
      if (result.type === ProjectCommandType.LIST) {
        expect(result.projects).toHaveLength(1);
        expect(result.projects[0].status).toBe('EN_COURS');
        expect(result.fieldsToShow).toContain('status');
        expect(result.appliedFilter).toBeDefined();
        expect(result.appliedFilter.status).toBe('EN_COURS');
        expect(result.listedProjectIds).toHaveLength(1);
        expect(result.listedProjectIds[0]).toBe('1');
      }
    });
  });

  describe('Création', () => {
    it('devrait router vers CREATE avec les données extraites', async () => {
      mockDetectFilters.mockReturnValue({ filters: {}, fieldsToShow: [] });
      mockClassifyQuery.mockReturnValue(
        createMockClassification({
          isCreate: true,
          hasActionVerb: true,
          hasProjectMention: true,
          hasProjectRelatedFilters: true,
          understood: true,
        })
      );
      mockExtractCreateData.mockReturnValue({
        name: 'Nouveau Projet',
        status: 'EN_COURS',
        style: 'Techno',
      });

      const result = await routeProjectCommand('ajoute le projet Nouveau Projet', {
        context: mockContext,
      });

      expect(result.type).toBe(ProjectCommandType.CREATE);
      if (result.type === ProjectCommandType.CREATE) {
        expect(result.project.name).toBe('Nouveau Projet');
        expect(result.createData).toBeDefined();
        expect(result.createData?.name).toBe('Nouveau Projet');
      }
    });
  });

  describe('Modification via filtre', () => {
    it('devrait router vers UPDATE avec confirmation', async () => {
      const affectedProjects = [mockProjects[0]];
      mockDetectFilters.mockReturnValue({
        filters: { status: 'EN_COURS' },
        fieldsToShow: [],
      });
      mockClassifyQuery.mockReturnValue(
        createMockClassification({
          isUpdate: true,
          hasActionVerb: true,
          hasProjectMention: true,
          hasProjectRelatedFilters: true,
          understood: true,
        })
      );
      mockExtractUpdateData.mockReturnValue({
        newStatus: 'TERMINE',
      });
      mockFilterProjects.mockReturnValue({
        filtered: affectedProjects,
        nullProgressCount: 0,
        hasProgressFilter: false,
      });

      const result = await routeProjectCommand('marque les projets en cours comme terminés', {
        context: mockContext,
      });

      expect(result.type).toBe(ProjectCommandType.UPDATE);
      if (
        result.type === ProjectCommandType.UPDATE ||
        result.type === ProjectCommandType.ADD_NOTE
      ) {
        expect(result.pendingAction.affectedProjects).toHaveLength(1);
        expect(result.pendingAction.mutation.newStatus).toBe('TERMINE');
        expect(result.message).toContain('Confirmez-vous');
        expect(result.pendingAction.fieldsToShow).toBeDefined();
      }
    });
  });

  describe('Question généraliste', () => {
    it('devrait router vers Groq (lecture seule)', async () => {
      mockDetectFilters.mockReturnValue({ filters: {}, fieldsToShow: [] });
      mockClassifyQuery.mockReturnValue({
        isList: false,
        isCount: false,
        isUpdate: false,
        isCreate: false,
        isConversationalQuestion: true,
        hasActionVerb: false,
        hasProjectMention: false,
        isProjectInNonMusicalContext: false,
        hasProjectRelatedFilters: false,
        isActionVerbButNotProjectRelated: false,
        isQuestionAboutAssistantProjects: false,
        understood: false,
        isComplex: false,
        isMetaQuestion: false,
        lang: 'fr',
        isDetailsViewRequested: false,
        isAllProjectsRequested: false,
      });
      mockGetConversationalResponse.mockResolvedValue('Réponse de Groq');

      const result = await routeProjectCommand('Bonjour, comment vas-tu ?', {
        context: mockContext,
      });

      expect(result.type).toBe(ProjectCommandType.GENERAL);
      if (result.type === ProjectCommandType.GENERAL) {
        expect(result.response).toBe('Réponse de Groq');
      }

      // Vérifier que Groq n'a pas accès aux tools (pas d'appel à extractUpdateData, etc.)
      expect(mockExtractUpdateData).not.toHaveBeenCalled();
      expect(mockExtractCreateData).not.toHaveBeenCalled();
    });
  });

  describe('Garantie "Groq n\'exécute rien"', () => {
    it('ne devrait jamais appeler les extractors de mutation dans le chemin GeneralChat', async () => {
      mockDetectFilters.mockReturnValue({ filters: {}, fieldsToShow: [] });
      mockClassifyQuery.mockReturnValue({
        isList: false,
        isCount: false,
        isUpdate: false,
        isCreate: false,
        isConversationalQuestion: true,
        hasActionVerb: false,
        hasProjectMention: false,
        isProjectInNonMusicalContext: false,
        hasProjectRelatedFilters: false,
        isActionVerbButNotProjectRelated: false,
        isQuestionAboutAssistantProjects: false,
        understood: false,
        isComplex: false,
        isMetaQuestion: false,
        lang: 'fr',
        isDetailsViewRequested: false,
        isAllProjectsRequested: false,
      });
      mockGetConversationalResponse.mockResolvedValue('Réponse');

      await routeProjectCommand('Question générale', { context: mockContext });

      // Aucun extractor de mutation ne doit être appelé
      expect(mockExtractUpdateData).not.toHaveBeenCalled();
      expect(mockExtractCreateData).not.toHaveBeenCalled();
      expect(mockFilterProjects).not.toHaveBeenCalled();
    });
  });

  describe('Mémoire de travail (Working Set) - Tests réalistes', () => {
    describe('Bug reproduction: "liste les en cours" → "passe leur progression à 20%"', () => {
      it('devrait utiliser lastListedProjectIds quand "leur" est utilisé sans filtre explicite', async () => {
        // Étape 1 : LIST avec filtre "en cours" (phrase réelle)
        mockDetectFilters.mockReturnValue({
          filters: { status: 'EN_COURS' },
          fieldsToShow: ['status', 'progress'],
        });
        mockClassifyQuery.mockReturnValue({
          isList: true,
          isCount: false,
          isUpdate: false,
          isCreate: false,
          isConversationalQuestion: false,
          hasActionVerb: true,
          hasProjectMention: true,
          isProjectInNonMusicalContext: false,
          hasProjectRelatedFilters: true,
          isActionVerbButNotProjectRelated: false,
          isQuestionAboutAssistantProjects: false,
          understood: true,
          isComplex: false,
          isMetaQuestion: false,
          lang: 'fr',
        });
        const filteredProjects = [mockProjects[0]]; // Seulement le projet "EN_COURS"
        mockFilterProjects.mockReturnValue({
          filtered: filteredProjects,
          nullProgressCount: 0,
          hasProgressFilter: false,
        });

        const listResult = await routeProjectCommand('liste les en cours', {
          context: mockContext,
        });

        expect(listResult.type).toBe(ProjectCommandType.LIST);
        if (listResult.type === ProjectCommandType.LIST) {
          expect(listResult.projects).toHaveLength(1);
          expect(listResult.listedProjectIds).toEqual(['1']);
          expect(listResult.appliedFilter.status).toBe('EN_COURS');
        }

        // Étape 2 : UPDATE avec "leur" (phrase réelle) - doit retourner filtre VIDE
        // C'est le point clé : "leur" ne doit PAS créer un filtre
        mockDetectFilters.mockReturnValue({
          filters: {}, // IMPORTANT : filtre vide, pas de status
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
          hasProjectRelatedFilters: false, // Pas de filtre projet
          isActionVerbButNotProjectRelated: false,
          isQuestionAboutAssistantProjects: false,
          understood: true,
          isComplex: false,
          isMetaQuestion: false,
          lang: 'fr',
        });
        mockExtractUpdateData.mockReturnValue({
          newProgress: 20,
        });

        const contextWithWorkingSet = {
          ...mockContext,
          lastListedProjectIds: ['1'], // IDs du dernier listing
          lastAppliedFilter: { status: 'EN_COURS' },
        };

        const updateResult = await routeProjectCommand('passe leur progression à 20%', {
          context: contextWithWorkingSet,
        });

        expect(updateResult.type).toBe(ProjectCommandType.UPDATE);
        if (
          updateResult.type === ProjectCommandType.UPDATE ||
          updateResult.type === ProjectCommandType.ADD_NOTE
        ) {
          // Doit utiliser le working set, pas un filtre vide
          expect(updateResult.pendingAction.affectedProjects).toHaveLength(1);
          expect(updateResult.pendingAction.affectedProjects[0].id).toBe('1');
          expect(updateResult.pendingAction.affectedProjects[0].status).toBe('EN_COURS');
          expect(updateResult.pendingAction.mutation.newProgress).toBe(20);
        }
      });
    });

    describe('LIST en cours → UPDATE sans filtre', () => {
      it('devrait utiliser lastListedProjectIds pour UPDATE sans filtre explicite', async () => {
        // Étape 1 : LIST avec filtre "en cours"
        mockDetectFilters.mockReturnValue({
          filters: { status: 'EN_COURS' },
          fieldsToShow: ['status', 'progress'],
        });
        mockClassifyQuery.mockReturnValue({
          isList: true,
          isCount: false,
          isUpdate: false,
          isCreate: false,
          isConversationalQuestion: false,
          hasActionVerb: true,
          hasProjectMention: true,
          isProjectInNonMusicalContext: false,
          hasProjectRelatedFilters: true,
          isActionVerbButNotProjectRelated: false,
          isQuestionAboutAssistantProjects: false,
          understood: true,
          isComplex: false,
          isMetaQuestion: false,
          lang: 'fr',
        });
        const filteredProjects = [mockProjects[0]]; // Seulement le projet "EN_COURS"
        mockFilterProjects.mockReturnValue({
          filtered: filteredProjects,
          nullProgressCount: 0,
          hasProgressFilter: false,
        });

        const listResult = await routeProjectCommand('liste les projets en cours', {
          context: mockContext,
        });

        expect(listResult.type).toBe(ProjectCommandType.LIST);
        if (listResult.type === ProjectCommandType.LIST) {
          expect(listResult.projects).toHaveLength(1);
          expect(listResult.listedProjectIds).toEqual(['1']); // ID du projet EN_COURS
          expect(listResult.appliedFilter.status).toBe('EN_COURS');
        }

        // Étape 2 : UPDATE sans filtre explicite (doit utiliser le working set)
        mockDetectFilters.mockReturnValue({ filters: {}, fieldsToShow: [] });
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
          isMetaQuestion: false,
          lang: 'fr',
        });
        mockExtractUpdateData.mockReturnValue({
          newProgress: 20,
        });
        // Pas de filtre, donc filterProjects ne devrait pas être appelé pour calculer affectedProjects
        // (on utilise directement lastListedProjectIds)

        const contextWithWorkingSet = {
          ...mockContext,
          lastListedProjectIds: ['1'], // IDs du dernier listing
          lastAppliedFilter: { status: 'EN_COURS' },
        };

        const updateResult = await routeProjectCommand("mets l'avancement à 20%", {
          context: contextWithWorkingSet,
        });

        expect(updateResult.type).toBe(ProjectCommandType.UPDATE);
        if (
          updateResult.type === ProjectCommandType.UPDATE ||
          updateResult.type === ProjectCommandType.ADD_NOTE
        ) {
          expect(updateResult.pendingAction.affectedProjects).toHaveLength(1);
          expect(updateResult.pendingAction.affectedProjects[0].id).toBe('1');
          expect(updateResult.pendingAction.affectedProjects[0].status).toBe('EN_COURS');
          expect(updateResult.pendingAction.mutation.newProgress).toBe(20);
          // Vérifier les nouveaux champs
          expect(updateResult.pendingAction.affectedProjectIds).toEqual(['1']);
          expect(updateResult.pendingAction.scopeSource).toBe('LastListedIds');
        }
      });
    });

    describe('AffectedProjectIds et scopeSource dans PendingConfirmationAction', () => {
      it('devrait remplir affectedProjectIds et scopeSource quand scope = LastListedIds', async () => {
        mockDetectFilters.mockReturnValue({ filters: {}, fieldsToShow: ['progress', 'status'] });
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
        });
        mockExtractUpdateData.mockReturnValue({
          newProgress: 20,
        });

        const contextWithLastListedIds = {
          ...mockContext,
          lastListedProjectIds: ['1'],
        };

        mockFilterProjects.mockReturnValue({
          filtered: [mockProjects[0]],
          count: 1,
        });

        const result = await routeProjectCommand('passe leur progression à 20%', {
          context: contextWithLastListedIds,
        });

        expect(result.type).toBe(ProjectCommandType.UPDATE);
        if (result.type === ProjectCommandType.UPDATE) {
          expect(result.pendingAction.affectedProjectIds).toEqual(['1']);
          expect(result.pendingAction.scopeSource).toBe('LastListedIds');
          expect(result.pendingAction.affectedProjects.length).toBe(1);
          expect(result.pendingAction.affectedProjects[0].id).toBe('1');
        }
      });

      it('devrait remplir affectedProjectIds même quand scope = ExplicitFilter', async () => {
        mockDetectFilters.mockReturnValue({
          filters: { status: 'EN_COURS' },
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
          hasProjectRelatedFilters: true,
          isActionVerbButNotProjectRelated: false,
          isQuestionAboutAssistantProjects: false,
          understood: true,
          isComplex: false,
        });
        mockExtractUpdateData.mockReturnValue({
          newProgress: 50,
        });

        mockFilterProjects.mockReturnValue({
          filtered: [mockProjects[0]],
          count: 1,
        });

        const result = await routeProjectCommand('passe les projets en cours à 50%', {
          context: mockContext,
        });

        expect(result.type).toBe(ProjectCommandType.UPDATE);
        if (result.type === ProjectCommandType.UPDATE) {
          expect(result.pendingAction.affectedProjectIds).toEqual(['1']);
          expect(result.pendingAction.scopeSource).toBe('ExplicitFilter');
        }
      });
    });

    describe('UPDATE avec filtre explicite ignore le working set', () => {
      it('devrait utiliser le filtre explicite même si un working set existe', async () => {
        // Contexte avec working set (projets "en cours")
        const contextWithWorkingSet = {
          ...mockContext,
          lastListedProjectIds: ['1'], // Projet EN_COURS
          lastAppliedFilter: { status: 'EN_COURS' },
        };

        // UPDATE avec filtre explicite "terminés"
        mockDetectFilters.mockReturnValue({
          filters: { status: 'TERMINE' },
          fieldsToShow: ['status', 'progress'],
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
          hasProjectRelatedFilters: true,
          isActionVerbButNotProjectRelated: false,
          isQuestionAboutAssistantProjects: false,
          understood: true,
          isComplex: false,
          isMetaQuestion: false,
          lang: 'fr',
        });
        mockExtractUpdateData.mockReturnValue({
          newProgress: 20,
        });
        const terminatedProjects = [mockProjects[1]]; // Projet TERMINE
        mockFilterProjects.mockReturnValue({
          filtered: terminatedProjects,
          nullProgressCount: 0,
          hasProgressFilter: false,
        });

        const updateResult = await routeProjectCommand('mets les projets terminés à 20%', {
          context: contextWithWorkingSet,
        });

        expect(updateResult.type).toBe(ProjectCommandType.UPDATE);
        if (
          updateResult.type === ProjectCommandType.UPDATE ||
          updateResult.type === ProjectCommandType.ADD_NOTE
        ) {
          // Doit cibler les projets "terminés" (filtre explicite), pas "en cours" (working set)
          expect(updateResult.pendingAction.affectedProjects).toHaveLength(1);
          expect(updateResult.pendingAction.affectedProjects[0].id).toBe('2');
          expect(updateResult.pendingAction.affectedProjects[0].status).toBe('TERMINE');
        }
      });
    });

    describe('UPDATE sans filtre et sans historique', () => {
      it('devrait cibler tous les projets avec un avertissement clair', async () => {
        // Contexte sans working set
        const contextWithoutWorkingSet = {
          ...mockContext,
          lastListedProjectIds: undefined,
          lastAppliedFilter: undefined,
        };

        mockDetectFilters.mockReturnValue({ filters: {}, fieldsToShow: [] });
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
          isMetaQuestion: false,
          lang: 'fr',
        });
        mockExtractUpdateData.mockReturnValue({
          newProgress: 20,
        });
        // Pas de filtre, donc tous les projets
        mockFilterProjects.mockReturnValue({
          filtered: mockProjects, // Tous les projets
          nullProgressCount: 0,
          hasProgressFilter: false,
        });

        const updateResult = await routeProjectCommand("mets l'avancement à 20%", {
          context: contextWithoutWorkingSet,
        });

        expect(updateResult.type).toBe(ProjectCommandType.UPDATE);
        if (
          updateResult.type === ProjectCommandType.UPDATE ||
          updateResult.type === ProjectCommandType.ADD_NOTE
        ) {
          // Doit cibler tous les projets
          expect(updateResult.pendingAction.affectedProjects).toHaveLength(2);
          expect(updateResult.pendingAction.affectedProjects.map((p) => p.id)).toEqual(['1', '2']);
          // Le message devrait mentionner qu'il n'y a pas de filtre
          expect(updateResult.message).toBeDefined();
        }
      });
    });

    describe('Extractor renvoie filtre vide mais présent (objet non vide)', () => {
      it('devrait considérer le filtre comme non explicite si toutes les valeurs sont undefined/null/vides', async () => {
        const contextWithWorkingSet = {
          ...mockContext,
          lastListedProjectIds: ['1'],
          lastAppliedFilter: { status: 'EN_COURS' },
        };

        // Simuler un extractor qui renvoie un objet avec des propriétés undefined
        mockDetectFilters.mockReturnValue({
          filters: {
            status: undefined, // undefined, pas absent
            minProgress: undefined,
            collab: null,
            style: '',
          } as any, // Forcer le type pour simuler le bug
          fieldsToShow: [],
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
          isMetaQuestion: false,
          lang: 'fr',
        });
        mockExtractUpdateData.mockReturnValue({
          newProgress: 20,
        });

        const updateResult = await routeProjectCommand("mets l'avancement à 20%", {
          context: contextWithWorkingSet,
        });

        expect(updateResult.type).toBe(ProjectCommandType.UPDATE);
        if (
          updateResult.type === ProjectCommandType.UPDATE ||
          updateResult.type === ProjectCommandType.ADD_NOTE
        ) {
          // Doit utiliser le working set car le filtre est "vide" (valeurs undefined/null/vides)
          expect(updateResult.pendingAction.affectedProjects).toHaveLength(1);
          expect(updateResult.pendingAction.affectedProjects[0].id).toBe('1');
        }
      });
    });

    describe('"leur" ne doit PAS fabriquer un filtre implicite', () => {
      it('devrait retourner un filtre vide quand "leur" est utilisé sans autre critère', async () => {
        // Simuler detectFilters avec "leur" dans la phrase
        // "leur" ne doit pas créer de filtre status/collab/etc.
        mockDetectFilters.mockReturnValue({
          filters: {}, // Vide, "leur" est ignoré
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
          hasProjectRelatedFilters: false, // Pas de filtre projet
          isActionVerbButNotProjectRelated: false,
          isQuestionAboutAssistantProjects: false,
          understood: true,
          isComplex: false,
          isMetaQuestion: false,
          lang: 'fr',
        });
        mockExtractUpdateData.mockReturnValue({
          newProgress: 20,
        });

        const contextWithWorkingSet = {
          ...mockContext,
          lastListedProjectIds: ['1', '2'], // Plusieurs projets
          lastAppliedFilter: { status: 'EN_COURS' },
        };

        const updateResult = await routeProjectCommand('passe leur progression à 20%', {
          context: contextWithWorkingSet,
        });

        expect(updateResult.type).toBe(ProjectCommandType.UPDATE);
        if (
          updateResult.type === ProjectCommandType.UPDATE ||
          updateResult.type === ProjectCommandType.ADD_NOTE
        ) {
          // Doit utiliser le working set (lastListedProjectIds), pas un filtre vide qui matcherait 0 projet
          expect(updateResult.pendingAction.affectedProjects.length).toBeGreaterThan(0);
          // Vérifier que les projets affectés sont bien ceux du working set
          const affectedIds = updateResult.pendingAction.affectedProjects.map((p) => p.id);
          expect(affectedIds).toEqual(expect.arrayContaining(['1', '2']));
        }
      });
    });
  });

  describe('LIST avec working set (vue détails)', () => {
    describe('LIST en cours → "affiche tous les détails"', () => {
      it('devrait utiliser lastListedProjectIds quand "affiche tous les détails" est demandé sans filtre', async () => {
        // Étape 1 : LIST avec filtre "en cours" (phrase réelle)
        mockDetectFilters.mockReturnValue({
          filters: { status: 'EN_COURS' },
          fieldsToShow: ['status', 'progress'],
        });
        mockClassifyQuery.mockReturnValue({
          isList: true,
          isCount: false,
          isUpdate: false,
          isCreate: false,
          isConversationalQuestion: false,
          hasActionVerb: true,
          hasProjectMention: true,
          isProjectInNonMusicalContext: false,
          hasProjectRelatedFilters: true,
          isActionVerbButNotProjectRelated: false,
          isQuestionAboutAssistantProjects: false,
          understood: true,
          isComplex: false,
          isMetaQuestion: false,
          lang: 'fr',
          isDetailsViewRequested: false,
          isAllProjectsRequested: false,
        });
        const filteredProjects = [mockProjects[0]]; // Seulement le projet "EN_COURS"
        mockFilterProjects.mockReturnValue({
          filtered: filteredProjects,
          nullProgressCount: 0,
          hasProgressFilter: false,
        });

        const listResult = await routeProjectCommand('liste les en cours', {
          context: mockContext,
        });

        expect(listResult.type).toBe(ProjectCommandType.LIST);
        if (listResult.type === ProjectCommandType.LIST) {
          expect(listResult.projects).toHaveLength(1);
          expect(listResult.listedProjectIds).toEqual(['1']);
          expect(listResult.appliedFilter.status).toBe('EN_COURS');
        }

        // Étape 2 : LIST avec "affiche tous les détails" (sans filtre explicite)
        mockDetectFilters.mockReturnValue({
          filters: {}, // IMPORTANT : filtre vide
          fieldsToShow: ['status', 'progress', 'collab', 'deadline'],
        });
        mockClassifyQuery.mockReturnValue({
          isList: true,
          isCount: false,
          isUpdate: false,
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
          isMetaQuestion: false,
          lang: 'fr',
          isDetailsViewRequested: true, // IMPORTANT : vue détails demandée
          isAllProjectsRequested: false, // IMPORTANT : pas "tous les projets"
        });

        const contextWithWorkingSet = {
          ...mockContext,
          lastListedProjectIds: ['1'], // IDs du dernier listing
          lastAppliedFilter: { status: 'EN_COURS' },
        };

        const detailsResult = await routeProjectCommand('affiche tous les détails', {
          context: contextWithWorkingSet,
        });

        expect(detailsResult.type).toBe(ProjectCommandType.LIST);
        if (detailsResult.type === ProjectCommandType.LIST) {
          // Doit utiliser le working set (lastListedProjectIds), pas tous les projets
          expect(detailsResult.projects).toHaveLength(1);
          expect(detailsResult.projects[0].id).toBe('1');
          expect(detailsResult.projects[0].status).toBe('EN_COURS');
          // fieldsToShow doit être "all" (liste complète)
          expect(detailsResult.fieldsToShow.length).toBeGreaterThan(3);
          expect(detailsResult.fieldsToShow).toContain('status');
          expect(detailsResult.fieldsToShow).toContain('progress');
          expect(detailsResult.fieldsToShow).toContain('collab');
          expect(detailsResult.listedProjectIds).toEqual(['1']);
        }
      });
    });

    describe('LIST en cours → "affiche tous les détails de tous les projets"', () => {
      it('devrait utiliser tous les projets quand "tous les projets" est explicitement mentionné', async () => {
        // Étape 1 : LIST avec filtre "en cours"
        mockDetectFilters.mockReturnValue({
          filters: { status: 'EN_COURS' },
          fieldsToShow: ['status', 'progress'],
        });
        mockClassifyQuery.mockReturnValue({
          isList: true,
          isCount: false,
          isUpdate: false,
          isCreate: false,
          isConversationalQuestion: false,
          hasActionVerb: true,
          hasProjectMention: true,
          isProjectInNonMusicalContext: false,
          hasProjectRelatedFilters: true,
          isActionVerbButNotProjectRelated: false,
          isQuestionAboutAssistantProjects: false,
          understood: true,
          isComplex: false,
          isMetaQuestion: false,
          lang: 'fr',
          isDetailsViewRequested: false,
          isAllProjectsRequested: false,
        });
        const filteredProjects = [mockProjects[0]];
        mockFilterProjects.mockReturnValue({
          filtered: filteredProjects,
          nullProgressCount: 0,
          hasProgressFilter: false,
        });

        const listResult = await routeProjectCommand('liste les en cours', {
          context: mockContext,
        });

        expect(listResult.type).toBe(ProjectCommandType.LIST);
        if (listResult.type === ProjectCommandType.LIST) {
          expect(listResult.listedProjectIds).toEqual(['1']);
        }

        // Étape 2 : LIST avec "affiche tous les détails de tous les projets"
        mockDetectFilters.mockReturnValue({
          filters: {}, // Pas de filtre de statut
          fieldsToShow: ['status', 'progress', 'collab', 'deadline'],
        });
        mockClassifyQuery.mockReturnValue({
          isList: true,
          isCount: false,
          isUpdate: false,
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
          isMetaQuestion: false,
          lang: 'fr',
          isDetailsViewRequested: true,
          isAllProjectsRequested: true, // IMPORTANT : "tous les projets" explicitement demandé
        });
        // Tous les projets doivent être retournés
        mockFilterProjects.mockReturnValue({
          filtered: mockProjects, // Tous les projets
          nullProgressCount: 0,
          hasProgressFilter: false,
        });

        const contextWithWorkingSet = {
          ...mockContext,
          lastListedProjectIds: ['1'], // Working set existe mais doit être ignoré
          lastAppliedFilter: { status: 'EN_COURS' },
        };

        const allProjectsResult = await routeProjectCommand(
          'affiche tous les détails de tous les projets',
          {
            context: contextWithWorkingSet,
          }
        );

        expect(allProjectsResult.type).toBe(ProjectCommandType.LIST);
        if (allProjectsResult.type === ProjectCommandType.LIST) {
          // Doit retourner TOUS les projets, pas seulement ceux du working set
          expect(allProjectsResult.projects.length).toBe(2);
          expect(allProjectsResult.projects.map((p) => p.id)).toEqual(['1', '2']);
          expect(allProjectsResult.listedProjectIds.length).toBe(2);
        }
      });
    });

    describe('Sans historique → "affiche tous les détails"', () => {
      it('devrait gérer sans crash et retourner tous les projets si aucun working set', async () => {
        // Contexte sans working set
        const contextWithoutWorkingSet = {
          ...mockContext,
          lastListedProjectIds: undefined,
          lastAppliedFilter: undefined,
        };

        mockDetectFilters.mockReturnValue({
          filters: {}, // Pas de filtre
          fieldsToShow: ['status', 'progress', 'collab', 'deadline'],
        });
        mockClassifyQuery.mockReturnValue({
          isList: true,
          isCount: false,
          isUpdate: false,
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
          isMetaQuestion: false,
          lang: 'fr',
          isDetailsViewRequested: true,
          isAllProjectsRequested: false,
        });
        // Tous les projets (fallback)
        mockFilterProjects.mockReturnValue({
          filtered: mockProjects,
          nullProgressCount: 0,
          hasProgressFilter: false,
        });

        const result = await routeProjectCommand('affiche tous les détails', {
          context: contextWithoutWorkingSet,
        });

        expect(result.type).toBe(ProjectCommandType.LIST);
        if (result.type === ProjectCommandType.LIST) {
          // Doit retourner tous les projets (pas de crash)
          expect(result.projects.length).toBe(2);
          expect(result.fieldsToShow.length).toBeGreaterThan(3);
          expect(result.listedProjectIds.length).toBe(2);
        }
      });
    });
  });

  describe('Deadline push avec working set', () => {
    describe('LIST collabs → UPDATE deadline push', () => {
      it('devrait utiliser lastListedProjectIds pour "pousse leur deadline de 1 mois"', async () => {
        // Étape 1 : LIST avec filtre "collabs avec hoho" (17 projets)
        const mockProjectsWithCollab = Array.from({ length: 17 }, (_, i) => ({
          ...mockProjects[0],
          id: `collab-${i + 1}`,
          name: `Projet Collab ${i + 1}`,
          collab: 'hoho',
          deadline: '2024-12-31',
        }));

        const contextWithCollabs = {
          ...mockContext,
          projects: [...mockProjects, ...mockProjectsWithCollab],
          projectCount: 19,
        };

        mockDetectFilters.mockReturnValue({
          filters: { collab: 'hoho' },
          fieldsToShow: ['status', 'progress', 'collab'],
        });
        mockClassifyQuery.mockReturnValue(
          createMockClassification({
            isList: true,
            hasActionVerb: true,
            hasProjectMention: true,
            hasProjectRelatedFilters: true,
            understood: true,
          })
        );
        mockFilterProjects.mockReturnValue({
          filtered: mockProjectsWithCollab,
          nullProgressCount: 0,
          hasProgressFilter: false,
        });

        const listResult = await routeProjectCommand('affiche toutes les collabs avec hoho', {
          context: contextWithCollabs,
        });

        expect(listResult.type).toBe(ProjectCommandType.LIST);
        if (listResult.type === ProjectCommandType.LIST) {
          expect(listResult.projects).toHaveLength(17);
          expect(listResult.listedProjectIds).toHaveLength(17);
        }

        // Étape 2 : UPDATE avec "pousse leur deadline de 1 mois" (sans filtre explicite)
        mockDetectFilters.mockReturnValue({
          filters: {}, // IMPORTANT : filtre vide, pas de collab
          fieldsToShow: ['deadline'],
        });
        mockClassifyQuery.mockReturnValue(
          createMockClassification({
            isUpdate: true,
            hasActionVerb: true,
            hasProjectMention: true,
            hasProjectRelatedFilters: false,
            understood: true,
          })
        );
        mockExtractUpdateData.mockReturnValue({
          pushDeadlineBy: { months: 1 },
        });

        const contextWithWorkingSet = {
          ...contextWithCollabs,
          lastListedProjectIds: mockProjectsWithCollab.map((p) => p.id), // 17 IDs
          lastAppliedFilter: { collab: 'hoho' },
        };

        const updateResult = await routeProjectCommand('pousse leur deadline de 1 mois', {
          context: contextWithWorkingSet,
        });

        expect(updateResult.type).toBe(ProjectCommandType.UPDATE);
        if (
          updateResult.type === ProjectCommandType.UPDATE ||
          updateResult.type === ProjectCommandType.ADD_NOTE
        ) {
          // Doit utiliser le working set (lastListedProjectIds), pas tous les projets
          expect(updateResult.pendingAction.affectedProjects).toHaveLength(17);
          expect(updateResult.pendingAction.affectedProjectIds).toHaveLength(17);
          expect(updateResult.pendingAction.scopeSource).toBe('LastListedIds');
          expect(updateResult.pendingAction.mutation.pushDeadlineBy).toBeDefined();
          expect(updateResult.pendingAction.mutation.pushDeadlineBy?.months).toBe(1);
        }
      });

      it('devrait détecter pushDeadlineBy dans updateData', async () => {
        const contextWithWorkingSet = {
          ...mockContext,
          lastListedProjectIds: ['1', '2'],
          lastAppliedFilter: { status: 'EN_COURS' },
        };

        mockDetectFilters.mockReturnValue({
          filters: {},
          fieldsToShow: ['deadline'],
        });
        mockClassifyQuery.mockReturnValue(
          createMockClassification({
            isUpdate: true,
            hasActionVerb: true,
            hasProjectMention: true,
            hasProjectRelatedFilters: false,
            understood: true,
          })
        );
        // IMPORTANT: extractUpdateData doit retourner pushDeadlineBy
        mockExtractUpdateData.mockReturnValue({
          pushDeadlineBy: { months: 1 },
        });

        const updateResult = await routeProjectCommand('pousse leur deadline de 1 mois', {
          context: contextWithWorkingSet,
        });

        expect(updateResult.type).toBe(ProjectCommandType.UPDATE);
        if (
          updateResult.type === ProjectCommandType.UPDATE ||
          updateResult.type === ProjectCommandType.ADD_NOTE
        ) {
          expect(updateResult.pendingAction.mutation.pushDeadlineBy).toBeDefined();
          expect(updateResult.pendingAction.mutation.pushDeadlineBy?.months).toBe(1);
        }
      });

      it('ne devrait PAS considérer hasDeadline dans updateData comme filtre scoping si pas explicitement demandé', async () => {
        // Bug reproduction: hasDeadline dans updateData ne doit PAS déclencher ExplicitFilter
        const mockProjectsWithDeadline = Array.from({ length: 17 }, (_, i) => ({
          ...mockProjects[0],
          id: `collab-${i + 1}`,
          name: `Projet Collab ${i + 1}`,
          collab: 'hoho',
          deadline: '2024-12-31',
        }));

        const contextWithCollabs = {
          ...mockContext,
          projects: [...mockProjects, ...mockProjectsWithDeadline],
          projectCount: 19,
          lastListedProjectIds: mockProjectsWithDeadline.map((p) => p.id), // 17 IDs
          lastAppliedFilter: { collab: 'hoho' },
        };

        // IMPORTANT: extractUpdateData retourne hasDeadline=true mais filters est vide
        // (simule le comportement après le fix: hasDeadline n'est pas dans filters)
        mockDetectFilters.mockReturnValue({
          filters: {}, // Vide - hasDeadline n'est PAS dans filters
          fieldsToShow: ['deadline'],
        });
        mockClassifyQuery.mockReturnValue(
          createMockClassification({
            isUpdate: true,
            hasActionVerb: true,
            hasProjectMention: true,
            hasProjectRelatedFilters: false,
            understood: true,
          })
        );
        mockExtractUpdateData.mockReturnValue({
          pushDeadlineBy: { months: 1 },
          hasDeadline: true, // Dans updateData mais PAS dans filters
        });

        const updateResult = await routeProjectCommand('pousse leur deadline de 1 mois', {
          context: contextWithCollabs,
        });

        expect(updateResult.type).toBe(ProjectCommandType.UPDATE);
        if (
          updateResult.type === ProjectCommandType.UPDATE ||
          updateResult.type === ProjectCommandType.ADD_NOTE
        ) {
          // Doit utiliser LastListedIds, PAS ExplicitFilter
          expect(updateResult.pendingAction.scopeSource).toBe('LastListedIds');
          expect(updateResult.pendingAction.affectedProjects).toHaveLength(17);
          expect(updateResult.pendingAction.affectedProjectIds).toHaveLength(17);
        }
      });

      it('devrait utiliser ExplicitFilter si filtre deadline est explicitement demandé', async () => {
        // Cas où l'utilisateur demande explicitement "avec deadline"
        const mockProjectsWithDeadline = Array.from({ length: 43 }, (_, i) => ({
          ...mockProjects[0],
          id: `deadline-${i + 1}`,
          name: `Projet Deadline ${i + 1}`,
          deadline: '2024-12-31',
        }));

        const contextWithDeadlines = {
          ...mockContext,
          projects: [...mockProjects, ...mockProjectsWithDeadline],
          projectCount: 45,
          lastListedProjectIds: ['1', '2'], // Working set existe mais doit être ignoré
        };

        // IMPORTANT: filters contient hasDeadline=true (filtre explicite)
        mockDetectFilters.mockReturnValue({
          filters: { hasDeadline: true }, // Filtre explicite
          fieldsToShow: ['deadline'],
        });
        mockClassifyQuery.mockReturnValue(
          createMockClassification({
            isUpdate: true,
            hasActionVerb: true,
            hasProjectMention: true,
            hasProjectRelatedFilters: true, // Filtre présent
            understood: true,
          })
        );
        mockExtractUpdateData.mockReturnValue({
          pushDeadlineBy: { months: 1 },
          hasDeadline: true,
        });
        mockFilterProjects.mockReturnValue({
          filtered: mockProjectsWithDeadline,
          nullProgressCount: 0,
          hasProgressFilter: false,
        });

        const updateResult = await routeProjectCommand(
          'pousse la deadline des projets avec deadline de 1 mois',
          {
            context: contextWithDeadlines,
          }
        );

        expect(updateResult.type).toBe(ProjectCommandType.UPDATE);
        if (
          updateResult.type === ProjectCommandType.UPDATE ||
          updateResult.type === ProjectCommandType.ADD_NOTE
        ) {
          // Doit utiliser ExplicitFilter, pas LastListedIds
          expect(updateResult.pendingAction.scopeSource).toBe('ExplicitFilter');
          expect(updateResult.pendingAction.affectedProjects).toHaveLength(43);
        }
      });

      it('devrait skip les projets sans deadline pour les mutations de deadline', async () => {
        const mockProjectsMixed = [
          { ...mockProjects[0], id: 'with-deadline-1', deadline: '2024-12-31' },
          { ...mockProjects[0], id: 'with-deadline-2', deadline: '2024-12-31' },
          { ...mockProjects[0], id: 'no-deadline-1', deadline: null },
          { ...mockProjects[0], id: 'no-deadline-2', deadline: null },
        ];

        const contextWithMixed = {
          ...mockContext,
          projects: mockProjectsMixed,
          projectCount: 4,
          lastListedProjectIds: mockProjectsMixed.map((p) => p.id),
        };

        mockDetectFilters.mockReturnValue({
          filters: {},
          fieldsToShow: ['deadline'],
        });
        mockClassifyQuery.mockReturnValue(
          createMockClassification({
            isUpdate: true,
            hasActionVerb: true,
            hasProjectMention: true,
            hasProjectRelatedFilters: false,
            understood: true,
          })
        );
        mockExtractUpdateData.mockReturnValue({
          pushDeadlineBy: { months: 1 },
        });

        const updateResult = await routeProjectCommand('pousse leur deadline de 1 mois', {
          context: contextWithMixed,
        });

        expect(updateResult.type).toBe(ProjectCommandType.UPDATE);
        if (
          updateResult.type === ProjectCommandType.UPDATE ||
          updateResult.type === ProjectCommandType.ADD_NOTE
        ) {
          // Doit skip les projets sans deadline
          expect(updateResult.pendingAction.affectedProjects).toHaveLength(2);
          expect(updateResult.pendingAction.affectedProjects.map((p) => p.id)).toEqual([
            'with-deadline-1',
            'with-deadline-2',
          ]);
          // Le message doit mentionner les projets ignorés
          expect(updateResult.pendingAction.description).toContain('2 projet(s) ignoré(s)');
        }
      });

      it('devrait afficher un message de confirmation clair pour pushDeadlineBy', async () => {
        const contextWithWorkingSet = {
          ...mockContext,
          projects: [
            { ...mockProjects[0], id: '1', deadline: '2024-12-31' },
            { ...mockProjects[0], id: '2', deadline: '2024-12-31' },
          ],
          lastListedProjectIds: ['1', '2'],
        };

        mockDetectFilters.mockReturnValue({
          filters: {},
          fieldsToShow: ['deadline'],
        });
        mockClassifyQuery.mockReturnValue(
          createMockClassification({
            isUpdate: true,
            hasActionVerb: true,
            hasProjectMention: true,
            hasProjectRelatedFilters: false,
            understood: true,
          })
        );
        mockExtractUpdateData.mockReturnValue({
          pushDeadlineBy: { months: 1 },
        });

        const updateResult = await routeProjectCommand('pousse leur deadline de 1 mois', {
          context: contextWithWorkingSet,
        });

        expect(updateResult.type).toBe(ProjectCommandType.UPDATE);
        if (
          updateResult.type === ProjectCommandType.UPDATE ||
          updateResult.type === ProjectCommandType.ADD_NOTE
        ) {
          // Le message doit contenir "Décaler la deadline de +1 mois"
          expect(updateResult.pendingAction.description).toContain('Décaler la deadline');
          expect(updateResult.pendingAction.description).toContain('+1 mois');
        }
      });
    });
  });
});
