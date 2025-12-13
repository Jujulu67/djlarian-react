/**
 * Tests pour le dictionnaire NLP centralisé
 *
 * Vérifie que les constantes existent et que les helpers fonctionnent correctement
 */

import {
  UpdateVerbs,
  ListVerbs,
  ScopePronouns,
  AllProjectsPhrases,
  StatusSynonyms,
  FieldAliases,
  TimeUnitsSynonyms,
  BuildAlternationRegexPart,
  NormalizeWhitespace,
  NormalizeAccents,
  NormalizeForNlp,
} from '../nlp-dictionary';

describe('NLP Dictionary', () => {
  describe('Constantes', () => {
    it('devrait exporter UpdateVerbs', () => {
      expect(UpdateVerbs).toBeDefined();
      expect(Array.isArray(UpdateVerbs)).toBe(true);
      expect(UpdateVerbs.length).toBeGreaterThan(0);
      expect(UpdateVerbs).toContain('passe');
      expect(UpdateVerbs).toContain('mets');
      expect(UpdateVerbs).toContain('ajoute');
    });

    it('devrait exporter ListVerbs', () => {
      expect(ListVerbs).toBeDefined();
      expect(Array.isArray(ListVerbs)).toBe(true);
      expect(ListVerbs.length).toBeGreaterThan(0);
      expect(ListVerbs).toContain('affiche');
      expect(ListVerbs).toContain('montre');
    });

    it('devrait exporter ScopePronouns', () => {
      expect(ScopePronouns).toBeDefined();
      expect(Array.isArray(ScopePronouns)).toBe(true);
      expect(ScopePronouns.length).toBeGreaterThan(0);
      expect(ScopePronouns).toContain('leur');
      expect(ScopePronouns).toContain('les');
    });

    it('devrait exporter AllProjectsPhrases', () => {
      expect(AllProjectsPhrases).toBeDefined();
      expect(Array.isArray(AllProjectsPhrases)).toBe(true);
      expect(AllProjectsPhrases.length).toBeGreaterThan(0);
      expect(AllProjectsPhrases).toContain('tous les projets');
    });

    it('devrait exporter StatusSynonyms', () => {
      expect(StatusSynonyms).toBeDefined();
      expect(typeof StatusSynonyms).toBe('object');
      expect(StatusSynonyms['terminé']).toBe('TERMINE');
      expect(StatusSynonyms['fini']).toBe('TERMINE');
      expect(StatusSynonyms['en cours']).toBe('EN_COURS');
    });

    it('devrait exporter FieldAliases', () => {
      expect(FieldAliases).toBeDefined();
      expect(typeof FieldAliases).toBe('object');
      expect(FieldAliases['avancement']).toBe('progress');
      expect(FieldAliases['deadline']).toBe('deadline');
      expect(FieldAliases['date limite']).toBe('deadline');
    });

    it('devrait exporter TimeUnitsSynonyms', () => {
      expect(TimeUnitsSynonyms).toBeDefined();
      expect(typeof TimeUnitsSynonyms).toBe('object');
      expect(TimeUnitsSynonyms['jour']).toEqual({ days: 1 });
      expect(TimeUnitsSynonyms['semaine']).toEqual({ weeks: 1 });
      expect(TimeUnitsSynonyms['mois']).toEqual({ months: 1 });
    });
  });

  describe('BuildAlternationRegexPart', () => {
    it('devrait construire une alternation regex simple', () => {
      const result = BuildAlternationRegexPart(['passe', 'mets']);
      expect(result).toBe('(?:passe|mets)');
    });

    it('devrait gérer un seul mot', () => {
      const result = BuildAlternationRegexPart(['passe']);
      expect(result).toBe('passe');
    });

    it('devrait gérer un tableau vide', () => {
      const result = BuildAlternationRegexPart([]);
      expect(result).toBe('');
    });

    it('devrait gérer plusieurs mots', () => {
      const result = BuildAlternationRegexPart(['passe', 'mets', 'marque', 'ajoute']);
      expect(result).toBe('(?:passe|mets|marque|ajoute)');
    });
  });

  describe('NormalizeWhitespace', () => {
    it('devrait normaliser les espaces multiples', () => {
      expect(NormalizeWhitespace('passe   les   projets')).toBe('passe les projets');
      expect(NormalizeWhitespace('passe\tles\nprojets')).toBe('passe les projets');
    });

    it('devrait trim les espaces en début/fin', () => {
      expect(NormalizeWhitespace('  passe les projets  ')).toBe('passe les projets');
    });

    it('devrait gérer les chaînes sans espaces multiples', () => {
      expect(NormalizeWhitespace('passe les projets')).toBe('passe les projets');
    });
  });

  describe('NormalizeAccents', () => {
    it('devrait normaliser les accents', () => {
      expect(NormalizeAccents('terminé')).toBe('termine');
      expect(NormalizeAccents('à')).toBe('a');
      expect(NormalizeAccents('é')).toBe('e');
      expect(NormalizeAccents('è')).toBe('e');
      expect(NormalizeAccents('ê')).toBe('e');
      expect(NormalizeAccents('ô')).toBe('o');
      expect(NormalizeAccents('û')).toBe('u');
    });

    it('devrait normaliser les apostrophes', () => {
      expect(NormalizeAccents("d'un")).toBe("d'un");
      expect(NormalizeAccents('d\u2019un')).toBe("d'un"); // Apostrophe typographique
    });

    it('devrait préserver les caractères sans accents', () => {
      expect(NormalizeAccents('passe les projets')).toBe('passe les projets');
    });
  });

  describe('NormalizeForNlp', () => {
    it('devrait combiner normalisation espaces et accents', () => {
      expect(NormalizeForNlp('  terminé   les   projets  ')).toBe('termine les projets');
      expect(NormalizeForNlp('passe   les   terminés')).toBe('passe les termines');
    });

    it('devrait gérer les cas complexes', () => {
      expect(NormalizeForNlp('  passe   les   terminés   à   20%  ')).toBe(
        'passe les termines a 20%'
      );
    });

    it('ne devrait pas casser les chaînes normales', () => {
      expect(NormalizeForNlp('passe les projets')).toBe('passe les projets');
    });
  });
});
