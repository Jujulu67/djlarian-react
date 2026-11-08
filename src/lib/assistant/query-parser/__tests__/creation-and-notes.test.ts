import { classifyQuery } from '../classifier';
import { extractCreateData } from '../creates';

// Mock simple des filtres pour les tests
const emptyFilters = {};

describe('Verification: Creation and Notes', () => {
  describe('Create Project Detection', () => {
    it('should classify "Crée un nouveau projet" as isCreate', () => {
      const query = 'Crée un nouveau projet Techno';
      const result = classifyQuery(query, query.toLowerCase(), emptyFilters);
      expect(result.isCreate).toBe(true);
      expect(result.isUpdate).toBe(false);
    });

    it('should classify "Ajoute un projet" as isCreate', () => {
      const query = 'Ajoute un projet Dubstep';
      const result = classifyQuery(query, query.toLowerCase(), emptyFilters);
      expect(result.isCreate).toBe(true);
    });
  });

  describe('Create Project Detection, every form of the verb', () => {
    const classify = (query: string, filters = emptyFilters) =>
      classifyQuery(query, query.toLowerCase(), filters);

    it.each([
      'crée un projet Test Claude',
      'cree un projet Test Claude',
      'créez un projet Test Claude',
      'créer un projet Test Claude',
    ])('should classify "%s" as isCreate', (query) => {
      const result = classify(query);
      expect(result.isCreate).toBe(true);
      expect(result.isList).toBe(false);
    });

    it('should not turn a creation with a collab into a list', () => {
      const result = classify('crée un projet Test Claude avec collab Zzessai', {
        collab: 'Zzessai',
      });
      expect(result.isCreate).toBe(true);
      expect(result.isList).toBe(false);
    });

    it.each([
      ['crée un projet Test Claude', 'test claude'],
      ['ajoute un nouveau projet Test Claude', 'test claude'],
      ['ajoute le projet Test Claude', 'test claude'],
      ['créer une track Test', 'track test'],
    ])('should extract the name from "%s"', (query, name) => {
      expect(extractCreateData(query, query.toLowerCase(), [], [])?.name.toLowerCase()).toBe(name);
    });

    it('should extract the name and the collab', () => {
      const query = 'crée un projet Test Claude avec collab Zzessai';
      const data = extractCreateData(query, query.toLowerCase(), [], []);
      expect(data?.name.toLowerCase()).toBe('test claude');
      expect(data?.collab?.toLowerCase()).toBe('zzessai');
    });

    it.each(['liste les projets créés', 'quels projets ai-je créés ?'])(
      'should keep "%s" as a list',
      (query) => {
        expect(classify(query).isList).toBe(true);
      }
    );

    it('should not read words containing the verb as a creation', () => {
      expect(classify('liste les projets secrets').isCreate).toBe(false);
    });
  });

  describe('Add Note Detection (Fix Verification)', () => {
    it.each([
      [
        'should classify "Ajoute une note à Symphony" as isUpdate (NOT isCreate)',
        "Ajoute une note à Symphony, j'ai refait le mix",
      ],
      ['should classify "Note pour Magnetize" as isUpdate', 'Note pour Magnetize: super session'],
      [
        'should classify "Session Magnetize du jour" as isUpdate',
        'Session Magnetize du jour, avancement sur le drop',
      ],
    ])('%s', (_title, query) => {
      const result = classifyQuery(query, query.toLowerCase(), emptyFilters);
      // CRITICAL for the first phrasing: must be isUpdate to trigger local parser execution
      expect(result.isUpdate).toBe(true);
    });
  });
});
