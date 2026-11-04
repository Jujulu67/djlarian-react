import type { KeyboardEvent } from 'react';

/** Déclenche `action` sur Entrée ou Espace, comme un bouton natif. */
export function onActivateKey(action: () => void) {
  return (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      action();
    }
  };
}
