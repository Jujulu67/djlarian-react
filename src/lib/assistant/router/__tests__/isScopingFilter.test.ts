/**
 * Tests unitaires pour isScopingFilter
 */

import { isScopingFilter } from '../router';
import type { ProjectFilter } from '../types';

describe('isScopingFilter', () => {
  it.each<[string, ProjectFilter]>([
    ['status', { status: 'TERMINE' }],
    ['collab', { collab: 'hoho' }],
    ['style', { style: 'afro' }],
    ['label', { label: 'ouioui' }],
    ['labelFinal', { labelFinal: 'true' }],
    ['hasDeadline', { hasDeadline: true }],
    ['minProgress', { minProgress: 50 }],
    ['maxProgress', { maxProgress: 80 }],
  ])('devrait retourner true pour un filtre avec %s', (_label, filter) => {
    expect(isScopingFilter(filter)).toBe(true);
  });

  it('devrait retourner false pour un filtre vide', () => {
    const filter: ProjectFilter = {};
    expect(isScopingFilter(filter)).toBe(false);
  });

  it('devrait retourner false pour null', () => {
    expect(isScopingFilter(null)).toBe(false);
  });

  it('devrait retourner false pour undefined', () => {
    expect(isScopingFilter(undefined)).toBe(false);
  });

  it('devrait retourner true pour un filtre avec plusieurs critères scoping', () => {
    const filter: ProjectFilter = {
      status: 'TERMINE',
      collab: 'hoho',
      style: 'afro',
    };
    expect(isScopingFilter(filter)).toBe(true);
  });

  it('devrait retourner true pour un filtre avec hasDeadline même seul', () => {
    const filter: ProjectFilter = { hasDeadline: true };
    expect(isScopingFilter(filter)).toBe(true);
  });

  it('devrait retourner true pour un filtre avec hasDeadline false', () => {
    const filter: ProjectFilter = { hasDeadline: false };
    expect(isScopingFilter(filter)).toBe(true);
  });
});
