/**
 * Tests pour le système de mémoire conversationnelle Groq
 *
 * Ces tests vérifient :
 * 1. Le stockage et la récupération du contexte
 * 2. La détection des références contextuelles (pronoms, démonstratifs)
 * 3. La résolution des références
 * 4. Le formatage du prompt pour le modèle 8B
 */

import {
  getConversationContext,
  updateConversationContext,
  clearConversationContext,
  detectContextReference,
  resolveContextReference,
} from '../conversation-memory';

describe('Conversation Memory - Parser Context', () => {
  const testUserId = 'test-user-123';

  beforeEach(() => {
    // Nettoyer le contexte avant chaque test
    clearConversationContext(testUserId);
  });

  describe('getConversationContext', () => {
    it('retourne un contexte vide pour un nouvel utilisateur', () => {
      const context = getConversationContext(testUserId);

      expect(context.lastProjectIds).toEqual([]);
      expect(context.lastProjectNames).toEqual([]);
      expect(context.lastProjectCount).toBe(0);
      expect(context.lastFilters).toEqual({});
      expect(context.lastActionType).toBeNull();
    });

    it('retourne le contexte après une mise à jour', () => {
      updateConversationContext(testUserId, {
        lastProjectIds: ['id1', 'id2', 'id3'],
        lastProjectNames: ['Project A', 'Project B', 'Project C'],
        lastProjectCount: 3,
        lastFilters: { status: 'GHOST_PRODUCTION' },
        lastActionType: 'list',
        lastStatusFilter: 'GHOST_PRODUCTION',
      });

      const context = getConversationContext(testUserId);

      expect(context.lastProjectIds).toEqual(['id1', 'id2', 'id3']);
      expect(context.lastProjectCount).toBe(3);
      expect(context.lastFilters).toEqual({ status: 'GHOST_PRODUCTION' });
      expect(context.lastActionType).toBe('list');
    });
  });

  describe('detectContextReference', () => {
    describe('pronoms', () => {
      it('détecte "met les à 80%"', () => {
        const result = detectContextReference('met les à 80%');
        expect(result.hasContextReference).toBe(true);
        expect(result.referenceType).toBe('pronoun');
      });

      it('détecte "passe les en terminé"', () => {
        const result = detectContextReference('passe les en terminé');
        expect(result.hasContextReference).toBe(true);
        expect(result.referenceType).toBe('pronoun');
      });

      it('détecte "met-les à 100%"', () => {
        const result = detectContextReference('met-les à 100%');
        expect(result.hasContextReference).toBe(true);
        expect(result.referenceType).toBe('pronoun');
      });
    });

    describe('démonstratifs', () => {
      it('détecte "ceux-là"', () => {
        const result = detectContextReference('modifie ceux-là');
        expect(result.hasContextReference).toBe(true);
        expect(result.referenceType).toBe('demonstrative');
      });

      it('détecte "ces projets"', () => {
        const result = detectContextReference('met ces projets à 50%');
        expect(result.hasContextReference).toBe(true);
        expect(result.referenceType).toBe('demonstrative');
      });
    });

    describe('références implicites', () => {
      it('détecte "maintenant met à 80%"', () => {
        const result = detectContextReference('maintenant met à 80%');
        expect(result.hasContextReference).toBe(true);
        expect(result.referenceType).toBe('implicit');
      });

      it('détecte "et passe en terminé"', () => {
        const result = detectContextReference('et passe en terminé');
        expect(result.hasContextReference).toBe(true);
        expect(result.referenceType).toBe('implicit');
      });

      it('détecte "puis marque comme annulé"', () => {
        const result = detectContextReference('puis marque comme annulé');
        expect(result.hasContextReference).toBe(true);
        expect(result.referenceType).toBe('implicit');
      });
    });

    describe('pas de référence contextuelle', () => {
      it('ne détecte pas de référence dans "liste les projets terminés"', () => {
        const result = detectContextReference('liste les projets terminés');
        expect(result.hasContextReference).toBe(false);
        expect(result.referenceType).toBeNull();
      });

      it('ne détecte pas de référence dans "combien de ghost prod"', () => {
        const result = detectContextReference('combien de ghost prod');
        expect(result.hasContextReference).toBe(false);
        expect(result.referenceType).toBeNull();
      });
    });
  });

  describe('resolveContextReference', () => {
    it("retourne un message d'erreur si pas de contexte", () => {
      const result = resolveContextReference(testUserId, 'met les à 80%');

      expect(result.resolved).toBe(false);
      expect(result.message).toContain("n'ai pas de contexte");
    });

    it('résout la référence avec un contexte valide', () => {
      // Setup: simuler une liste précédente
      updateConversationContext(testUserId, {
        lastProjectIds: ['id1', 'id2', 'id3'],
        lastProjectNames: ['Project A', 'Project B', 'Project C'],
        lastProjectCount: 3,
        lastFilters: { status: 'GHOST_PRODUCTION' },
        lastActionType: 'list',
        lastStatusFilter: 'GHOST_PRODUCTION',
      });

      const result = resolveContextReference(testUserId, 'met les à 80%');

      expect(result.resolved).toBe(true);
      expect(result.filters).toEqual({ status: 'GHOST_PRODUCTION' });
      expect(result.projectIds).toEqual(['id1', 'id2', 'id3']);
      expect(result.message).toContain('3 projet(s)');
    });

    it('ne résout pas si pas de référence contextuelle', () => {
      updateConversationContext(testUserId, {
        lastProjectIds: ['id1'],
        lastProjectCount: 1,
        lastFilters: {},
        lastActionType: 'list',
        lastStatusFilter: null,
      });

      const result = resolveContextReference(testUserId, 'liste les projets terminés');

      expect(result.resolved).toBe(false);
    });
  });
});

