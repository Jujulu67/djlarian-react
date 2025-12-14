import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock Next.js server components AVANT les imports
jest.mock('next/server', () => {
  const mockRequest = class MockRequest {
    json = jest.fn();
    constructor(
      public url: string,
      public init?: any
    ) {}
  };
  return {
    NextRequest: mockRequest,
    NextResponse: {
      json: jest.fn((data, init) => ({
        json: async () => data,
        status: init?.status || 200,
      })),
    },
  };
});

// Mock Groq
const mockGenerateText = jest.fn().mockResolvedValue({
  text: 'Réponse conversationnelle de test',
});

jest.mock('@ai-sdk/openai', () => ({
  createOpenAI: jest.fn(() => ({
    chat: {
      completions: {
        create: jest.fn(),
      },
    },
  })),
}));

jest.mock('ai', () => ({
  generateText: (...args: unknown[]) => mockGenerateText(...args),
}));

// Import après les mocks
import { POST } from '../route';
import { NextRequest } from 'next/server';

describe("parseQuery API - Tests unitaires et d'intégration", () => {
  const availableCollabs = ['TOTO', 'Daft Punk', 'Skrillex'];
  const availableStyles = ['Dnb', 'House', 'Techno'];

  const createRequest = (query: string, context?: any) => {
    const request = new NextRequest('http://localhost/api/assistant/parse-query', {
      method: 'POST',
      body: JSON.stringify({
        query,
        context: context || {
          availableCollabs,
          availableStyles,
          projectCount: 42,
        },
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    });
    // Mock la méthode json() pour retourner le body parsé
    request.json = jest.fn().mockResolvedValue({
      query,
      context: context || {
        availableCollabs,
        availableStyles,
        projectCount: 42,
      },
    });
    return request;
  };

  // Tests pour les filtres de progression
  describe('Filtres de progression', () => {
    it('devrait détecter "projets à 15%" comme filtre', async () => {
      const request = createRequest('liste les projets à 15%');
      const response = await POST(request);
      const data = await response.json();

      expect(data.understood).toBe(true);
      expect(data.type).toBe('list');
      expect(data.filters.minProgress).toBe(15);
      expect(data.filters.maxProgress).toBe(15);
    });

    it('devrait détecter "projets à 7% d\'avancement" comme filtre', async () => {
      const request = createRequest("projets à 7% d'avancement");
      const response = await POST(request);
      const data = await response.json();

      expect(data.understood).toBe(true);
      expect(data.filters.minProgress).toBe(7);
      expect(data.filters.maxProgress).toBe(7);
    });

    it('devrait détecter "sans avancement" comme filtre noProgress', async () => {
      const request = createRequest('liste les projets sans avancement');
      const response = await POST(request);
      const data = await response.json();

      expect(data.understood).toBe(true);
      expect(data.filters.noProgress).toBe(true);
    });

    it('devrait détecter "des projets à 15%" comme filtre', async () => {
      const request = createRequest('passe les deadlines des projets à 15% au mois prochain');
      const response = await POST(request);
      const data = await response.json();

      expect(data.understood).toBe(true);
      expect(data.type).toBe('update');
      expect(data.filters.minProgress).toBe(15);
      expect(data.filters.maxProgress).toBe(15);
    });
  });

  // Tests pour les mises à jour de progression
  describe('Mises à jour de progression', () => {
    it('devrait détecter "passe les projets à 15%" comme newProgress', async () => {
      const request = createRequest('passe les projets à 15%');
      const response = await POST(request);
      const data = await response.json();

      expect(data.understood).toBe(true);
      expect(data.type).toBe('update');
      expect(data.updateData?.newProgress).toBe(15);
    });

    it('devrait détecter "met les projets à 10%" comme newProgress', async () => {
      const request = createRequest('met les projets à 10%');
      const response = await POST(request);
      const data = await response.json();

      expect(data.understood).toBe(true);
      expect(data.updateData?.newProgress).toBe(10);
    });

    it('devrait détecter "modifie les projets de 5% à 10%" (filtre + newProgress)', async () => {
      const request = createRequest('modifie les projets de 5% à 10%');
      const response = await POST(request);
      const data = await response.json();

      expect(data.understood).toBe(true);
      expect(data.type).toBe('update');
      expect(data.filters.minProgress).toBe(5);
      expect(data.filters.maxProgress).toBe(5);
      expect(data.updateData?.newProgress).toBe(10);
    });
  });

  // Tests pour les décalages de deadlines (avancer)
  describe('Décalage de deadlines - Avancer', () => {
    it('devrait détecter "pousse les deadlines d\'une semaine"', async () => {
      const request = createRequest("pousse les deadlines d'une semaine");
      const response = await POST(request);
      const data = await response.json();

      expect(data.understood).toBe(true);
      expect(data.type).toBe('update');
      expect(data.updateData?.pushDeadlineBy?.weeks).toBe(1);
      expect(data.updateData?.pushDeadlineBy?.days).toBeUndefined();
      expect(data.updateData?.pushDeadlineBy?.months).toBeUndefined();
    });

    it('devrait détecter "pousse toutes les deadlines de 10 jours"', async () => {
      const request = createRequest('pousse toutes les deadlines de 10 jours');
      const response = await POST(request);
      const data = await response.json();

      expect(data.understood).toBe(true);
      expect(data.updateData?.pushDeadlineBy?.days).toBe(10);
      expect(data.updateData?.pushDeadlineBy?.weeks).toBeUndefined();
    });

    it('devrait détecter "avance les deadlines d\'une semaine"', async () => {
      const request = createRequest("avance les deadlines d'une semaine");
      const response = await POST(request);
      const data = await response.json();

      expect(data.understood).toBe(true);
      expect(data.updateData?.pushDeadlineBy?.weeks).toBe(1);
    });

    it('devrait détecter "prévoit les deadlines de 2 mois"', async () => {
      const request = createRequest('prévoit les deadlines de 2 mois');
      const response = await POST(request);
      const data = await response.json();

      expect(data.understood).toBe(true);
      expect(data.updateData?.pushDeadlineBy?.months).toBe(2);
    });

    it('devrait détecter "déplace les deadlines d\'une semaine"', async () => {
      const request = createRequest("déplace les deadlines d'une semaine");
      const response = await POST(request);
      const data = await response.json();

      expect(data.understood).toBe(true);
      expect(data.updateData?.pushDeadlineBy?.weeks).toBe(1);
    });
  });

  // Tests pour les décalages de deadlines (reculer)
  describe('Décalage de deadlines - Reculer', () => {
    it('devrait détecter "enlève une semaine aux deadlines"', async () => {
      const request = createRequest('enlève une semaine aux deadlines');
      const response = await POST(request);
      const data = await response.json();

      expect(data.understood).toBe(true);
      expect(data.type).toBe('update');
      expect(data.updateData?.pushDeadlineBy?.weeks).toBe(-1);
    });

    it('devrait détecter "enleve une semaine aux deadlines" (sans accent)', async () => {
      const request = createRequest('enleve une semaine aux deadlines');
      const response = await POST(request);
      const data = await response.json();

      expect(data.understood).toBe(true);
      expect(data.updateData?.pushDeadlineBy?.weeks).toBe(-1);
    });

    it('devrait détecter "recule les deadlines d\'une semaine"', async () => {
      const request = createRequest("recule les deadlines d'une semaine");
      const response = await POST(request);
      const data = await response.json();

      expect(data.understood).toBe(true);
      expect(data.updateData?.pushDeadlineBy?.weeks).toBe(-1);
    });

    it('devrait détecter "retire 10 jours aux deadlines"', async () => {
      const request = createRequest('retire 10 jours aux deadlines');
      const response = await POST(request);
      const data = await response.json();

      expect(data.understood).toBe(true);
      expect(data.updateData?.pushDeadlineBy?.days).toBe(-10);
    });

    it('devrait détecter "enlève 2 mois aux deadlines"', async () => {
      const request = createRequest('enlève 2 mois aux deadlines');
      const response = await POST(request);
      const data = await response.json();

      expect(data.understood).toBe(true);
      expect(data.updateData?.pushDeadlineBy?.months).toBe(-2);
    });
  });

  // Tests pour les nouvelles deadlines absolues
  describe('Nouvelles deadlines absolues', () => {
    it('devrait détecter "met les deadlines au mois prochain"', async () => {
      const request = createRequest('met les deadlines au mois prochain');
      const response = await POST(request);
      const data = await response.json();

      expect(data.understood).toBe(true);
      expect(data.type).toBe('update');
      expect(data.updateData?.newDeadline).toBeDefined();
      // La date devrait être dans environ 1 mois
      if (data.updateData?.newDeadline) {
        const deadlineDate = new Date(data.updateData.newDeadline);
        const now = new Date();
        const diffMonths =
          (deadlineDate.getFullYear() - now.getFullYear()) * 12 +
          (deadlineDate.getMonth() - now.getMonth());
        expect(diffMonths).toBeGreaterThanOrEqual(0);
        expect(diffMonths).toBeLessThanOrEqual(2);
      }
    });

    it('devrait détecter "passe les deadlines des projets à 15% au mois prochain"', async () => {
      const request = createRequest('passe les deadlines des projets à 15% au mois prochain');
      const response = await POST(request);
      const data = await response.json();

      expect(data.understood).toBe(true);
      expect(data.type).toBe('update');
      expect(data.filters.minProgress).toBe(15);
      expect(data.filters.maxProgress).toBe(15);
      expect(data.updateData?.newProgress).toBe(15);
      expect(data.updateData?.newDeadline).toBeDefined();
    });

    it('devrait détecter "deadline à demain"', async () => {
      const request = createRequest('deadline à demain');
      const response = await POST(request);
      const data = await response.json();

      expect(data.understood).toBe(true);
      expect(data.updateData?.newDeadline).toBeDefined();
      if (data.updateData?.newDeadline) {
        const deadlineDate = new Date(data.updateData.newDeadline);
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        expect(deadlineDate.toDateString()).toBe(tomorrow.toDateString());
      }
    });

    it('devrait détecter "deadline à la semaine prochaine"', async () => {
      const request = createRequest('deadline à la semaine prochaine');
      const response = await POST(request);
      const data = await response.json();

      expect(data.understood).toBe(true);
      expect(data.updateData?.newDeadline).toBeDefined();
    });
  });

  // Tests pour la suppression de deadlines
  describe('Suppression de deadlines', () => {
    it('devrait détecter "supprime les deadlines"', async () => {
      const request = createRequest('supprime les deadlines');
      const response = await POST(request);
      const data = await response.json();

      expect(data.understood).toBe(true);
      expect(data.type).toBe('update');
      expect(data.updateData?.newDeadline).toBeNull();
      // hasDeadline peut être dans filters ou updateData selon l'implémentation
      expect(data.filters.hasDeadline === true || data.updateData?.hasDeadline === true).toBe(true);
    });

    it('devrait détecter "enlève les deadlines"', async () => {
      const request = createRequest('enlève les deadlines');
      const response = await POST(request);
      const data = await response.json();

      expect(data.understood).toBe(true);
      expect(data.updateData?.newDeadline).toBeNull();
    });

    it('devrait détecter "retire les deadlines des projets"', async () => {
      const request = createRequest('retire les deadlines des projets');
      const response = await POST(request);
      const data = await response.json();

      expect(data.understood).toBe(true);
      expect(data.updateData?.newDeadline).toBeNull();
    });
  });

  // Tests pour les mises à jour de statut
  describe('Mises à jour de statut', () => {
    it('devrait détecter "passe les projets en TERMINE"', async () => {
      const request = createRequest('passe les projets en TERMINE');
      const response = await POST(request);
      const data = await response.json();

      expect(data.understood).toBe(true);
      expect(data.type).toBe('update');
      expect(data.updateData?.newStatus).toBe('TERMINE');
    });

    it('devrait détecter "met les projets à EN COURS"', async () => {
      const request = createRequest('met les projets à EN COURS');
      const response = await POST(request);
      const data = await response.json();

      expect(data.understood).toBe(true);
      expect(data.updateData?.newStatus).toBe('EN_COURS');
    });
  });

  // Tests pour les filtres de statut
  describe('Filtres de statut', () => {
    it('devrait détecter "projets terminés" comme filtre', async () => {
      const request = createRequest('liste les projets terminés');
      const response = await POST(request);
      const data = await response.json();

      expect(data.understood).toBe(true);
      expect(data.filters.status).toBe('TERMINE');
    });

    it('devrait détecter "projets en cours" comme filtre', async () => {
      const request = createRequest('projets en cours');
      const response = await POST(request);
      const data = await response.json();

      expect(data.understood).toBe(true);
      expect(data.filters.status).toBe('EN_COURS');
    });
  });

  // Tests pour les filtres de collaborateur
  describe('Filtres de collaborateur', () => {
    it('devrait détecter "projets avec TOTO" comme filtre', async () => {
      const request = createRequest('liste les projets avec TOTO');
      const response = await POST(request);
      const data = await response.json();

      expect(data.understood).toBe(true);
      expect(data.filters.collab).toBe('TOTO');
    });

    it('devrait détecter "projets en collab avec Daft Punk" comme filtre', async () => {
      const request = createRequest('projets en collab avec Daft Punk');
      const response = await POST(request);
      const data = await response.json();

      expect(data.understood).toBe(true);
      expect(data.filters.collab).toBe('Daft Punk');
    });
  });

  // Tests pour les mises à jour de collaborateur
  describe('Mises à jour de collaborateur', () => {
    it('devrait détecter "met les projets en collab avec TOTO"', async () => {
      const request = createRequest('met les projets en collab avec TOTO');
      const response = await POST(request);
      const data = await response.json();

      expect(data.understood).toBe(true);
      expect(data.updateData?.newCollab).toBe('TOTO');
    });
  });

  // Tests pour les filtres de style
  describe('Filtres de style', () => {
    it('devrait détecter "projets Dnb" comme filtre', async () => {
      const request = createRequest('liste les projets Dnb');
      const response = await POST(request);
      const data = await response.json();

      expect(data.understood).toBe(true);
      // Dnb est normalisé en "Drum and Bass" via findStyleFromString
      expect(data.filters.style).toBe('Drum and Bass');
    });
  });

  // Tests pour les mises à jour multiples
  describe('Mises à jour multiples', () => {
    it('devrait détecter progression + deadline dans "passe les deadlines des projets à 15% au mois prochain"', async () => {
      const request = createRequest('passe les deadlines des projets à 15% au mois prochain');
      const response = await POST(request);
      const data = await response.json();

      expect(data.understood).toBe(true);
      expect(data.type).toBe('update');
      expect(data.filters.minProgress).toBe(15);
      expect(data.updateData?.newProgress).toBe(15);
      expect(data.updateData?.newDeadline).toBeDefined();
    });
  });

  // Tests pour les requêtes non comprises
  describe('Requêtes non comprises', () => {
    it('devrait retourner isConversational pour une question générale', async () => {
      const request = createRequest('comment ça va ?');
      const response = await POST(request);
      const data = await response.json();

      // Soit understood: false, soit isConversational: true
      expect(data.isConversational || !data.understood).toBe(true);
    });
  });

  // Tests pour les dates relatives
  describe('Parsing de dates relatives', () => {
    it('devrait parser "demain" correctement', async () => {
      const request = createRequest('met les deadlines à demain');
      const response = await POST(request);
      const data = await response.json();

      expect(data.understood).toBe(true);
      expect(data.updateData?.newDeadline).toBeDefined();
    });

    it('devrait parser "semaine prochaine" correctement', async () => {
      const request = createRequest('met les deadlines à la semaine prochaine');
      const response = await POST(request);
      const data = await response.json();

      expect(data.understood).toBe(true);
      expect(data.updateData?.newDeadline).toBeDefined();
    });

    it('devrait parser "mois prochain" correctement', async () => {
      const request = createRequest('met les deadlines au mois prochain');
      const response = await POST(request);
      const data = await response.json();

      expect(data.understood).toBe(true);
      expect(data.updateData?.newDeadline).toBeDefined();
    });
  });

  // Tests d'intégration - scénarios complets
  describe("Tests d'intégration - Scénarios complets", () => {
    it('devrait gérer un scénario complet: filtre + mise à jour progression + deadline', async () => {
      const request = createRequest('passe les deadlines des projets à 15% au mois prochain');
      const response = await POST(request);
      const data = await response.json();

      expect(data.understood).toBe(true);
      expect(data.type).toBe('update');
      // Filtre
      expect(data.filters.minProgress).toBe(15);
      expect(data.filters.maxProgress).toBe(15);
      // Mise à jour
      expect(data.updateData?.newProgress).toBe(15);
      expect(data.updateData?.newDeadline).toBeDefined();
    });

    it('devrait gérer "enlève une semaine aux deadlines" puis "supprime les deadlines"', async () => {
      // Premier appel
      const request1 = createRequest('enlève une semaine aux deadlines');
      const response1 = await POST(request1);
      const data1 = await response1.json();

      expect(data1.understood).toBe(true);
      expect(data1.updateData?.pushDeadlineBy?.weeks).toBe(-1);

      // Deuxième appel
      const request2 = createRequest('supprime les deadlines');
      const response2 = await POST(request2);
      const data2 = await response2.json();

      expect(data2.understood).toBe(true);
      expect(data2.updateData?.newDeadline).toBeNull();
    });
  });
});
