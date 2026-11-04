/**
 * Fond ambiant de l'UI v2 : trois halos (violet, indigo, magenta) qui dérivent très lentement
 * derrière le contenu, plus un grain léger. C'est ce que le verre floute.
 * CSS pur (transform/opacity uniquement), figé si prefers-reduced-motion.
 */
export default function AmbientBackground() {
  return (
    <div aria-hidden="true" className="ambient">
      <div className="ambient__orb ambient__orb--brand" />
      <div className="ambient__orb ambient__orb--indigo" />
      <div className="ambient__orb ambient__orb--magenta" />
      <div className="ambient__grain" />
    </div>
  );
}
