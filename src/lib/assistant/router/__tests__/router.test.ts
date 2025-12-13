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
      mockClassifyQuery.mockReturnValue({
        isList: false,
        isCount: false,
        isUpdate: false,
        isCreate: true,
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
});
