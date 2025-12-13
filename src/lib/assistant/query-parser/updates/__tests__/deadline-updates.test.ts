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

    it('devrait détecter "pousse leur deadline d\'un mois"', () => {
      extractDeadlineUpdate(
        "pousse leur deadline d'un mois",
        "pousse leur deadline d'un mois",
        mockFilters,
        updateData
      );

      expect(updateData.pushDeadlineBy).toBeDefined();
      expect(updateData.pushDeadlineBy?.months).toBe(1);
    });

    it('devrait détecter "repousse la deadline d\'un mois"', () => {
      extractDeadlineUpdate(
        "repousse la deadline d'un mois",
        "repousse la deadline d'un mois",
        mockFilters,
        updateData
      );

      expect(updateData.pushDeadlineBy).toBeDefined();
      expect(updateData.pushDeadlineBy?.months).toBe(1);
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

    it('devrait détecter "ajoute 1 mois à la deadline"', () => {
      extractDeadlineUpdate(
        'ajoute 1 mois à la deadline',
        'ajoute 1 mois à la deadline',
        mockFilters,
        updateData
      );

      expect(updateData.pushDeadlineBy).toBeDefined();
      expect(updateData.pushDeadlineBy?.months).toBe(1);
    });
  });

  describe('Parsing des articles', () => {
    it('devrait parser "d\'un mois" comme 1 mois', () => {
      extractDeadlineUpdate(
        "pousse leur deadline d'un mois",
        "pousse leur deadline d'un mois",
        mockFilters,
        updateData
      );

      expect(updateData.pushDeadlineBy?.months).toBe(1);
    });

    it('devrait parser "d\'une semaine" comme 1 semaine', () => {
      extractDeadlineUpdate(
        "pousse leur deadline d'une semaine",
        "pousse leur deadline d'une semaine",
        mockFilters,
        updateData
      );

      expect(updateData.pushDeadlineBy?.weeks).toBe(1);
    });

    it('devrait parser "de un mois" comme 1 mois', () => {
      extractDeadlineUpdate(
        'pousse leur deadline de un mois',
        'pousse leur deadline de un mois',
        mockFilters,
        updateData
      );

      expect(updateData.pushDeadlineBy?.months).toBe(1);
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
    it('devrait supporter "jours"', () => {
      extractDeadlineUpdate(
        'pousse leur deadline de 5 jours',
        'pousse leur deadline de 5 jours',
        mockFilters,
        updateData
      );

      expect(updateData.pushDeadlineBy?.days).toBe(5);
    });

    it('devrait supporter "semaines"', () => {
      extractDeadlineUpdate(
        'pousse leur deadline de 3 semaines',
        'pousse leur deadline de 3 semaines',
        mockFilters,
        updateData
      );

      expect(updateData.pushDeadlineBy?.weeks).toBe(3);
    });

    it('devrait supporter "mois"', () => {
      extractDeadlineUpdate(
        'pousse leur deadline de 2 mois',
        'pousse leur deadline de 2 mois',
        mockFilters,
        updateData
      );

      expect(updateData.pushDeadlineBy?.months).toBe(2);
    });
  });
});