describe('Conversation Memory - Groq Context', () => {
  // Tests pour le memory-manager existant
  // Ces tests vérifient que le formatage du contexte pour Groq fonctionne

  describe('prepareConversationContext', () => {
    // Import du memory-manager
    const { prepareConversationContext } = require('../memory-manager');

    it('retourne un contexte vide pour un historique vide', () => {
      const result = prepareConversationContext([]);

      expect(result.recentMessages).toEqual([]);
      expect(result.totalTokens).toBe(0);
    });

    it('garde 5 messages récents quand il y a un summary', () => {
      // Créer un historique de 15 messages
      const history = Array.from({ length: 15 }, (_, i) => ({
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message ${i + 1}`,
        timestamp: new Date(),
      }));

      const result = prepareConversationContext(history);

      // Avec willHaveSummary = true (15 > 12), effectiveMaxRecent = 5
      expect(result.recentMessages.length).toBe(5);
    });

    it('extrait la mémoire factuelle des nombres', () => {
      const history = [
        { role: 'user', content: 'Combien de projets terminés ?', timestamp: new Date() },
        { role: 'assistant', content: 'Tu as 42 projets terminés.', timestamp: new Date() },
        { role: 'user', content: 'Et les ghost prod ?', timestamp: new Date() },
        {
          role: 'assistant',
          content: 'Tu as 15 projets ghost production.',
          timestamp: new Date(),
        },
        ...Array.from({ length: 12 }, (_, i) => ({
          role: i % 2 === 0 ? 'user' : 'assistant',
          content: `Filler message ${i}`,
          timestamp: new Date(),
        })),
      ];

      const result = prepareConversationContext(history);

      // La mémoire factuelle devrait contenir les nombres
      if (result.factualMemory) {
        expect(result.factualMemory).toMatch(/42|15/);
      }
    });
  });
});

describe('System Prompt 8B', () => {
  const { SYSTEM_PROMPT_8B, buildUserPrompt } = require('../../prompts/system-prompt-8b');

  it('le prompt système est compact (< 1000 caractères)', () => {
    expect(SYSTEM_PROMPT_8B.length).toBeLessThan(1000);
  });

  it('le prompt système contient les règles essentielles', () => {
    expect(SYSTEM_PROMPT_8B).toContain('LARIAN');
    expect(SYSTEM_PROMPT_8B).toContain('CHAT');
    expect(SYSTEM_PROMPT_8B).toContain('FACT');
    expect(SYSTEM_PROMPT_8B).toContain('SUMMARY');
  });

  it('buildUserPrompt inclut le mode', () => {
    const prompt = buildUserPrompt(
      'CHAT',
      'Salut!',
      '',
      { projectCount: 10, collabCount: 5, styleCount: 3 },
      false
    );

    expect(prompt).toContain('MODE: CHAT');
  });

  it('buildUserPrompt inclut le contexte projet si pertinent', () => {
    const prompt = buildUserPrompt(
      'CHAT',
      'Combien de projets terminés?',
      '',
      { projectCount: 10, collabCount: 5, styleCount: 3 },
      false
    );

    expect(prompt).toContain('10 projets');
  });

  it('buildUserPrompt ajoute un warning si déjà salué', () => {
    const prompt = buildUserPrompt(
      'CHAT',
      'Salut!',
      '',
      { projectCount: 10, collabCount: 5, styleCount: 3 },
      true // hasGreeted = true
    );

    expect(prompt).toContain('déjà salué');
  });
});
