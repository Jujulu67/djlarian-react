/**
 * Version de l'interface (refonte « Liquid Night »).
 *
 * L'UI v2 est développée à côté de l'UI legacy pour pouvoir comparer les deux :
 * la version est stockée dans un cookie et posée sur <html data-ui="...">.
 * On bascule avec `?ui=v2` ou `?ui=legacy` dans n'importe quelle URL (voir src/proxy.ts).
 */

export const UI_VERSIONS = ['legacy', 'v2'] as const;
export type UiVersion = (typeof UI_VERSIONS)[number];

export const UI_VERSION_COOKIE = 'ui';
export const UI_VERSION_PARAM = 'ui';
export const DEFAULT_UI_VERSION: UiVersion = 'legacy';
export const UI_VERSION_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 an

export function parseUiVersion(value: string | null | undefined): UiVersion | null {
  return UI_VERSIONS.includes(value as UiVersion) ? (value as UiVersion) : null;
}

export function resolveUiVersion(value: string | null | undefined): UiVersion {
  return parseUiVersion(value) ?? DEFAULT_UI_VERSION;
}
