/**
 * Fond de l'UI v3 « Signal » : noir d'encre, une lueur UV en haut de page,
 * la grille de colonnes très fine (vue d'arrangement) et un grain animé.
 * CSS pur, grain figé si prefers-reduced-motion.
 */
export default function SignalBackdrop() {
  return (
    <div aria-hidden="true" className="signal-backdrop">
      <div className="signal-backdrop__grid" />
      <div className="signal-backdrop__grain" />
    </div>
  );
}
