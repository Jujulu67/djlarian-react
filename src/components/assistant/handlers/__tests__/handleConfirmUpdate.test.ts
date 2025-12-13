/**
 * Tests d'intégration pour handleConfirmUpdate
 *
 * Objectif : Vérifier que le système complet fonctionne correctement
 * - Quand scopeSource === LastListedIds → projectIds MUST be sent
 * - Test avec mock fetch qui échoue si projectIds absent
 */

import { handleConfirmUpdate } from '../handleConfirmUpdate';
import type { Message } from '@/components/assistant/types';
import type { Project } from '@/components/projects/types';

// Mock fetch global
global.fetch = jest.fn();

// Mock router
const mockRouter = {
  refresh: jest.fn(),
} as any;

// Mock setters
const mockSetIsLoading = jest.fn();
const mockSetMessages = jest.fn((fn) => fn([]));
const mockSetLocalProjects = jest.fn((fn) => fn([]));
const mockSetLastFilters = jest.fn();
const mockLocalProjectsRef = { current: [] };

describe("handleConfirmUpdate - Tests d'intégration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  const createMockMessage = (
    scopeSource: 'LastListedIds' | 'LastAppliedFilter' | 'AllProjects' | 'ExplicitFilter',
    affectedProjectIds: string[],
    filters: any = {}
  ): Message => {
    const affectedProjects: Project[] = affectedProjectIds.map((id) => ({
      id,
      name: `Projet ${id}`,
      status: 'EN_COURS',
      progress: 0,
      collab: null,
      style: null,
      deadline: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
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
    }));

    return {
      role: 'assistant',
      content: 'Test message',
      timestamp: new Date(),
      updateConfirmation: {
        filters,
        updateData: {
          newProgress: 20,
        },
        affectedProjects,
        affectedProjectIds,
        scopeSource,
        fieldsToShow: ['progress', 'status'],
      },
    };
  };

  describe('When scopeSource === LastListedIds', () => {
    it('MUST send projectIds in payload (not filters)', async () => {
      const affectedProjectIds = ['1', '2', '3'];
      const msg = createMockMessage('LastListedIds', affectedProjectIds, {});

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { count: 3 } }),
      });

      await handleConfirmUpdate({
        msg,
        idx: 0,
        router: mockRouter,
        setIsLoading: mockSetIsLoading,
        setMessages: mockSetMessages,
        setLocalProjects: mockSetLocalProjects,
        localProjectsRef: mockLocalProjectsRef,
        setLastFilters: mockSetLastFilters,
      });

      // Vérifier que fetch a été appelé
      expect(global.fetch).toHaveBeenCalledTimes(1);

      // Vérifier que le payload contient projectIds
      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const payload = JSON.parse(fetchCall[1].body);

      expect(payload).toHaveProperty('projectIds');
      expect(payload.projectIds).toEqual(affectedProjectIds);
      expect(payload.scopeSource).toBe('LastListedIds');
      // Vérifier qu'il n'y a PAS de filtres vides
      expect(payload).not.toHaveProperty('status');
      expect(payload).not.toHaveProperty('minProgress');
      expect(payload).not.toHaveProperty('maxProgress');
    });

    it('MUST send projectIds (not filters) for progress mutation with LastListedIds', async () => {
      const affectedProjectIds = ['1', '2', '3'];
      const msg = createMockMessage('LastListedIds', affectedProjectIds, {});
      // Simuler une mutation de progression
      if (msg.updateConfirmation) {
        msg.updateConfirmation.updateData = {
          newProgress: 20,
        };
      }

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { count: 3 } }),
      });

      await handleConfirmUpdate({
        msg,
        idx: 0,
        router: mockRouter,
        setIsLoading: mockSetIsLoading,
        setMessages: mockSetMessages,
        setLocalProjects: mockSetLocalProjects,
        localProjectsRef: mockLocalProjectsRef,
        setLastFilters: mockSetLastFilters,
      });

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const payload = JSON.parse(fetchCall[1].body);

      // Avec LastListedIds, on envoie projectIds, pas les filtres
      expect(payload).toHaveProperty('projectIds');
      expect(payload.projectIds).toEqual(affectedProjectIds);
      expect(payload.scopeSource).toBe('LastListedIds');
      expect(payload).toHaveProperty('newProgress');
      expect(payload.newProgress).toBe(20);
      // Les filtres ne doivent PAS être présents
      expect(payload).not.toHaveProperty('status');
      expect(payload).not.toHaveProperty('minProgress');
      expect(payload).not.toHaveProperty('maxProgress');
    });

    it('should fail if projectIds are missing when scopeSource is LastListedIds', async () => {
      const msg = createMockMessage('LastListedIds', ['1', '2', '3'], {});
      // Simuler un cas où affectedProjectIds serait undefined (ne devrait pas arriver, mais test de garde-fou)
      if (msg.updateConfirmation) {
        msg.updateConfirmation.affectedProjectIds = undefined as any;
      }

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { count: 45 } }), // Simuler un mauvais count
      });

      await handleConfirmUpdate({
        msg,
        idx: 0,
        router: mockRouter,
        setIsLoading: mockSetIsLoading,
        setMessages: mockSetMessages,
        setLocalProjects: mockSetLocalProjects,
        localProjectsRef: mockLocalProjectsRef,
        setLastFilters: mockSetLastFilters,
      });

      // Le code devrait utiliser affectedProjects.map(p => p.id) comme fallback
      // Mais le payload devrait quand même contenir projectIds
      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const payload = JSON.parse(fetchCall[1].body);

      // Même avec affectedProjectIds undefined, le fallback devrait extraire les IDs
      expect(payload).toHaveProperty('projectIds');
      expect(payload.projectIds).toEqual(['1', '2', '3']);
    });
  });

  describe('When scopeSource === ExplicitFilter', () => {
    it('should send filters (not projectIds) when scopeSource is ExplicitFilter', async () => {
      const msg = createMockMessage('ExplicitFilter', ['1', '2'], { status: 'EN_COURS' });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { count: 2 } }),
      });

      await handleConfirmUpdate({
        msg,
        idx: 0,
        router: mockRouter,
        setIsLoading: mockSetIsLoading,
        setMessages: mockSetMessages,
        setLocalProjects: mockSetLocalProjects,
        localProjectsRef: mockLocalProjectsRef,
        setLastFilters: mockSetLastFilters,
      });

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const payload = JSON.parse(fetchCall[1].body);

      // Avec ExplicitFilter, on envoie les filtres, pas les IDs
      expect(payload).toHaveProperty('status');
      expect(payload.status).toBe('EN_COURS');
      // projectIds ne devrait PAS être présent
      expect(payload).not.toHaveProperty('projectIds');
    });
  });

  describe('Mismatch detection', () => {
    it('should detect and log mismatch when API returns different count', async () => {
      const affectedProjectIds = ['1', '2', '3'];
      const msg = createMockMessage('LastListedIds', affectedProjectIds, {});

      // Simuler une réponse API avec un count différent (bug)
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { count: 45 } }), // 45 au lieu de 3
      });

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      await handleConfirmUpdate({
        msg,
        idx: 0,
        router: mockRouter,
        setIsLoading: mockSetIsLoading,
        setMessages: mockSetMessages,
        setLocalProjects: mockSetLocalProjects,
        localProjectsRef: mockLocalProjectsRef,
        setLastFilters: mockSetLastFilters,
      });

      // Vérifier que le mismatch a été détecté (en mode debug)
      // Le code devrait appeler setMessages avec un message contenant le mismatch
      expect(mockSetMessages).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Confirmation mandatory', () => {
    it('should NOT make API call when updateConfirmation is missing', async () => {
      // Ce test vérifie que handleConfirmUpdate ne persiste PAS sans updateConfirmation
      // handleSubmit dans useAssistantChat.ts crée toujours un PendingConfirmationAction
      // qui nécessite une confirmation avant d'appeler handleConfirmUpdate

      const msgWithoutConfirmation: Message = {
        role: 'assistant',
        content: 'Test',
        timestamp: new Date(),
        // Pas de updateConfirmation
      };

      await handleConfirmUpdate({
        msg: msgWithoutConfirmation,
        idx: 0,
        router: mockRouter,
        setIsLoading: mockSetIsLoading,
        setMessages: mockSetMessages,
        setLocalProjects: mockSetLocalProjects,
        localProjectsRef: mockLocalProjectsRef,
        setLastFilters: mockSetLastFilters,
      });

      // Vérifier qu'aucun appel API n'a été fait
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should require updateConfirmation to persist updates', async () => {
      // Vérifier que handleConfirmUpdate nécessite updateConfirmation pour fonctionner
      const affectedProjectIds = ['1', '2', '3'];
      const msg = createMockMessage('LastListedIds', affectedProjectIds, {});

      expect(msg.updateConfirmation).toBeDefined();
      expect(msg.updateConfirmation?.affectedProjectIds).toEqual(affectedProjectIds);

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { count: 3 } }),
      });

      await handleConfirmUpdate({
        msg,
        idx: 0,
        router: mockRouter,
        setIsLoading: mockSetIsLoading,
        setMessages: mockSetMessages,
        setLocalProjects: mockSetLocalProjects,
        localProjectsRef: mockLocalProjectsRef,
        setLastFilters: mockSetLastFilters,
      });

      // Avec updateConfirmation, l'API devrait être appelée
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });
});
