/**
 * Ref de rappel qui donne le focus à l'élément quand il apparaît, comme `autoFocus`
 * (signalé par Sonar S9379), pour les modales et champs où c'est voulu.
 * Fonction stable : React ne l'appelle qu'au montage, pas à chaque rendu.
 */
export const focusOnMount = (element: HTMLElement | null): void => {
  element?.focus();
};
