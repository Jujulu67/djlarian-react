/** Lien actif : correspondance exacte, ou préfixe de route (sauf la racine '/'). */
export function isNavLinkActive(pathname: string | null | undefined, href: string): boolean {
  return pathname ? pathname === href || (href !== '/' && pathname.startsWith(href)) : false;
}

/** Affiche l'entrée Arcade si l'utilisateur a un high score ou a découvert le casino. */
export function hasArcadeAccess(
  user:
    | {
        gameHighScore?: number | null;
        hasDiscoveredCasino?: boolean | null;
      }
    | null
    | undefined
): boolean {
  return (user?.gameHighScore || 0) > 0 || !!user?.hasDiscoveredCasino;
}

/** Source de l'avatar (version desktop) : les images Google passent par le proxy. */
export function getDesktopAvatarSrc(image: string): string {
  return image.startsWith('http://') || image.startsWith('https://')
    ? image.includes('googleusercontent.com')
      ? `/api/images/proxy?url=${encodeURIComponent(image)}`
      : image
    : image;
}
