/**
 * Utilitaires pour gérer les flags d'avertissement globaux dans window
 * Permet d'éviter d'afficher plusieurs fois le même avertissement
 */

// Extension de l'interface Window pour typer correctement les flags
declare global {
  interface Window {
    __ingestLocalhostWarningShown?: boolean;
  }
}

/**
 * Vérifie si l'avertissement pour l'endpoint ingest localhost a déjà été affiché
 * @returns true si l'avertissement a déjà été affiché, false sinon
 */
export function hasIngestLocalhostWarningBeenShown(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  return window.__ingestLocalhostWarningShown === true;
}

/**
 * Marque l'avertissement pour l'endpoint ingest localhost comme ayant été affiché
 */
export function markIngestLocalhostWarningAsShown(): void {
  if (typeof window !== 'undefined') {
    window.__ingestLocalhostWarningShown = true;
  }
}

/**
 * Vérifie et marque l'avertissement si nécessaire
 * @returns true si l'avertissement doit être affiché (première fois), false sinon
 */
export function shouldShowIngestLocalhostWarning(): boolean {
  if (hasIngestLocalhostWarningBeenShown()) {
    return false;
  }
  markIngestLocalhostWarningAsShown();
  return true;
}
