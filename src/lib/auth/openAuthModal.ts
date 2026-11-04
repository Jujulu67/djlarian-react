/** Événement écouté par la navigation pour ouvrir la modale de connexion du site. */
export const OPEN_AUTH_MODAL_EVENT = 'open-auth-modal';

/** Ouvre la modale de connexion depuis n'importe quelle page (au lieu de la page NextAuth brute). */
export function openAuthModal(): void {
  window.dispatchEvent(new Event(OPEN_AUTH_MODAL_EVENT));
}
