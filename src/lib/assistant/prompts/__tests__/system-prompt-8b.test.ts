/**
 * Tests pour system-prompt-8b.ts
 * Vérifie que les prompts sont correctement construits
 */

import { describe, it, expect } from '@jest/globals';
import { SYSTEM_PROMPT_8B, buildUserPrompt } from '../system-prompt-8b';
import { SYSTEM_DISCIPLINE_PROMPT } from '../system-discipline-prompt';

describe('System Prompt 8B', () => {
  describe('SYSTEM_PROMPT_8B', () => {
    it("devrait contenir l'identité LARIAN BOT", () => {
      expect(SYSTEM_PROMPT_8B).toContain('LARIAN BOT');
      expect(SYSTEM_PROMPT_8B).toContain('Larian Bot');
    });

    it('devrait contenir les statuts disponibles', () => {
      expect(SYSTEM_PROMPT_8B).toContain('EN_COURS');
      expect(SYSTEM_PROMPT_8B).toContain('TERMINE');
    });

    it('devrait avoir une longueur raisonnable (< 1000 caractères)', () => {
      expect(SYSTEM_PROMPT_8B.length).toBeLessThan(1000);
    });
  });

  describe('buildUserPrompt', () => {
    it('devrait commencer par IDENTITÉ: avec interdiction LLaMA', () => {
      const prompt = buildUserPrompt(
        'CHAT',
        'qui es-tu ?',
        '',
        { projectCount: 0, collabCount: 0, styleCount: 0 },
        false
      );

      expect(prompt).toContain('IDENTITÉ: Tu es LARIAN BOT');
      expect(prompt).toContain('INTERDIT: ne dis jamais que tu es LLaMA');
      expect(prompt.startsWith('IDENTITÉ:')).toBe(true);
    });

    it('devrait contenir les règles anti-re-greeting et anti-hallucination', () => {
      const prompt = buildUserPrompt(
        'CHAT',
        'test',
        '',
        { projectCount: 0, collabCount: 0, styleCount: 0 },
        false
      );

      // Vérifier que FIRST_TURN est présent (nouveau format)
      expect(prompt).toContain('FIRST_TURN:');
      // Vérifier la règle anti-hallucination
      expect(prompt).toContain("RÈGLE: N'invente jamais de fonctionnalités");
    });

    it("devrait contenir le mode après l'identité", () => {
      const prompt = buildUserPrompt(
        'CHAT',
        'test',
        '',
        { projectCount: 0, collabCount: 0, styleCount: 0 },
        false
      );

      const identityIndex = prompt.indexOf('IDENTITÉ:');
      const modeIndex = prompt.indexOf('MODE: CHAT');

      expect(identityIndex).toBeGreaterThanOrEqual(0);
      expect(modeIndex).toBeGreaterThan(identityIndex);
    });

    it('devrait inclure le contexte conversationnel si fourni', () => {
      const conversationContext = 'FACTUAL MEMORY: test\n\nRECENT EXCHANGE:\nUser: hello';
      const prompt = buildUserPrompt(
        'CHAT',
        'test',
        conversationContext,
        { projectCount: 0, collabCount: 0, styleCount: 0 },
        false
      );

      expect(prompt).toContain('FACTUAL MEMORY: test');
      expect(prompt).toContain('RECENT EXCHANGE:');
    });

    it('devrait inclure la question à la fin', () => {
      const prompt = buildUserPrompt(
        'CHAT',
        'qui es-tu ?',
        '',
        { projectCount: 0, collabCount: 0, styleCount: 0 },
        false
      );

      expect(prompt).toContain('QUESTION: "qui es-tu ?"');
    });

    it('devrait inclure FIRST_TURN: true quand isFirstAssistantTurn=true et permettre salutation si utilisateur a salué', () => {
      const prompt = buildUserPrompt(
        'CHAT',
        'Salut',
        '',
        { projectCount: 0, collabCount: 0, styleCount: 0 },
        false,
        true // isFirstAssistantTurn
      );

      expect(prompt).toContain('FIRST_TURN: true');
      expect(prompt).toContain(
        "Tu peux saluer UNIQUEMENT car FIRST_TURN=true ET l'utilisateur a salué"
      );
    });

    it('devrait inclure FIRST_TURN: false quand isFirstAssistantTurn=false et interdire salutation', () => {
      const prompt = buildUserPrompt(
        'CHAT',
        'test',
        '',
        { projectCount: 0, collabCount: 0, styleCount: 0 },
        false,
        false // isFirstAssistantTurn
      );

      expect(prompt).toContain('FIRST_TURN: false');
      expect(prompt).toContain('Ne salue JAMAIS (FIRST_TURN=false)');
    });

    it('devrait calculer FIRST_TURN: false par défaut si isFirstAssistantTurn non fourni', () => {
      const prompt = buildUserPrompt(
        'CHAT',
        'test',
        '',
        { projectCount: 0, collabCount: 0, styleCount: 0 },
        false
        // isFirstAssistantTurn non fourni
      );

      expect(prompt).toContain('FIRST_TURN: false');
    });
  });

  describe('Combinaison SYSTEM_DISCIPLINE_PROMPT + SYSTEM_PROMPT_8B', () => {
    it('devrait être possible de combiner les deux prompts', () => {
      const combined = `${SYSTEM_DISCIPLINE_PROMPT}\n\n${SYSTEM_PROMPT_8B}`;

      expect(combined).toContain('You are an assistant with limited memory');
      expect(combined).toContain('LARIAN BOT');
      expect(combined).toContain('CHAT');
      expect(combined).toContain('FACT');
      expect(combined).toContain('SUMMARY');
      expect(combined).toContain('COMMAND');
    });

    it("devrait contenir les règles d'identité", () => {
      const combined = `${SYSTEM_DISCIPLINE_PROMPT}\n\n${SYSTEM_PROMPT_8B}`;

      // Vérifier que les règles d'identité sont présentes
      expect(combined).toContain('LARIAN BOT');
      expect(combined).toContain('ANSWER QUESTIONS DIRECTLY');
      expect(combined).toContain('If asked who you are, say who you are');
    });
  });

  describe('formatHistoryForMessages', () => {
    const { formatHistoryForMessages } = require('../system-prompt-8b');

    it('devrait filtrer les rôles invalides et ne garder que user/assistant', () => {
      const messages = [
        { role: 'user' as const, content: 'Message 1' },
        { role: 'assistant' as const, content: 'Réponse 1' },
        { role: 'system' as any, content: 'System message' }, // Rôle invalide
        { role: 'user' as const, content: 'Message 2' },
      ];

      const result = formatHistoryForMessages(messages);

      expect(result).toHaveLength(3); // system doit être filtré
      expect(result.every((msg) => msg.role === 'user' || msg.role === 'assistant')).toBe(true);
      expect(result.find((msg) => msg.role === 'system')).toBeUndefined();
    });

    it("devrait préserver l'ordre des messages valides", () => {
      const messages = [
        { role: 'user' as const, content: 'Premier' },
        { role: 'assistant' as const, content: 'Deuxième' },
        { role: 'user' as const, content: 'Troisième' },
      ];

      const result = formatHistoryForMessages(messages);

      expect(result).toHaveLength(3);
      expect(result[0].content).toBe('Premier');
      expect(result[1].content).toBe('Deuxième');
      expect(result[2].content).toBe('Troisième');
    });

    it('devrait retourner un tableau vide si aucun message valide', () => {
      const messages = [
        { role: 'system' as any, content: 'System 1' },
        { role: 'system' as any, content: 'System 2' },
      ];

      const result = formatHistoryForMessages(messages);

      expect(result).toHaveLength(0);
    });
  });
});
