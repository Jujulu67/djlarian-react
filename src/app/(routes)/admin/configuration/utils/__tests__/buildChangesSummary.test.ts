import { initialConfigs } from '@/types/config';
import type { AllConfigs } from '@/types/config';

import { buildChangesSummary, formatChangeValue } from '../buildChangesSummary';

const clone = (c: AllConfigs): AllConfigs => JSON.parse(JSON.stringify(c));

describe('formatChangeValue', () => {
  it('formats booleans', () => {
    expect(formatChangeValue(true)).toBe('Activé');
    expect(formatChangeValue(false)).toBe('Désactivé');
  });

  it('formats empty values as a placeholder span', () => {
    const empty = '<span class="text-gray-500">[Vide]</span>';
    expect(formatChangeValue(null)).toBe(empty);
    expect(formatChangeValue(undefined)).toBe(empty);
    expect(formatChangeValue('')).toBe(empty);
  });

  it('truncates strings longer than 50 characters', () => {
    const long = 'a'.repeat(60);
    expect(formatChangeValue(long)).toBe(`"${'a'.repeat(47)}..."`);
  });

  it('keeps strings of exactly 50 characters untouched (JSON encoded)', () => {
    const exact = 'b'.repeat(50);
    expect(formatChangeValue(exact)).toBe(JSON.stringify(exact));
  });

  it('JSON encodes numbers and short strings', () => {
    expect(formatChangeValue(42)).toBe('42');
    expect(formatChangeValue('court')).toBe('"court"');
  });
});

describe('buildChangesSummary', () => {
  it('returns the loading message when there is no previous snapshot', () => {
    expect(buildChangesSummary(clone(initialConfigs), null)).toBe(
      'Chargement de la configuration initiale...'
    );
  });

  it('returns the no-change message when configs are identical', () => {
    expect(buildChangesSummary(clone(initialConfigs), clone(initialConfigs))).toBe(
      'Aucune modification détectée depuis la dernière sauvegarde.'
    );
  });

  it('lists changed values with section titles and before/after values', () => {
    const previous = clone(initialConfigs);
    const current = clone(initialConfigs);
    current.general.siteName = 'Nouveau nom';
    current.notifications.emailNotifications = !previous.notifications.emailNotifications;

    const summary = buildChangesSummary(current, previous);

    expect(summary).toContain('<span class="text-cyan-300 font-bold">General:</span>');
    expect(summary).toContain('Nom du site');
    expect(summary).not.toContain('general.siteName');
    expect(summary).toContain('"Nouveau nom"');
    expect(summary).toContain('<span class="text-cyan-300 font-bold">Notifications:</span>');
    expect(summary).toContain('Notifications par email');
    expect(summary).not.toContain('notifications.emailNotifications');
    expect(summary.indexOf('General:')).toBeLessThan(summary.indexOf('Notifications:'));
    expect(summary).not.toContain('Aucune modification');
  });

  it('falls back to the raw section.key (labels are looked up with the prefixed key)', () => {
    const previous = clone(initialConfigs);
    const current = clone(initialConfigs);
    (current.security as unknown as Record<string, unknown>).unmappedKey = 'x';
    (previous.security as unknown as Record<string, unknown>).unmappedKey = 'y';

    expect(buildChangesSummary(current, previous)).toContain('security.unmappedKey');
  });
});
