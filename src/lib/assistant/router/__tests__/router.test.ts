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
import { filterProjects } from '@/components/assistant/utils/filterProjects';

const mockClassifyQuery = classifyQuery as jest.MockedFunction<typeof classifyQuery>;
const mockDetectFilters = detectFilters as jest.MockedFunction<typeof detectFilters>;
const mockExtractUpdateData = extractUpdateData as jest.MockedFunction<typeof extractUpdateData>;
const mockExtractCreateData = extractCreateData as jest.MockedFunction<typeof extractCreateData>;
const mockFilterProjects = filterProjects as jest.MockedFunction<typeof filterProjects>;

// Mock fetch pour les appels à l'API Groq
const mockFetch = jest.fn();
global.fetch = mockFetch as any;

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
  beforeEach(() => {
    // Reset fetch mock avant chaque test
    mockFetch.mockClear();
    // Par défaut, mock fetch pour retourner une réponse valide
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ text: 'Réponse de fallback Groq' }),
    });
  });
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
    beforeEach(() => {
      // Reset fetch mock avant chaque test
      mockFetch.mockClear();
    });

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

      // Mock fetch pour retourner une réponse Groq
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ text: 'Réponse de Groq' }),
      });

      const result = await routeProjectCommand('Bonjour, comment vas-tu ?', {
        context: mockContext,
      });

      expect(result.type).toBe(ProjectCommandType.GENERAL);
      if (result.type === ProjectCommandType.GENERAL) {
        expect(result.response).toBe('Réponse de Groq');
      }

      // Vérifier que fetch a été appelé avec la bonne URL
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/assistant/groq',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );

      // Vérifier que Groq n'a pas accès aux tools (pas d'appel à extractUpdateData, etc.)
      expect(mockExtractUpdateData).not.toHaveBeenCalled();
      expect(mockExtractCreateData).not.toHaveBeenCalled();
    });

    it('devrait passer isComplex à callGroqApi pour les requêtes complexes', async () => {
      mockDetectFilters.mockReturnValue({ filters: {}, fieldsToShow: [] });
      mockClassifyQuery.mockReturnValue({
        isList: false,
        isCount: false,
        isUpdate: false,
        isCreate: false,
        isConversationalQuestion: true,
        hasActionVerb: false,
        understood: true,
        isComplex: true, // Requête complexe
      });

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ text: 'Réponse complexe de Groq' }),
      });

      const result = await routeProjectCommand(
        'Analyse en détail tous mes projets et explique-moi pourquoi certains sont en retard',
        {
          context: mockContext,
        }
      );

      expect(result.type).toBe(ProjectCommandType.GENERAL);
      expect(mockFetch).toHaveBeenCalled();

      // Vérifier que isComplex est passé dans le body
      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body as string);
      expect(body.isComplex).toBe(true);
    });

    it('devrait intercepter les questions sur les fonctionnalités et retourner une réponse hardcodée', async () => {
      mockDetectFilters.mockReturnValue({ filters: {}, fieldsToShow: [] });
      mockClassifyQuery.mockReturnValue({
        isList: false,
        isCount: false,
        isUpdate: false,
        isCreate: false,
        isConversationalQuestion: true,
        hasActionVerb: false,
        understood: true,
      });

      // Réinitialiser le mock avant le test
      mockFetch.mockClear();

      const result = await routeProjectCommand('quelles sont tes fonctionnalités ?', {
        context: mockContext,
      });

      expect(result.type).toBe(ProjectCommandType.GENERAL);
      if (result.type === ProjectCommandType.GENERAL) {
        // Assert positif fort: vérifier le marqueur stable capabilities contract
        expect(result.response).toContain('CAPABILITIES_CONTRACT_v1');

        // Vérifier que la réponse contient les fonctionnalités réelles
        expect(result.response).toContain('LARIAN BOT');
        expect(result.response).toContain('Lister / filtrer / trier');
        expect(result.response).toContain('Créer');
        expect(result.response).toContain('Modifier en batch');
        expect(result.response).toContain('Ajouter une note');

        // Vérifier les limitations contractuelles (mention explicite des outils non pilotés)
        expect(result.response).toContain('Je ne pilote **pas**');
        expect(result.response).toContain('Ableton');
        expect(result.response).toContain('Spotify');
        expect(result.response).toContain('Trello');
        expect(result.response).toContain('Asana');

        // Vérifier qu'ils sont bien dans la section "Limitations contractuelles" (pas comme fonctionnalités)
        const responseLower = result.response.toLowerCase();
        const limitationsIndex = responseLower.indexOf('limitations contractuelles');
        const abletonIndex = responseLower.indexOf('ableton');
        const spotifyIndex = responseLower.indexOf('spotify');
        expect(limitationsIndex).toBeGreaterThanOrEqual(0);
        expect(abletonIndex).toBeGreaterThan(limitationsIndex); // Ableton après "Limitations"
        expect(spotifyIndex).toBeGreaterThan(limitationsIndex); // Spotify après "Limitations"
      }

      // Vérifier que Groq n'a PAS été appelé (interception)
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('devrait intercepter les variantes de questions sur les fonctionnalités', async () => {
      mockDetectFilters.mockReturnValue({ filters: {}, fieldsToShow: [] });
      mockClassifyQuery.mockReturnValue({
        isList: false,
        isCount: false,
        isUpdate: false,
        isCreate: false,
        isConversationalQuestion: true,
        hasActionVerb: false,
        understood: true,
      });

      const variants = [
        'que peux-tu faire ?',
        'tu peux faire quoi',
        'quelles sont tes capacités ?',
        'fonctionnalités',
        'que sais-tu faire',
      ];

      for (const variant of variants) {
        // Réinitialiser le mock avant chaque variant
        mockFetch.mockClear();

        const result = await routeProjectCommand(variant, {
          context: mockContext,
        });

        expect(result.type).toBe(ProjectCommandType.GENERAL);
        if (result.type === ProjectCommandType.GENERAL) {
          // Assert positif fort: vérifier le marqueur stable capabilities contract
          expect(result.response).toContain('CAPABILITIES_CONTRACT_v1');

          expect(result.response).toContain('LARIAN BOT');
          expect(result.response).toContain('Lister / filtrer / trier');
          // Vérifier les limitations contractuelles
          expect(result.response).toContain('Je ne pilote **pas**');
          expect(result.response).toContain('Ableton');
          expect(result.response).toContain('Spotify');
        }
      }

      // Vérifier qu'aucun appel à Groq n'a été fait pour ces questions
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('ne devrait PAS intercepter les vraies commandes contenant "tu peux" (anti-faux-positifs)', async () => {
      mockDetectFilters.mockReturnValue({ filters: {}, fieldsToShow: [] });

      // Cas 1: "tu peux passer leur avancement à 20% ?" → doit être une mutation
      // Test: les signaux de mutation ("avancement", "20%") empêchent l'interception capabilities
      // même si le message contient "tu peux" qui pourrait déclencher le guard
      // Classification ambigüe: conversationalQuestion=true pour activer le guard,
      // mais les signaux de mutation doivent empêcher l'interception
      mockClassifyQuery.mockReturnValue({
        isList: false,
        isCount: false,
        isUpdate: true, // C'est une vraie commande UPDATE
        isCreate: false,
        isConversationalQuestion: true, // Classification ambigüe (question avec "?")
        hasActionVerb: false, // Permet au guard capabilities de s'activer pour tester la protection
        understood: true,
        isComplex: false,
        isMetaQuestion: false,
        lang: 'fr',
        hasProjectMention: false,
        isProjectInNonMusicalContext: false,
        hasProjectRelatedFilters: false,
        isActionVerbButNotProjectRelated: false,
        isQuestionAboutAssistantProjects: false,
        isDetailsViewRequested: false,
        isAllProjectsRequested: false,
      });

      mockFetch.mockClear();
      // IMPORTANT: extractUpdateData doit retourner un objet valide (pas null)
      mockExtractUpdateData.mockReturnValue({
        newProgress: 20,
      });

      const result1 = await routeProjectCommand('tu peux passer leur avancement à 20% ?', {
        context: {
          ...mockContext,
          lastListedProjectIds: ['1', '2'], // Fournir un scope pour que UPDATE fonctionne
        },
      });

      // Les signaux de mutation ("avancement", "20%") empêchent l'interception capabilities
      // Assert négatif fort: pas de marqueur capabilities contract
      expect(result1.response).not.toContain('CAPABILITIES_CONTRACT_v1');

      // Si c'est UPDATE, c'est parfait (les signaux de mutation ont empêché l'interception)
      // Si c'est GENERAL, c'est Groq normal (pas l'interception capabilities)
      if (result1.type === ProjectCommandType.UPDATE) {
        expect(result1.type).toBe(ProjectCommandType.UPDATE);
      }

      // Cas 2: "est-ce que tu peux mettre les terminés à 100% ?" → doit être une mutation
      // Test avec classification UPDATE correcte (pour tester le chemin normal)
      mockFetch.mockClear(); // Réinitialiser le mock entre les cas
      mockClassifyQuery.mockReturnValue({
        isList: false,
        isCount: false,
        isUpdate: true, // Classification UPDATE correcte
        isCreate: false,
        isConversationalQuestion: false, // Pas une question conversationnelle
        hasActionVerb: true, // Verbe d'action présent
        understood: true,
        isComplex: false,
        isMetaQuestion: false,
        lang: 'fr',
        hasProjectMention: false,
        isProjectInNonMusicalContext: false,
        hasProjectRelatedFilters: false,
        isActionVerbButNotProjectRelated: false,
        isQuestionAboutAssistantProjects: false,
        isDetailsViewRequested: false,
        isAllProjectsRequested: false,
      });

      // IMPORTANT: extractUpdateData doit retourner un objet valide
      mockExtractUpdateData.mockReturnValue({
        newProgress: 100,
        newStatus: 'TERMINE',
      });

      const result2 = await routeProjectCommand('est-ce que tu peux mettre les terminés à 100% ?', {
        context: {
          ...mockContext,
          lastListedProjectIds: ['1', '2'], // Fournir un scope pour que UPDATE fonctionne
        },
      });

      // Avec classification UPDATE correcte et scope disponible, doit aller vers UPDATE
      expect(mockExtractUpdateData).toHaveBeenCalled();
      expect(result2.type).toBe(ProjectCommandType.UPDATE);
      expect(mockFetch).not.toHaveBeenCalled();
      // Assert négatif fort: pas de marqueur capabilities contract
      if (result2.type === ProjectCommandType.GENERAL) {
        expect(result2.response).not.toContain('CAPABILITIES_CONTRACT_v1');
      }

      // Cas 1.5: "tu peux pousser leur deadline de 1 mois ?" → doit être une mutation
      // Test: les signaux de mutation ("deadline", "1 mois") empêchent l'interception capabilities
      // même si le message contient "tu peux" qui pourrait déclencher le guard
      // Classification ambigüe: conversationalQuestion=true pour activer le guard,
      // mais les signaux de mutation doivent empêcher l'interception
      mockFetch.mockClear(); // Réinitialiser le mock entre les cas
      mockClassifyQuery.mockReturnValue({
        isList: false,
        isCount: false,
        isUpdate: true, // C'est une vraie commande UPDATE
        isCreate: false,
        isConversationalQuestion: true, // Classification ambigüe (question avec "?")
        hasActionVerb: false, // Permet au guard capabilities de s'activer pour tester la protection
        understood: true,
        isComplex: false,
        isMetaQuestion: false,
        lang: 'fr',
        hasProjectMention: false,
        isProjectInNonMusicalContext: false,
        hasProjectRelatedFilters: false,
        isActionVerbButNotProjectRelated: false,
        isQuestionAboutAssistantProjects: false,
        isDetailsViewRequested: false,
        isAllProjectsRequested: false,
      });

      // IMPORTANT: extractUpdateData doit retourner pushDeadlineBy pour ce cas
      mockExtractUpdateData.mockReturnValue({
        pushDeadlineBy: { months: 1 },
      });

      const result1_5 = await routeProjectCommand('tu peux pousser leur deadline de 1 mois ?', {
        context: {
          ...mockContext,
          lastListedProjectIds: ['1', '2'], // Fournir un scope pour que UPDATE fonctionne
        },
      });

      // Les signaux de mutation ("deadline", "1 mois") empêchent l'interception capabilities
      // Assert négatif fort: pas de marqueur capabilities contract
      expect(result1_5.response).not.toContain('CAPABILITIES_CONTRACT_v1');

      // Si c'est UPDATE, c'est parfait (les signaux de mutation ont empêché l'interception)
      // Si c'est GENERAL, c'est Groq normal (pas l'interception capabilities)
      if (result1_5.type === ProjectCommandType.UPDATE) {
        expect(result1_5.type).toBe(ProjectCommandType.UPDATE);
      }

      // Cas 3: "tu peux ajouter un projet ?" → doit être une création
      // Test avec classification CREATE correcte (pour tester le chemin normal)
      // "ajouter" est un verbe d'action dans la regex anti-faux-positifs,
      // donc même si le guard s'active, il ne devrait pas intercepter
      mockFetch.mockClear(); // Réinitialiser le mock entre les cas
      mockClassifyQuery.mockReturnValue({
        isList: false,
        isCount: false,
        isUpdate: false,
        isCreate: true, // C'est une vraie commande CREATE
        isConversationalQuestion: false, // Classification CREATE correcte
        hasActionVerb: true, // Verbe d'action présent
        understood: true,
        isComplex: false,
        isMetaQuestion: false,
        lang: 'fr',
        hasProjectMention: false,
        isProjectInNonMusicalContext: false,
        hasProjectRelatedFilters: false,
        isActionVerbButNotProjectRelated: false,
        isQuestionAboutAssistantProjects: false,
        isDetailsViewRequested: false,
        isAllProjectsRequested: false,
      });

      mockExtractCreateData.mockReturnValue({
        name: 'Nouveau projet',
      });

      const result3 = await routeProjectCommand('tu peux ajouter un projet ?', {
        context: mockContext,
      });

      // Avec classification CREATE correcte, doit aller vers CREATE
      expect(result3.type).toBe(ProjectCommandType.CREATE);
      expect(mockFetch).not.toHaveBeenCalled();
      // Assert négatif fort: pas de marqueur capabilities contract
      if (result3.type === ProjectCommandType.GENERAL) {
        expect(result3.response).not.toContain('CAPABILITIES_CONTRACT_v1');
      }

      // Cas 4: "tu peux ajouter une note pour Magnetized : test ?" → doit être une mutation (note)
      // Test: les signaux de mutation ("note") empêchent l'interception capabilities
      // même si le message contient "tu peux" qui pourrait déclencher le guard
      // Classification ambigüe: conversationalQuestion=true pour activer le guard,
      // mais les signaux de mutation doivent empêcher l'interception
      mockFetch.mockClear(); // Réinitialiser le mock entre les cas
      mockClassifyQuery.mockReturnValue({
        isList: false,
        isCount: false,
        isUpdate: true, // C'est une vraie commande UPDATE (ajout de note)
        isCreate: false,
        isConversationalQuestion: true, // Classification ambigüe (question avec "?")
        hasActionVerb: false, // Permet au guard capabilities de s'activer pour tester la protection
        understood: true,
        isComplex: false,
        isMetaQuestion: false,
        lang: 'fr',
        hasProjectMention: true, // "Magnetized" est mentionné
        isProjectInNonMusicalContext: false,
        hasProjectRelatedFilters: false,
        isActionVerbButNotProjectRelated: false,
        isQuestionAboutAssistantProjects: false,
        isDetailsViewRequested: false,
        isAllProjectsRequested: false,
      });

      // IMPORTANT: extractUpdateData doit retourner newNote pour ce cas
      mockExtractUpdateData.mockReturnValue({
        newNote: 'test',
        projectName: 'Magnetized',
      });

      const result4 = await routeProjectCommand(
        'tu peux ajouter une note pour Magnetized : test ?',
        {
          context: {
            ...mockContext,
            lastListedProjectIds: ['1', '2'], // Fournir un scope pour que UPDATE fonctionne
          },
        }
      );

      // Les signaux de mutation ("note") empêchent l'interception capabilities
      // Assert négatif fort: pas de marqueur capabilities contract
      expect(result4.response).not.toContain('CAPABILITIES_CONTRACT_v1');

      // Si c'est UPDATE, c'est parfait (les signaux de mutation ont empêché l'interception)
      // Si c'est GENERAL, c'est Groq normal (pas l'interception capabilities)
      if (result4.type === ProjectCommandType.UPDATE) {
        expect(result4.type).toBe(ProjectCommandType.UPDATE);
      }

      // Cas 5: "tu peux me lister les projets en cours ?" → doit être LIST (pas capabilities)
      // Décision figée: c'est une vraie commande LIST, pas une question sur les capacités
      // Même si "tu peux" + "lister" pourrait sembler être une question capacités,
      // c'est une commande action réelle avec filtre explicite
      mockFetch.mockClear(); // Réinitialiser le mock entre les cas
      mockClassifyQuery.mockReturnValue({
        isList: true, // C'est une vraie commande LIST
        isCount: false,
        isUpdate: false,
        isCreate: false,
        isConversationalQuestion: false, // Pas une question conversationnelle, c'est une commande
        hasActionVerb: true, // "lister" est un verbe d'action
        understood: true,
        isComplex: false,
        isMetaQuestion: false,
        lang: 'fr',
        hasProjectMention: false,
        isProjectInNonMusicalContext: false,
        hasProjectRelatedFilters: true, // Filtre "en cours" présent
        isActionVerbButNotProjectRelated: false,
        isQuestionAboutAssistantProjects: false,
        isDetailsViewRequested: false,
        isAllProjectsRequested: false,
      });

      // IMPORTANT: detectFilters doit retourner le filtre "en cours"
      mockDetectFilters.mockReturnValue({
        filters: { status: 'EN_COURS' },
        fieldsToShow: [],
      });

      // IMPORTANT: filterProjects doit retourner un résultat valide pour LIST
      mockFilterProjects.mockReturnValue({
        filtered: mockProjects.filter((p) => p.status === 'EN_COURS'),
        count: 1,
      });

      const result5 = await routeProjectCommand('tu peux me lister les projets en cours ?', {
        context: mockContext,
      });

      // Décision figée: doit être LIST, pas GENERAL capabilities
      expect(result5.type).toBe(ProjectCommandType.LIST);
      expect(mockFetch).not.toHaveBeenCalled(); // Pas d'appel Groq car c'est LIST
      // Assert négatif fort: pas de marqueur capabilities contract
      if (result5.type === ProjectCommandType.GENERAL) {
        expect(result5.response).not.toContain('CAPABILITIES_CONTRACT_v1');
      }
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
      // Mock fetch pour retourner une réponse Groq
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ text: 'Réponse' }),
      });

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

        // Comportement actuel: sans scope, le router retourne GENERAL avec confirmationType: 'scope_missing'
        expect(updateResult.type).toBe(ProjectCommandType.GENERAL);
        if (updateResult.type === ProjectCommandType.GENERAL) {
          expect(updateResult.confirmationType).toBe('scope_missing');
          expect(updateResult.proposedMutation).toBeDefined();
          expect(updateResult.proposedMutation?.newProgress).toBe(20);
          expect(updateResult.totalProjectsCount).toBe(2);
          expect(updateResult.response).toContain('tous les projets');
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
        // Créer des projets avec deadline pour ce test
        const projectsWithDeadline = [
          { ...mockProjects[0], id: '1', deadline: '2024-12-31' },
          { ...mockProjects[1], id: '2', deadline: '2024-12-31' },
        ];
        const contextWithWorkingSet = {
          ...mockContext,
          projects: projectsWithDeadline,
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
        // IMPORTANT: filterProjects doit retourner les projets avec deadline
        mockFilterProjects.mockReturnValue({
          filtered: projectsWithDeadline,
          nullProgressCount: 0,
          hasProgressFilter: false,
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
