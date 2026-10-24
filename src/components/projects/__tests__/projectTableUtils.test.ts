import type { Project } from '../types';
import {
  columnsCompact,
  columnsNormal,
  getCellValue,
  getStatusBorderColor,
  getTotalStreams,
} from '../project-table/utils';

const baseProject = {
  id: 'p1',
  name: 'Projet',
  status: 'EN_COURS',
} as unknown as Project;

describe('projectTable utils', () => {
  describe('getStatusBorderColor', () => {
    it.each([
      ['EN_COURS', 'border-l-blue-500'],
      ['TERMINE', 'border-l-emerald-500'],
      ['ANNULE', 'border-l-red-500'],
      ['A_REWORK', 'border-l-amber-500'],
      ['GHOST_PRODUCTION', 'border-l-purple-500'],
    ])('retourne la couleur de bordure du statut %s', (status, expected) => {
      expect(getStatusBorderColor(status as Project['status'])).toBe(expected);
    });

    it('retombe sur le bleu pour ARCHIVE (couleur slate absente de la map, comportement actuel)', () => {
      expect(getStatusBorderColor('ARCHIVE' as Project['status'])).toBe('border-l-blue-500');
    });

    it('retombe sur le bleu pour un statut inconnu', () => {
      expect(getStatusBorderColor('INCONNU' as Project['status'])).toBe('border-l-blue-500');
    });
  });

  describe('getTotalStreams', () => {
    it('additionne les 8 colonnes de streams', () => {
      const project = {
        ...baseProject,
        streamsJ7: 1,
        streamsJ14: 2,
        streamsJ21: 3,
        streamsJ28: 4,
        streamsJ56: 5,
        streamsJ84: 6,
        streamsJ180: 7,
        streamsJ365: 8,
      } as Project;
      expect(getTotalStreams(project)).toBe(36);
    });

    it('traite les valeurs nulles ou absentes comme 0', () => {
      const project = { ...baseProject, streamsJ7: null, streamsJ14: 10 } as Project;
      expect(getTotalStreams(project)).toBe(10);
      expect(getTotalStreams(baseProject)).toBe(0);
    });
  });

  describe('getCellValue', () => {
    it('retourne la valeur du champ demandé', () => {
      const project = { ...baseProject, name: 'Mon titre' } as Project;
      expect(getCellValue(project, 'name')).toBe('Mon titre');
    });

    it('retourne null quand le champ vaut null', () => {
      const project = { ...baseProject, style: null } as Project;
      expect(getCellValue(project, 'style')).toBeNull();
    });
  });

  describe('colonnes', () => {
    it('garde les mêmes clés en mode normal et compact', () => {
      expect(columnsNormal.map((c) => c.key)).toEqual(columnsCompact.map((c) => c.key));
    });

    it('commence toujours par la colonne name', () => {
      expect(columnsNormal[0].key).toBe('name');
      expect(columnsCompact[0].key).toBe('name');
    });
  });
});
