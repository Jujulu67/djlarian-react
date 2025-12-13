/**
 * TEST DE COMPARAISON - processProjectCommand vs parseQuery
 * Compare les résultats entre les deux chemins pour identifier les incohérences
 */

import { parseQuery } from '../index';
import { detectFilters } from '../filters';
import { classifyQuery } from '../classifier';

describe('🔍 COMPARAISON - processProjectCommand vs parseQuery', () => {
  const availableCollabs = ['TOTO', 'Daft Punk', 'Skrillex'];
  const availableStyles = ['Dnb', 'House', 'Techno'];

  // Phrases de test qui peuvent avoir des différences
  const testQueries = [
    'liste les projets',
    'montre moi tous les projets',
    'affiche les projets terminés',
    'projets en cours',
    'projets terminés',
    "combien de projets j'ai?",
    'et les terminés?',
    'et nos projets alors?',
    'marque les projets à 100% comme TERMINE',
    'déplace la deadline à demain pour les projets à 80%',
    'passe les projets en cours en annulé',
    'modifie tous les projets avec toto en collaborateur à momo',
    "combien de ghost prod j'ai",
    'liste les projets avec TOTO',
  ];

  testQueries.forEach((query) => {
    it(`devrait avoir des résultats cohérents pour "${query}"`, () => {
      const lowerQuery = query.toLowerCase();

      // CHEMIN 1: processProjectCommand (comme dans les tests)
      const { filters: filters1 } = detectFilters(query, lowerQuery, [], []);
      const classification1 = classifyQuery(query, lowerQuery, filters1);

      // CHEMIN 2: parseQuery (comme en production)
      const result2 = parseQuery(query, availableCollabs, availableStyles);
      const classification2 = result2;

      // Comparer les résultats
      console.log(`\n[COMPARAISON] "${query}"`);
      console.log('  CHEMIN 1 (processProjectCommand):', {
        filters: Object.keys(filters1),
        isList: classification1.isList,
        isCount: classification1.isCount,
        isUpdate: classification1.isUpdate,
        isConversational: classification1.isConversationalQuestion,
        understood: classification1.understood,
      });
      console.log('  CHEMIN 2 (parseQuery):', {
        filters: Object.keys(result2.filters || {}),
        type: result2.type,
        isConversational: result2.isConversational,
        understood: result2.understood,
      });

      // Vérifications de cohérence
      // 1. Si c'est une liste dans le chemin 1, ça devrait être 'list' dans le chemin 2
      if (classification1.isList && !classification1.isUpdate) {
        expect(result2.type).toBe('list');
      }

      // 2. Si c'est un comptage dans le chemin 1, ça devrait être 'count' dans le chemin 2
      if (classification1.isCount && !classification1.isUpdate) {
        expect(result2.type).toBe('count');
      }

      // 3. Si c'est une modification dans le chemin 1, ça devrait être 'update' dans le chemin 2
      if (classification1.isUpdate) {
        expect(result2.type).toBe('update');
      }

      // 4. Si c'est conversationnel dans le chemin 1, ça devrait être conversationnel dans le chemin 2
      if (classification1.isConversationalQuestion) {
        expect(result2.isConversational).toBe(true);
      }

      // 5. Les filtres de statut devraient être cohérents
      if (filters1.status && result2.filters?.status) {
        expect(filters1.status).toBe(result2.filters.status);
      }
    });
  });
});
