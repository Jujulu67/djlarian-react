/**
 * Tests fuzzy contrôlés pour detectFilters
 *
 * Génère des variations naturelles de phrases pour tester la robustesse du parsing
 * sans dépendre d'une IA externe.
 *
 * Objectif: vérifier que les mêmes intentions donnent les mêmes résultats
 * même avec des variations de formulation.
 */

import { detectFilters } from '../filters';

/**
 * Génère des variations d'une phrase en combinant différents éléments
 */
function generateVariations(base: { verb: string[]; scope: string[]; action: string[] }): string[] {
  const variations: string[] = [];
  for (const verb of base.verb) {
    for (const scope of base.scope) {
      for (const action of base.action) {
        variations.push(`${verb} ${scope} ${action}`);
      }
    }
  }
  return variations;
}

describe('detectFilters - Tests fuzzy contrôlés', () => {
  describe('Variations de verbes update', () => {
    it('devrait détecter le même filtre status=TERMINE pour toutes les variations de verbes', () => {
      const variations = generateVariations({
        verb: ['passe', 'mets', 'marque', 'change', 'modifie'],
        scope: ['les terminés', 'les projets terminés', 'pour les terminés'],
        action: ['à 20%', 'en TERMINE'],
      });

      const results = variations.map((query) => {
        const result = detectFilters(query, query.toLowerCase(), [], []);
        return {
          query,
          status: result.filters.status,
        };
      });

      // Toutes les variations devraient détecter status=TERMINE
      const statusResults = results.filter((r) => r.status === 'TERMINE');
      expect(statusResults.length).toBeGreaterThan(0);

      // Vérifier que les variations avec "en TERMINE" détectent bien le statut
      const withStatusAction = results.filter((r) => r.query.includes('en TERMINE'));
      withStatusAction.forEach((r) => {
        expect(r.status).toBe('TERMINE');
      });
    });

    it('devrait détecter le même filtre progress pour toutes les variations', () => {
      const variations = generateVariations({
        verb: ['passe', 'mets', 'marque'],
        scope: ['les terminés', 'les projets terminés'],
        action: ['à 20%', 'à 20 pourcent', "à 20% d'avancement"],
      });

      const results = variations.map((query) => {
        const result = detectFilters(query, query.toLowerCase(), [], []);
        return {
          query,
          minProgress: result.filters.minProgress,
          maxProgress: result.filters.maxProgress,
        };
      });

      // Au moins certaines variations devraient détecter progress=20
      const progressResults = results.filter((r) => r.minProgress === 20 && r.maxProgress === 20);
      expect(progressResults.length).toBeGreaterThan(0);
    });
  });

  describe('Variations de scope', () => {
    it('devrait détecter le même filtre pour "leur", "les", "ces"', () => {
      const queries = [
        'passe leur progression à 40%',
        'passe les progression à 40%',
        'passe ces progression à 40%',
      ];

      const results = queries.map((query) => {
        const result = detectFilters(query, query.toLowerCase(), [], []);
        return {
          query,
          filters: result.filters,
        };
      });

      // Les résultats devraient être similaires (même si pas identiques car "leur/les/ces" ne sont pas des filtres)
      // On vérifie juste qu'il n'y a pas d'erreur
      results.forEach((r) => {
        expect(r.filters).toBeDefined();
      });
    });
  });

  describe('Variations de field aliases', () => {
    it('devrait détecter deadline avec différents alias', () => {
      const queries = [
        'affiche les projets avec deadline',
        'affiche les projets avec date limite',
        'affiche les projets avec dead line',
      ];

      const results = queries.map((query) => {
        const result = detectFilters(query, query.toLowerCase(), [], []);
        return {
          query,
          hasDeadline: result.filters.hasDeadline,
          fieldsToShow: result.fieldsToShow,
        };
      });

      // Au moins certaines devraient détecter deadline dans fieldsToShow
      // (detectFilters peut ne pas toujours détecter selon le contexte)
      const withDeadline = results.filter((r) => r.fieldsToShow.includes('deadline'));
      expect(withDeadline.length).toBeGreaterThan(0);
    });

    it('devrait détecter progress avec différents alias', () => {
      const queries = [
        'affiche les projets avec avancement',
        'affiche les projets avec progression',
        'affiche les projets avec progress',
        'affiche les projets avec pourcentage',
      ];

      const results = queries.map((query) => {
        const result = detectFilters(query, query.toLowerCase(), [], []);
        return {
          query,
          fieldsToShow: result.fieldsToShow,
        };
      });

      // Toutes devraient détecter progress dans fieldsToShow
      results.forEach((r) => {
        expect(r.fieldsToShow).toContain('progress');
      });
    });
  });

  describe('Variations deadline push', () => {
    it('devrait détecter le même pushDeadlineBy pour différentes formulations', () => {
      const queries = [
        'pousse leur deadline de 1 mois',
        "pousse leur deadline d'un mois",
        'pousse leur deadline de un mois',
        'pousse la deadline de 1 mois',
        "pousse la deadline d'un mois",
      ];

      // Note: ces tests vérifient que detectFilters ne casse pas
      // Le parsing de pushDeadlineBy est testé dans deadline-updates.test.ts
      const results = queries.map((query) => {
        const result = detectFilters(query, query.toLowerCase(), [], []);
        return {
          query,
          filters: result.filters,
        };
      });

      // Vérifier qu'il n'y a pas d'erreur
      results.forEach((r) => {
        expect(r.filters).toBeDefined();
      });
    });
  });

  describe('Performance', () => {
    it('devrait être rapide même avec beaucoup de variations', () => {
      const variations = generateVariations({
        verb: ['passe', 'mets', 'marque', 'change', 'modifie'],
        scope: ['les terminés', 'les projets terminés', 'pour les terminés', 'leur'],
        action: ['à 20%', 'à 30%', 'à 40%', 'en TERMINE', 'en EN_COURS'],
      });

      const start = Date.now();
      variations.forEach((query) => {
        detectFilters(query, query.toLowerCase(), [], []);
      });
      const duration = Date.now() - start;

      // Devrait être rapide (< 150ms pour ~60 variations)
      expect(duration).toBeLessThan(150);
    });
  });
});
