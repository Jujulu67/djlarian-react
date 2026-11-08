/**
 * Tests unitaires pour la génération de notes avec templates
 */
import { generateNoteFromContent } from '../note-generator';

describe('Génération de notes - Template Évolution', () => {
  describe('Format de base', () => {
    it('devrait générer une note avec le template Évolution', () => {
      const content = "j'ai refait le mix";
      const note = generateNoteFromContent(content);

      expect(note).toContain('##');
      expect(note).toContain('### Évolution');
      expect(note).toContain("j'ai refait le mix");
      expect(note).toContain('### Prochaines étapes');
    });

    it('devrait inclure la date du jour au format français', () => {
      const content = 'test';
      const note = generateNoteFromContent(content);
      const today = new Date().toLocaleDateString('fr-FR');

      expect(note).toContain(`## ${today}`);
    });

    it('devrait avoir une section Prochaines étapes même sans tâches', () => {
      const content = 'juste du contenu sans tâches';
      const note = generateNoteFromContent(content);

      expect(note).toContain('### Prochaines étapes');
      expect(note).toContain('- \n- \n'); // Placeholders vides
    });
  });

  describe('Extraction de tâches', () => {
    it('devrait extraire les tâches depuis "reste à faire X, Y, Z"', () => {
      const content = "j'ai refait le mix, reste à faire améliorer le mastering et envoyer label";
      const note = generateNoteFromContent(content);

      expect(note).toContain('améliorer le mastering');
      expect(note).toContain('envoyer label');
      expect(note).toMatch(/- améliorer le mastering/);
      expect(note).toMatch(/- envoyer label/);
    });

    it('devrait extraire les tâches depuis "reste à faire: X, Y"', () => {
      const content = 'test, reste à faire: mix, mastering';
      const note = generateNoteFromContent(content);

      expect(note).toContain('mix');
      expect(note).toContain('mastering');
      expect(note).toMatch(/- mix/);
      expect(note).toMatch(/- mastering/);
    });

    it('devrait extraire les tâches depuis "à faire: X, Y, Z"', () => {
      const content = 'test, à faire: mix, mastering, label';
      const note = generateNoteFromContent(content);

      expect(note).toContain('mix');
      expect(note).toContain('mastering');
      expect(note).toContain('label');
    });

    it.each([
      ['devrait extraire les tâches depuis "reste: X, Y"', 'test, reste: mix, mastering'],
      [
        'devrait extraire les tâches depuis "prochaines étapes: X, Y"',
        'test, prochaines étapes: mix, mastering',
      ],
      ['devrait extraire les tâches depuis "todo: X, Y"', 'test, todo: mix, mastering'],
      ['devrait extraire les tâches séparées par "et"', 'test, reste à faire mix et mastering'],
      ['devrait extraire les tâches séparées par "puis"', 'test, reste à faire mix puis mastering'],
    ])('%s', (_title, content) => {
      const note = generateNoteFromContent(content);

      expect(note).toContain('mix');
      expect(note).toContain('mastering');
    });

    it('devrait extraire les tâches séparées par point-virgule', () => {
      const content = 'test, reste à faire: mix; mastering; label';
      const note = generateNoteFromContent(content);

      expect(note).toContain('mix');
      expect(note).toContain('mastering');
      expect(note).toContain('label');
    });
  });

  describe('Nettoyage du contenu principal', () => {
    it('devrait enlever la partie "reste à faire" du contenu principal', () => {
      const content = "j'ai refait le mix, reste à faire améliorer le mastering";
      const note = generateNoteFromContent(content);

      expect(note).toContain("j'ai refait le mix");
      expect(note).not.toContain('reste à faire améliorer le mastering');
      // Mais les tâches devraient être dans Prochaines étapes
      expect(note).toContain('améliorer le mastering');
    });

    it('devrait enlever la partie "à faire" du contenu principal', () => {
      const content = 'test, à faire: mix';
      const note = generateNoteFromContent(content);

      expect(note).toContain('test');
      expect(note).not.toMatch(/à faire: mix/);
      // Mais "mix" devrait être dans Prochaines étapes
      expect(note).toContain('mix');
    });

    it('devrait enlever les virgules en fin de phrase', () => {
      const content = 'test, reste à faire: mix,';
      const note = generateNoteFromContent(content);

      expect(note).not.toMatch(/test,$/);
    });
  });

  describe('Cas farfelus et variations', () => {
    it('devrait gérer un contenu très long', () => {
      const longContent = 'a'.repeat(1000);
      const note = generateNoteFromContent(longContent);

      expect(note).toContain(longContent);
      expect(note).toContain('### Évolution');
    });

    it.each([
      [
        'devrait gérer un contenu avec emojis',
        "🎵 j'ai fini! 🎉 reste à faire: mix 🎶",
        ['🎵', '🎉', 'mix', '🎶'],
      ],
      [
        'devrait gérer un contenu avec caractères spéciaux',
        'test @#$%^&*(), reste à faire: mix',
        ['@#$%^&*()', 'mix'],
      ],
      [
        'devrait gérer un contenu avec sauts de ligne',
        'ligne1\nligne2\nligne3, reste à faire: mix',
        ['ligne1', 'ligne2', 'ligne3', 'mix'],
      ],
    ])('%s', (_title, content, expectedTexts) => {
      const note = generateNoteFromContent(content);

      expectedTexts.forEach((text) => expect(note).toContain(text));
    });

    it('devrait gérer plusieurs patterns de tâches (prendre le premier)', () => {
      const content = 'test, reste à faire: mix, reste: mastering';
      const note = generateNoteFromContent(content);

      // Devrait prendre le premier pattern trouvé
      expect(note).toContain('mix');
      // mastering pourrait aussi être extrait selon l'implémentation
    });

    it("devrait gérer des tâches avec beaucoup d'espaces", () => {
      const content = 'test, reste à faire:   mix   ,   mastering  ';
      const note = generateNoteFromContent(content);

      expect(note).toContain('mix');
      expect(note).toContain('mastering');
      // Les espaces devraient être nettoyés
      expect(note).not.toMatch(/   mix   /);
    });

    it.each([
      [
        'tâches vides (après nettoyage)',
        'test, reste à faire: , , ',
        ['test', '### Prochaines étapes'],
      ],
      [
        'seulement des tâches',
        'reste à faire: mix, mastering',
        ['mix', 'mastering', '### Évolution'],
      ],
      ['tâches en majuscules', 'test, RESTE À FAIRE: MIX, MASTERING', ['MIX', 'MASTERING']],
    ])('devrait gérer un contenu avec %s', (_label, content, expected) => {
      const note = generateNoteFromContent(content);

      for (const part of expected) {
        expect(note).toContain(part);
      }
    });

    it('devrait gérer un contenu avec tâches mélangées majuscules/minuscules', () => {
      const content = 'test, reste à faire: MiX, MaStErInG';
      const note = generateNoteFromContent(content);

      expect(note).toContain('MiX');
      expect(note).toContain('MaStErInG');
    });
  });

  describe('Cas limites', () => {
    it('devrait gérer un contenu vide', () => {
      const note = generateNoteFromContent('');

      expect(note).toContain('##');
      expect(note).toContain('### Évolution');
      expect(note).toContain('### Prochaines étapes');
    });

    it('devrait gérer un contenu avec seulement des espaces', () => {
      const note = generateNoteFromContent('   ');

      expect(note).toContain('##');
      expect(note).toContain('### Évolution');
    });

    it('devrait gérer un contenu très court', () => {
      const note = generateNoteFromContent('ok');

      expect(note).toContain('ok');
      expect(note).toContain('### Évolution');
    });

    it('devrait gérer un contenu avec uniquement des tâches et pas de texte avant', () => {
      const content = 'reste à faire: mix';
      const note = generateNoteFromContent(content);

      expect(note).toContain('mix');
      expect(note).toContain('### Prochaines étapes');
    });
  });

  describe('Structure de la note générée', () => {
    it('devrait avoir la structure correcte avec séparateurs', () => {
      const content = 'test, reste à faire: mix';
      const note = generateNoteFromContent(content);

      // Vérifier l'ordre des sections
      const evolutionIndex = note.indexOf('### Évolution');
      const stepsIndex = note.indexOf('### Prochaines étapes');

      expect(evolutionIndex).toBeLessThan(stepsIndex);
    });

    it('devrait avoir des sauts de ligne appropriés', () => {
      const content = 'test';
      const note = generateNoteFromContent(content);

      // Devrait avoir \n\n entre les sections
      expect(note).toMatch(/\n\n### Évolution/);
      expect(note).toMatch(/\n\n### Prochaines étapes/);
    });

    it('devrait formater les tâches avec des tirets', () => {
      const content = 'test, reste à faire: mix, mastering';
      const note = generateNoteFromContent(content);

      expect(note).toMatch(/- mix/);
      expect(note).toMatch(/- mastering/);
    });
  });

  describe('Extraction de tâches complexes', () => {
    it.each([
      [
        'devrait gérer des tâches avec descriptions longues',
        'test, reste à faire: améliorer le mastering de la piste principale, envoyer le projet au label',
        ['améliorer le mastering de la piste principale', 'envoyer le projet au label'],
      ],
      [
        'devrait gérer des tâches avec ponctuation',
        'test, reste à faire: mix (urgent!), mastering?',
        ['mix (urgent!)', 'mastering?'],
      ],
      [
        'devrait gérer des tâches avec chiffres',
        'test, reste à faire: mix version 2, mastering 3.0',
        ['mix version 2', 'mastering 3.0'],
      ],
    ])('%s', (_title, content, expectedTexts) => {
      const note = generateNoteFromContent(content);

      expectedTexts.forEach((text) => expect(note).toContain(text));
    });
  });
});
