/**
 * Nom du fichier audio à jouer pour le comparatif avant/après.
 * L'original est toujours le fichier "dry", le traité prend le nom du mode.
 */
export function getComparisonFileName(
  type: 'original' | 'processed',
  activeMode: string,
  gainMatch: boolean
): string {
  const modeSuffix = type === 'processed' ? activeMode : 'dry';
  const gainSuffix = gainMatch ? '_norm' : '';
  return `${modeSuffix}${gainSuffix}.wav`;
}
