/**
 * Tests unitaires pour isScopingFilter
 */

import { isScopingFilter } from '../router';
import type { ProjectFilter } from '../types';

describe('isScopingFilter', () => {
  it('devrait retourner true pour un filtre avec status', () => {
    const filter: ProjectFilter = { status: 'TERMINE' };
    expect(isScopingFilter(filter)).toBe(true);
  });

  it('devrait retourner true pour un filtre avec collab', () => {
    const filter: ProjectFilter = { collab: 'hoho' };
    expect(isScopingFilter(filter)).toBe(true);
  });

  it('devrait retourner true pour un filtre avec style', () => {
    const filter: ProjectFilter = { style: 'afro' };
    expect(isScopingFilter(filter)).toBe(true);
  });

  it('devrait retourner true pour un filtre avec label', () => {
    const filter: ProjectFilter = { label: 'ouioui' };
    expect(isScopingFilter(filter)).toBe(true);
  });

  it('devrait retourner true pour un filtre avec labelFinal', () => {
    const filter: ProjectFilter = { labelFinal: 'true' };
    expect(isScopingFilter(filter)).toBe(true);
  });

  it('devrait retourner true pour un filtre avec hasDeadline', () => {
    const filter: ProjectFilter = { hasDeadline: true };
    expect(isScopingFilter(filter)).toBe(true);
  });

  it('devrait retourner true pour un filtre avec minProgress', () => {
    const filter: ProjectFilter = { minProgress: 50 };
    expect(isScopingFilter(filter)).toBe(true);
  });

  it('devrait retourner true pour un filtre avec maxProgress', () => {
    const filter: ProjectFilter = { maxProgress: 80 };
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
