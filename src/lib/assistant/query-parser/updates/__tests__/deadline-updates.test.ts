/**
 * Tests unitaires pour l'extraction des modifications de deadline
 */

import { extractDeadlineUpdate } from '../deadline-updates';
import { UpdateData } from '../types';

describe('extractDeadlineUpdate - Parsing des deltas temporels', () => {
  const mockFilters: Record<string, any> = {};
  let updateData: UpdateData;

  beforeEach(() => {
    updateData = {};
    Object.keys(mockFilters).forEach((key) => delete mockFilters[key]);
  });

  describe('Détection "pousse leur deadline"', () => {
    it('devrait détecter "pousse leur deadline de 1 mois"', () => {
      extractDeadlineUpdate(
        'pousse leur deadline de 1 mois',
        'pousse leur deadline de 1 mois',
        mockFilters,
        updateData
      );

      expect(updateData.pushDeadlineBy).toBeDefined();
      expect(updateData.pushDeadlineBy?.months).toBe(1);
      expect(updateData.hasDeadline).toBe(true);
    });

    it.each([
      [
        'devrait détecter "pousse leur deadline d\'un mois"',
        "pousse leur deadline d'un mois",
        'months',
        1,
      ],
      [
        'devrait détecter "repousse la deadline d\'un mois"',
        "repousse la deadline d'un mois",
        'months',
        1,
      ],
      [
        'devrait détecter "ajoute 1 mois à la deadline"',
        'ajoute 1 mois à la deadline',
        'months',
        1,
      ],
    ] as const)('%s', (_title, input, unit, value) => {
      extractDeadlineUpdate(input, input, mockFilters, updateData);

      expect(updateData.pushDeadlineBy).toBeDefined();
      expect(updateData.pushDeadlineBy?.[unit]).toBe(value);
    });

    it('devrait détecter "décale la date limite de 2 semaines"', () => {
      extractDeadlineUpdate(
        'décale la date limite de 2 semaines',
        'décale la date limite de 2 semaines',
        mockFilters,
        updateData
      );

      expect(updateData.pushDeadlineBy).toBeDefined();
      expect(updateData.pushDeadlineBy?.weeks).toBe(2);
    });

    it('devrait détecter "reporte de 10 jours"', () => {
      extractDeadlineUpdate('reporte de 10 jours', 'reporte de 10 jours', mockFilters, updateData);

      expect(updateData.pushDeadlineBy).toBeDefined();
      expect(updateData.pushDeadlineBy?.days).toBe(10);
    });
  });

  describe('Parsing des articles', () => {
    it.each([
      ['devrait parser "d\'un mois" comme 1 mois', "pousse leur deadline d'un mois", 'months', 1],
      [
        'devrait parser "d\'une semaine" comme 1 semaine',
        "pousse leur deadline d'une semaine",
        'weeks',
        1,
      ],
      ['devrait parser "de un mois" comme 1 mois', 'pousse leur deadline de un mois', 'months', 1],
    ] as const)('%s', (_title, input, unit, value) => {
      extractDeadlineUpdate(input, input, mockFilters, updateData);

      expect(updateData.pushDeadlineBy?.[unit]).toBe(value);
    });
  });

  describe('Cas sans delta', () => {
    it('devrait retourner null si "pousse la deadline" sans quantité', () => {
      extractDeadlineUpdate('pousse la deadline', 'pousse la deadline', mockFilters, updateData);

      // Pas de mutation si pas de delta
      expect(updateData.pushDeadlineBy).toBeUndefined();
    });
  });

  describe('Unités supportées', () => {
    it.each([
      ['devrait supporter "jours"', 'pousse leur deadline de 5 jours', 'days', 5],
      ['devrait supporter "semaines"', 'pousse leur deadline de 3 semaines', 'weeks', 3],
      ['devrait supporter "mois"', 'pousse leur deadline de 2 mois', 'months', 2],
    ] as const)('%s', (_title, input, unit, value) => {
      extractDeadlineUpdate(input, input, mockFilters, updateData);

      expect(updateData.pushDeadlineBy?.[unit]).toBe(value);
    });
  });
});
