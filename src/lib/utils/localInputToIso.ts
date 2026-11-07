/**
 * « 2026-12-15T21:00 » (valeur d'un champ datetime-local, en heure locale et sans fuseau)
 * devient une date ISO en UTC. Sans ça, le serveur (en UTC) lit l'heure comme de l'UTC
 * et l'événement se décale du fuseau du navigateur à chaque enregistrement.
 * Les autres valeurs (déjà ISO, date seule) sont rendues telles quelles.
 */
export function localInputToIso(value: string | null | undefined): string | null {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(value)) return value;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}
