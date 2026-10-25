import { DEFAULT_UI_VERSION, parseUiVersion, resolveUiVersion } from '../ui-version';

describe('ui-version', () => {
  it('reconnaît les versions valides', () => {
    expect(parseUiVersion('v2')).toBe('v2');
    expect(parseUiVersion('legacy')).toBe('legacy');
  });

  it('rejette les valeurs inconnues ou absentes', () => {
    expect(parseUiVersion('V2')).toBeNull();
    expect(parseUiVersion('')).toBeNull();
    expect(parseUiVersion(undefined)).toBeNull();
    expect(parseUiVersion(null)).toBeNull();
  });

  it('retombe sur la version par défaut', () => {
    expect(resolveUiVersion('nimporte')).toBe(DEFAULT_UI_VERSION);
    expect(resolveUiVersion(undefined)).toBe('legacy');
    expect(resolveUiVersion('v2')).toBe('v2');
  });
});
