'use client';

import { useState } from 'react';

import { DEFAULT_UI_VERSION, resolveUiVersion, type UiVersion } from '@/lib/ui-version';

/**
 * Version d'UI active, lue sur <html data-ui> (posé côté serveur par le layout racine).
 * Sert à monter les éléments propres à l'UI v2 (fond ambiant, footer, etc.).
 */
export function useUiVersion(): UiVersion {
  // L'attribut ne change qu'au rechargement de page : une lecture initiale suffit
  const [version] = useState<UiVersion>(() =>
    typeof document === 'undefined'
      ? DEFAULT_UI_VERSION
      : resolveUiVersion(document.documentElement.dataset.ui)
  );

  return version;
}
