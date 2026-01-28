/**
 * Environment detection utilities
 */

/**
 * Checks if the current environment is a browser
 */
export const isBrowser = (): boolean => {
  return typeof window !== 'undefined' && window !== null && typeof window.document !== 'undefined';
};

/**
 * Checks if the current environment is server-side
 */
export const isServer = (): boolean => !isBrowser();

/**
 * Reloads the page if in a browser environment
 */
export const reloadPage = (): void => {
  if (isBrowser()) {
    window.location.reload();
  }
};
