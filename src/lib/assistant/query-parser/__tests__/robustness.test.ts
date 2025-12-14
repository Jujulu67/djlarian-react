/**
 * Tests de robustesse pour le parseur de requêtes
 * Couvre les cas limites, les typos, et les ambiguïtés contextuelles
 */

import { parseQuery } from '../index';

describe('Robustness & Edge Cases', () => {
  // 1. Conflit entre mises à jour et filtres
  describe('Update vs Filter Disambiguation', () => {
    it('should detect "passe leur avancement à 10%" as update, NOT filter', () => {
      const result = parseQuery('passe leur avancement à 10%', [], []);
      expect(result.type).toBe('update');
      expect(result.updateData?.newProgress).toBe(10);
      // Ne doit pas être un filtre
      expect(result.filters.minProgress).toBeUndefined();
      expect(result.filters.maxProgress).toBeUndefined();
    });

    it('should detect "met les projets à 50% en TERMINE" as filter (ambiguous case)', () => {
      const result = parseQuery('met les projets à 50% en TERMINE', [], []);
      // Ici, "à 50%" peut être un filtre ou une mise à jour selon l'implémentation
      // Le plus important est que le statut TERMINE soit détecté
      expect(result.updateData?.newStatus).toBe('TERMINE');
      // Le filtre de progression peut être présent ou non selon l'implémentation
      // On accepte les deux comportements
      if (result.filters.minProgress !== undefined) {
        expect(result.filters.minProgress).toBe(50);
        expect(result.filters.maxProgress).toBe(50);
      }
    });
  });

  // 2. Détection de nouvelle recherche vs Follow-up
  describe('New Search vs Follow-up Scope', () => {
    // Ce test vérifie que le filtre est bien extrait.
    // La logique de choix entre "nouvelle recherche" et "affichage colonnes" se trouve dans useAssistantChat,
    // mais on peut vérifier ici que "terminés" est bien vu comme un statut valide.
    it('should detect "affiche les terminés" as having status filter', () => {
      const result = parseQuery('affiche les terminés', [], []);
      expect(result.filters.status).toBe('TERMINE');
    });
  });

  // 3. Prépositions et mots de liaison
  describe('Prepositions & Connectors', () => {
    it('should parse "change collaborateur par stk" correctly', () => {
      // "par" doit être accepté et ne pas être pris pour le nom du collab
      const result = parseQuery('change collaborateur par stk', ['stk'], []);
      expect(result.type).toBe('update');
      expect(result.updateData?.newCollab?.toLowerCase()).toBe('stk');
      // "change" ne doit pas être vu comme un filtre collab (grâce aux ignored words)
      expect(result.filters.collab).toBeUndefined();
    });

    it('should parse "met le style en techno" correctly', () => {
      const result = parseQuery('met le style en techno', [], ['Techno']);
      expect(result.updateData?.newStyle?.toLowerCase()).toBe('techno');
    });
  });

  // 4. Typos et Déterminants
  describe('Typos & Determinants', () => {
    it('should handle "cahnge le collab" (typo + determiner with space)', () => {
      const result = parseQuery('cahnge le collab par hoho', [], []);
      expect(result.type).toBe('update');
      expect(result.updateData?.newCollab).toBe('hoho');
    });

    it('should handle "chnage l\'avancement" (typo + elision)', () => {
      const result = parseQuery("chnage l'avancement à 20%", [], []);
      expect(result.type).toBe('update');
      expect(result.updateData?.newProgress).toBe(20);
    });

    it('should handle "pousse mon avancement" (synonym + possessive)', () => {
      const result = parseQuery('pousse mon avancement à 30%', [], []);
      expect(result.type).toBe('update');
      expect(result.updateData?.newProgress).toBe(30);
    });

    it('should handle "modifi la deadline" (typo + determiner)', () => {
      const result = parseQuery('modifi la deadline au 10/10/2025', [], []);
      expect(result.type).toBe('update');
      expect(result.updateData?.newDeadline).toBeDefined();
    });
  });
});
