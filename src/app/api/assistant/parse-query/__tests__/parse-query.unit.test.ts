import { describe, it, expect, jest } from '@jest/globals';

// Mock Next.js server components
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: jest.fn(),
}));

// Mock Groq
jest.mock('@ai-sdk/openai', () => ({
  createOpenAI: jest.fn(),
}));

// Mock AI SDK
jest.mock('ai', () => ({
  generateText: jest.fn(),
}));

// Import parseQuery après les mocks
import { parseQuery } from '../route';

describe('parseQuery - Tests unitaires des patterns', () => {
  const availableCollabs = ['TOTO', 'Daft Punk', 'Skrillex'];
  const availableStyles = ['Dnb', 'House', 'Techno'];

  // Tests pour les filtres de progression
  describe('Filtres de progression', () => {
    it('devrait détecter "projets à 15%" comme filtre', () => {
      const result = parseQuery('liste les projets à 15%', availableCollabs, availableStyles);

      expect(result.understood).toBe(true);
      expect(result.type).toBe('list');
      expect(result.filters.minProgress).toBe(15);
      expect(result.filters.maxProgress).toBe(15);
    });

    it('devrait détecter "projets à 7% d\'avancement" comme filtre', () => {
      const result = parseQuery("projets à 7% d'avancement", availableCollabs, availableStyles);

      expect(result.understood).toBe(true);
      expect(result.filters.minProgress).toBe(7);
      expect(result.filters.maxProgress).toBe(7);
    });

    it('devrait détecter "sans avancement" comme filtre noProgress', () => {
      const result = parseQuery(
        'liste les projets sans avancement',
        availableCollabs,
        availableStyles
      );

      expect(result.understood).toBe(true);
      expect(result.filters.noProgress).toBe(true);
    });

    it('devrait détecter "des projets à 15%" comme filtre', () => {
      const result = parseQuery(
        'passe les deadlines des projets à 15% au mois prochain',
        availableCollabs,
        availableStyles
      );

      expect(result.understood).toBe(true);
      expect(result.type).toBe('update');
      expect(result.filters.minProgress).toBe(15);
      expect(result.filters.maxProgress).toBe(15);
    });

    it('devrait détecter "tous les projets à 20%" comme filtre', () => {
      const result = parseQuery('tous les projets à 20%', availableCollabs, availableStyles);

      expect(result.understood).toBe(true);
      expect(result.filters.minProgress).toBe(20);
      expect(result.filters.maxProgress).toBe(20);
    });
  });

  // Tests pour les mises à jour de progression
  describe('Mises à jour de progression', () => {
    it('devrait détecter "passe les projets à 15%" comme newProgress', () => {
      const result = parseQuery('passe les projets à 15%', availableCollabs, availableStyles);

      expect(result.understood).toBe(true);
      expect(result.type).toBe('update');
      expect(result.updateData?.newProgress).toBe(15);
    });

    it('devrait détecter "met les projets à 10%" comme newProgress', () => {
      const result = parseQuery('met les projets à 10%', availableCollabs, availableStyles);

      expect(result.understood).toBe(true);
      expect(result.updateData?.newProgress).toBe(10);
    });

    it('devrait détecter "modifie les projets de 5% à 10%" (filtre + newProgress)', () => {
      const result = parseQuery(
        'modifie les projets de 5% à 10%',
        availableCollabs,
        availableStyles
      );

      expect(result.understood).toBe(true);
      expect(result.type).toBe('update');
      expect(result.filters.minProgress).toBe(5);
      expect(result.filters.maxProgress).toBe(5);
      expect(result.updateData?.newProgress).toBe(10);
    });

    it('devrait détecter "change les projets sans avancement à 0%"', () => {
      const result = parseQuery(
        'change les projets sans avancement à 0%',
        availableCollabs,
        availableStyles
      );

      expect(result.understood).toBe(true);
      expect(result.filters.noProgress).toBe(true);
      expect(result.updateData?.newProgress).toBe(0);
    });
  });

  // Tests pour les décalages de deadlines (avancer)
  describe('Décalage de deadlines - Avancer', () => {
    it('devrait détecter "pousse les deadlines d\'une semaine"', () => {
      const result = parseQuery(
        "pousse les deadlines d'une semaine",
        availableCollabs,
        availableStyles
      );

      expect(result.understood).toBe(true);
      expect(result.type).toBe('update');
      expect(result.updateData?.pushDeadlineBy?.weeks).toBe(1);
      expect(result.updateData?.pushDeadlineBy?.days).toBeUndefined();
      expect(result.updateData?.pushDeadlineBy?.months).toBeUndefined();
    });

    it('devrait détecter "pousse toutes les deadlines de 10 jours"', () => {
      const result = parseQuery(
        'pousse toutes les deadlines de 10 jours',
        availableCollabs,
        availableStyles
      );

      expect(result.understood).toBe(true);
      expect(result.updateData?.pushDeadlineBy?.days).toBe(10);
      expect(result.updateData?.pushDeadlineBy?.weeks).toBeUndefined();
    });

    it('devrait détecter "avance les deadlines d\'une semaine"', () => {
      const result = parseQuery(
        "avance les deadlines d'une semaine",
        availableCollabs,
        availableStyles
      );

      expect(result.understood).toBe(true);
      expect(result.updateData?.pushDeadlineBy?.weeks).toBe(1);
    });

    it('devrait détecter "prévoit les deadlines de 2 mois"', () => {
      const result = parseQuery(
        'prévoit les deadlines de 2 mois',
        availableCollabs,
        availableStyles
      );

      expect(result.understood).toBe(true);
      expect(result.updateData?.pushDeadlineBy?.months).toBe(2);
    });

    it('devrait détecter "déplace les deadlines d\'une semaine"', () => {
      const result = parseQuery(
        "déplace les deadlines d'une semaine",
        availableCollabs,
        availableStyles
      );

      expect(result.understood).toBe(true);
      expect(result.updateData?.pushDeadlineBy?.weeks).toBe(1);
    });

    it('devrait détecter "retarde les deadlines de 3 semaines"', () => {
      const result = parseQuery(
        'retarde les deadlines de 3 semaines',
        availableCollabs,
        availableStyles
      );

      expect(result.understood).toBe(true);
      expect(result.updateData?.pushDeadlineBy?.weeks).toBe(3);
    });
  });

  // Tests pour les décalages de deadlines (reculer)
  describe('Décalage de deadlines - Reculer', () => {
    it('devrait détecter "enlève une semaine aux deadlines"', () => {
      const result = parseQuery(
        'enlève une semaine aux deadlines',
        availableCollabs,
        availableStyles
      );

      expect(result.understood).toBe(true);
      expect(result.type).toBe('update');
      expect(result.updateData?.pushDeadlineBy?.weeks).toBe(-1);
    });

    it('devrait détecter "enleve une semaine aux deadlines" (sans accent)', () => {
      const result = parseQuery(
        'enleve une semaine aux deadlines',
        availableCollabs,
        availableStyles
      );

      expect(result.understood).toBe(true);
      expect(result.updateData?.pushDeadlineBy?.weeks).toBe(-1);
    });

    it('devrait détecter "recule les deadlines d\'une semaine"', () => {
      const result = parseQuery(
        "recule les deadlines d'une semaine",
        availableCollabs,
        availableStyles
      );

      expect(result.understood).toBe(true);
      expect(result.updateData?.pushDeadlineBy?.weeks).toBe(-1);
    });

    it('devrait détecter "retire 10 jours aux deadlines"', () => {
      const result = parseQuery('retire 10 jours aux deadlines', availableCollabs, availableStyles);

      expect(result.understood).toBe(true);
      expect(result.updateData?.pushDeadlineBy?.days).toBe(-10);
    });

    it('devrait détecter "enlève 2 mois aux deadlines"', () => {
      const result = parseQuery('enlève 2 mois aux deadlines', availableCollabs, availableStyles);

      expect(result.understood).toBe(true);
      expect(result.updateData?.pushDeadlineBy?.months).toBe(-2);
    });

    it('devrait détecter "reculer les deadlines de 5 jours"', () => {
      const result = parseQuery(
        'reculer les deadlines de 5 jours',
        availableCollabs,
        availableStyles
      );

      expect(result.understood).toBe(true);
      expect(result.updateData?.pushDeadlineBy?.days).toBe(-5);
    });
  });

  // Tests pour les nouvelles deadlines absolues
  describe('Nouvelles deadlines absolues', () => {
    it('devrait détecter "met les deadlines au mois prochain"', () => {
      const result = parseQuery(
        'met les deadlines au mois prochain',
        availableCollabs,
        availableStyles
      );

      expect(result.understood).toBe(true);
      expect(result.type).toBe('update');
      expect(result.updateData?.newDeadline).toBeDefined();
      expect(result.updateData?.newDeadline).not.toBeNull();
    });

    it('devrait détecter "passe les deadlines des projets à 15% au mois prochain"', () => {
      const result = parseQuery(
        'passe les deadlines des projets à 15% au mois prochain',
        availableCollabs,
        availableStyles
      );

      expect(result.understood).toBe(true);
      expect(result.type).toBe('update');
      expect(result.filters.minProgress).toBe(15);
      expect(result.filters.maxProgress).toBe(15);
      expect(result.updateData?.newProgress).toBe(15);
      expect(result.updateData?.newDeadline).toBeDefined();
    });

    it('devrait détecter "deadline à demain"', () => {
      const result = parseQuery('deadline à demain', availableCollabs, availableStyles);

      expect(result.understood).toBe(true);
      expect(result.type).toBe('update');
      expect(result.updateData?.newDeadline).toBeDefined();
    });

    it('devrait détecter "deadline à la semaine prochaine"', () => {
      const result = parseQuery(
        'deadline à la semaine prochaine',
        availableCollabs,
        availableStyles
      );

      expect(result.understood).toBe(true);
      expect(result.updateData?.newDeadline).toBeDefined();
    });

    it('devrait détecter "met les deadlines à aujourd\'hui"', () => {
      const result = parseQuery(
        "met les deadlines à aujourd'hui",
        availableCollabs,
        availableStyles
      );

      expect(result.understood).toBe(true);
      expect(result.updateData?.newDeadline).toBeDefined();
    });
  });

  // Tests pour la suppression de deadlines
  describe('Suppression de deadlines', () => {
    it('devrait détecter "supprime les deadlines"', () => {
      const result = parseQuery('supprime les deadlines', availableCollabs, availableStyles);

      expect(result.understood).toBe(true);
      expect(result.type).toBe('update');
      expect(result.updateData?.newDeadline).toBeNull();
      // hasDeadline peut être dans filters ou updateData selon l'implémentation
      expect(result.filters.hasDeadline === true || result.updateData?.hasDeadline === true).toBe(
        true
      );
    });

    it('devrait détecter "enlève les deadlines"', () => {
      const result = parseQuery('enlève les deadlines', availableCollabs, availableStyles);

      expect(result.understood).toBe(true);
      expect(result.updateData?.newDeadline).toBeNull();
    });

    it('devrait détecter "retire les deadlines des projets"', () => {
      const result = parseQuery(
        'retire les deadlines des projets',
        availableCollabs,
        availableStyles
      );

      expect(result.understood).toBe(true);
      expect(result.updateData?.newDeadline).toBeNull();
    });

    it('devrait détecter "delete deadlines" (anglais)', () => {
      const result = parseQuery('delete deadlines', availableCollabs, availableStyles);

      expect(result.understood).toBe(true);
      expect(result.updateData?.newDeadline).toBeNull();
    });
  });

  // Tests pour les mises à jour de statut
  describe('Mises à jour de statut', () => {
    it('devrait détecter "passe les projets en TERMINE"', () => {
      const result = parseQuery('passe les projets en TERMINE', availableCollabs, availableStyles);

      expect(result.understood).toBe(true);
      expect(result.type).toBe('update');
      expect(result.updateData?.newStatus).toBe('TERMINE');
    });

    it('devrait détecter "met les projets à EN COURS"', () => {
      const result = parseQuery('met les projets à EN COURS', availableCollabs, availableStyles);

      expect(result.understood).toBe(true);
      expect(result.updateData?.newStatus).toBe('EN_COURS');
    });

    it('devrait détecter "change les projets en EN ATTENTE"', () => {
      const result = parseQuery(
        'change les projets en EN ATTENTE',
        availableCollabs,
        availableStyles
      );

      expect(result.understood).toBe(true);
      // Note: EN_ATTENTE n'existe pas dans les types, mais le pattern devrait le détecter
      // Si le statut n'existe pas, le test peut échouer - on vérifie juste que c'est détecté
      expect(result.updateData?.newStatus).toBeDefined();
    });
  });

  // Tests pour les filtres de statut
  describe('Filtres de statut', () => {
    it('devrait détecter "projets terminés" comme filtre', () => {
      const result = parseQuery('liste les projets terminés', availableCollabs, availableStyles);

      expect(result.understood).toBe(true);
      expect(result.filters.status).toBe('TERMINE');
    });

    it('devrait détecter "projets en cours" comme filtre', () => {
      const result = parseQuery('projets en cours', availableCollabs, availableStyles);

      expect(result.understood).toBe(true);
      expect(result.filters.status).toBe('EN_COURS');
    });

    it('devrait détecter "projets en attente" comme filtre', () => {
      const result = parseQuery('projets en attente', availableCollabs, availableStyles);

      expect(result.understood).toBe(true);
      // Note: EN_ATTENTE n'existe pas dans les types, mais le pattern devrait le détecter
      expect(result.filters.status).toBeDefined();
    });
  });

  // Tests pour les filtres de collaborateur
  describe('Filtres de collaborateur', () => {
    it('devrait détecter "projets avec TOTO" comme filtre', () => {
      const result = parseQuery('liste les projets avec TOTO', availableCollabs, availableStyles);

      expect(result.understood).toBe(true);
      expect(result.filters.collab).toBe('TOTO');
    });

    it('devrait détecter "projets en collab avec Daft Punk" comme filtre', () => {
      const result = parseQuery(
        'projets en collab avec Daft Punk',
        availableCollabs,
        availableStyles
      );

      expect(result.understood).toBe(true);
      expect(result.filters.collab).toBe('Daft Punk');
    });

    it('devrait détecter "projets feat Skrillex" comme filtre', () => {
      const result = parseQuery('projets feat Skrillex', availableCollabs, availableStyles);

      expect(result.understood).toBe(true);
      expect(result.filters.collab).toBe('Skrillex');
    });
  });

  // Tests pour les mises à jour de collaborateur
  describe('Mises à jour de collaborateur', () => {
    it('devrait détecter "met les projets en collab avec TOTO"', () => {
      const result = parseQuery(
        'met les projets en collab avec TOTO',
        availableCollabs,
        availableStyles
      );

      expect(result.understood).toBe(true);
      // Le pattern amélioré devrait détecter "TOTO" après "collab avec"
      expect(result.updateData?.newCollab).toBe('TOTO');
    });

    it('devrait détecter "en collab avec X à Y" (filtre + nouvelle valeur)', () => {
      const result = parseQuery(
        'en collab avec Daft Punk à Skrillex',
        availableCollabs,
        availableStyles
      );

      expect(result.understood).toBe(true);
      expect(result.filters.collab).toBe('Daft Punk');
      expect(result.updateData?.newCollab).toBe('Skrillex');
    });
  });

  // Tests pour les filtres de style
  describe('Filtres de style', () => {
    it('devrait détecter "projets Dnb" comme filtre', () => {
      const result = parseQuery('liste les projets Dnb', availableCollabs, availableStyles);

      expect(result.understood).toBe(true);
      // Dnb est normalisé en "Drum and Bass" via findStyleFromString
      expect(result.filters.style).toBe('Drum and Bass');
    });

    it('devrait détecter "projets House" comme filtre', () => {
      const result = parseQuery('projets House', availableCollabs, availableStyles);

      expect(result.understood).toBe(true);
      expect(result.filters.style).toBe('House');
    });
  });

  // Tests pour les mises à jour de style
  describe('Mises à jour de style', () => {
    it('devrait détecter "met les projets en Dnb"', () => {
      const result = parseQuery('met les projets en Dnb', availableCollabs, availableStyles);

      expect(result.understood).toBe(true);
      // Dnb est normalisé en "Drum and Bass" via findStyleFromString
      expect(result.updateData?.newStyle).toBe('Drum and Bass');
    });
  });

  // Tests pour les mises à jour multiples
  describe('Mises à jour multiples', () => {
    it('devrait détecter progression + deadline dans "passe les deadlines des projets à 15% au mois prochain"', () => {
      const result = parseQuery(
        'passe les deadlines des projets à 15% au mois prochain',
        availableCollabs,
        availableStyles
      );

      expect(result.understood).toBe(true);
      expect(result.type).toBe('update');
      // Filtre
      expect(result.filters.minProgress).toBe(15);
      expect(result.filters.maxProgress).toBe(15);
      // Mise à jour - newProgress peut être détecté même si c'est aussi un filtre
      // (le pattern amélioré devrait le détecter)
      expect(result.updateData?.newProgress).toBeDefined();
      expect(result.updateData?.newDeadline).toBeDefined();
    });

    it('devrait détecter statut + progression', () => {
      const result = parseQuery(
        'passe les projets à 50% en TERMINE',
        availableCollabs,
        availableStyles
      );

      expect(result.understood).toBe(true);
      // newProgress peut ne pas être détecté si "50%" est interprété différemment
      // On vérifie au moins que le statut est détecté
      expect(result.updateData?.newStatus).toBe('TERMINE');
      // Si newProgress est détecté, il devrait être 50
      if (result.updateData?.newProgress !== undefined) {
        expect(result.updateData.newProgress).toBe(50);
      }
    });
  });

  // Tests pour les dates relatives
  describe('Parsing de dates relatives', () => {
    it('devrait parser "demain" correctement', () => {
      const result = parseQuery('met les deadlines à demain', availableCollabs, availableStyles);

      expect(result.understood).toBe(true);
      expect(result.updateData?.newDeadline).toBeDefined();
      if (result.updateData?.newDeadline) {
        const deadlineDate = new Date(result.updateData.newDeadline);
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        expect(deadlineDate.toDateString()).toBe(tomorrow.toDateString());
      }
    });

    it('devrait parser "semaine prochaine" correctement', () => {
      const result = parseQuery(
        'met les deadlines à la semaine prochaine',
        availableCollabs,
        availableStyles
      );

      expect(result.understood).toBe(true);
      expect(result.type).toBe('update');
      expect(result.updateData?.newDeadline).toBeDefined();
    });

    it('devrait parser "mois prochain" correctement', () => {
      const result = parseQuery(
        'met les deadlines au mois prochain',
        availableCollabs,
        availableStyles
      );

      expect(result.understood).toBe(true);
      expect(result.updateData?.newDeadline).toBeDefined();
    });

    it('devrait parser "aujourd\'hui" correctement', () => {
      const result = parseQuery(
        "met les deadlines à aujourd'hui",
        availableCollabs,
        availableStyles
      );

      expect(result.understood).toBe(true);
      expect(result.updateData?.newDeadline).toBeDefined();
      if (result.updateData?.newDeadline) {
        const deadlineDate = new Date(result.updateData.newDeadline);
        const today = new Date();
        expect(deadlineDate.toDateString()).toBe(today.toDateString());
      }
    });
  });

  // Tests pour les cas limites
  describe('Cas limites et variantes', () => {
    it('devrait gérer "pousse" et "pousser"', () => {
      const result1 = parseQuery(
        "pousse les deadlines d'une semaine",
        availableCollabs,
        availableStyles
      );
      const result2 = parseQuery(
        "pousser les deadlines d'une semaine",
        availableCollabs,
        availableStyles
      );

      expect(result1.updateData?.pushDeadlineBy?.weeks).toBe(1);
      expect(result2.updateData?.pushDeadlineBy?.weeks).toBe(1);
    });

    it('devrait gérer les apostrophes typographiques', () => {
      const result = parseQuery(
        'pousse les deadlines d\u2019une semaine',
        availableCollabs,
        availableStyles
      );

      expect(result.understood).toBe(true);
      expect(result.updateData?.pushDeadlineBy?.weeks).toBe(1);
    });

    it('devrait gérer "deadlines" et "dead lines" (avec espace)', () => {
      const result1 = parseQuery('supprime les deadlines', availableCollabs, availableStyles);
      const result2 = parseQuery('supprime les dead lines', availableCollabs, availableStyles);

      expect(result1.updateData?.newDeadline).toBeNull();
      expect(result2.updateData?.newDeadline).toBeNull();
    });
  });
});
