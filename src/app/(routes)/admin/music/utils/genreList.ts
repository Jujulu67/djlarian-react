/**
 * Ajoute le genre saisi à la liste.
 * Retourne null si rien ne doit être ajouté (saisie vide ou genre déjà présent).
 */
export function addGenreToList(genres: string[], input: string): string[] | null {
  const value = input.trim();
  if (!value || genres.includes(value)) return null;
  return [...genres, value];
}

/** Retire un genre de la liste. */
export function removeGenreFromList(genres: string[], genre: string): string[] {
  return genres.filter((x) => x !== genre);
}
