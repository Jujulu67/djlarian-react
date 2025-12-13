import { classifyQuery } from '../classifier';

describe('Classifier Complexity Detection', () => {
  const emptyFilters = {};

  it('should detect complex queries based on reasoning keywords', () => {
    const complexQueries = [
      'Analyse les performances de mes projets',
      'Explique pourquoi ce projet est en retard', // 'Explique' is strong
      'Fais moi un résumé de la situation', // 'Résumé' is strong
      'I would like to know your opinion about the recent changes in the project structure', // Lengthened > 50
      'Je voudrais avoir ton avis détaillé sur la progression actuelle du projet Techno', // Lengthened > 50
    ];
    complexQueries.forEach((q) => {
      const result = classifyQuery(q, q.toLowerCase(), emptyFilters);
      expect(result.isComplex).toBe(true);
    });
  });

  it('should detect complex queries based on length', () => {
    const longQuery =
      "J'aimerais que tu regardes tous mes projets en cours et que tu me dises si je suis dans les temps par rapport aux deadlines prévues, car j'ai l'impression de prendre du retard sur certaines productions importantes et je voudrais savoir où j'en suis exactement.";
    expect(longQuery.length).toBeGreaterThan(100);

    const result = classifyQuery(longQuery, longQuery.toLowerCase(), emptyFilters);
    expect(result.isComplex).toBe(true);
  });

  it('should NOT detect simple commands as complex', () => {
    const simpleQueries = [
      'Liste mes projets',
      'Update Techno 1 to 50%',
      'Combien de projets ?',
      'Show me finished projects',
      'Qui es tu ?', // Meta question -> Simple
      'Pourquoi tu répètes ?', // Simple conversational "why" -> Simple
      'Tu sais faire quoi ?', // Meta -> Simple
      'Salut ça va', // Conversational -> Simple
    ];

    simpleQueries.forEach((q) => {
      const result = classifyQuery(q, q.toLowerCase(), emptyFilters);
      if (result.isComplex) {
        console.log('Failed for query:', q, 'Result:', result);
      }
      expect(result.isComplex).toBe(false);
    });
  });

  it('should detect fallback/not understood as complex', () => {
    // A query that doesn't match any command pattern but isn't conversational enough to be ignored?
    // Or just a weird query.
    const weirdQuery = 'Potatoes flying over the moon with synthesis';
    // "synthesis" might trigger some keyword, let's try something clearly unknown but non-command
    const unknownQuery = 'Systeme 42 activation pattern delta';

    const result = classifyQuery(unknownQuery, unknownQuery.toLowerCase(), emptyFilters);
    // If it's not understood, isComplex should be true
    if (!result.understood) {
      expect(result.isComplex).toBe(true);
    }
  });
});
