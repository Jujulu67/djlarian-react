/**
 * Classes des menus utilisateur en UI v2.
 *
 * En v2 on n'utilise pas `.navMenuItem*` : leurs couleurs sont posées en `!important`
 * dans globals.css (specificité `header nav a.navMenuItem…`) et ne peuvent pas être
 * surchargées par une classe utilitaire. Les menus legacy gardent `.navMenuItem*`.
 */
const V2_ITEM_BASE =
  'flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition-colors duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] focus:outline-none active:scale-[0.98]';

const V2_ITEM_DEFAULT = `${V2_ITEM_BASE} text-white/75 hover:bg-white/[0.06] hover:text-white focus-visible:bg-white/[0.06] focus-visible:text-white`;

const V2_ITEM_DANGER = `${V2_ITEM_BASE} text-red-300/90 hover:bg-red-500/10 hover:text-red-200 focus-visible:bg-red-500/10 focus-visible:text-red-200`;

/** Classes d'un item de menu : `legacy` en UI legacy, recette v2 sinon */
export function userMenuItemClass(
  isV2: boolean,
  legacy: string,
  tone: 'default' | 'danger' = 'default'
): string {
  if (!isV2) return legacy;
  return tone === 'danger' ? V2_ITEM_DANGER : V2_ITEM_DEFAULT;
}

/** Panneau du menu en v2 : verre niveau 2, coins 2xl (à ajouter aux classes legacy via `v2:`) */
export const USER_MENU_PANEL_V2 = 'v2:w-56 v2:rounded-2xl v2:surface-2';
