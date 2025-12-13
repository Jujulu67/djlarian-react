/**
 * Dictionnaire NLP centralisé pour le parsing de requêtes assistant
 *
 * Centralise les verbes, alias, synonymes et patterns pour éviter la duplication
 * dans les différents extractors (detectFilters, deadline-updates, status-updates, etc.)
 */

/**
 * Verbes de mise à jour (modification de projets)
 */
export const UpdateVerbs = [
  'passe',
  'passer',
  'mets',
  'met',
  'mettre',
  'marque',
  'marquer',
  'ajoute',
  'ajouter',
  'retarde',
  'retarder',
  'pousse',
  'pousser',
  'déplace',
  'déplacer',
  'décal',
  'décaler',
  'repousse',
  'repousser',
  'reporte',
  'reporter',
  'change',
  'changer',
  'modifie',
  'modifier',
  'avance',
  'avancer',
  'prévoit',
  'prévoir',
  'recule',
  'recul',
  'reculer',
  'enlève',
  'enlever',
  'enleve',
  'retire',
  'retirer',
  'remove',
  'subtract',
  'push',
  'delay',
  'postpone',
  'move',
  'set',
  'update',
] as const;

/**
 * Verbes de listing (affichage de projets)
 */
export const ListVerbs = [
  'affiche',
  'afficher',
  'montre',
  'montrer',
  'liste',
  'lister',
  'donne',
  'donner',
  'show',
  'list',
  'display',
  'get',
] as const;

/**
 * Pronoms et mots de scope (pour identifier les projets ciblés)
 */
export const ScopePronouns = [
  'leur',
  'leurs',
  'les',
  'le',
  'la',
  "l'",
  'son',
  'sa',
  'ses',
  'mes',
  'mon',
  'ma',
  'nos',
  'notre',
  'vos',
  'votre',
  'ces',
  'ceux',
  'ceux-ci',
  'celles',
  'celles-ci',
] as const;

/**
 * Phrases pour "tous les projets" (scope global)
 */
export const AllProjectsPhrases = [
  'tous les projets',
  'toutes les projets',
  'tout les projets',
  'tous projets',
  'toutes projets',
  'all projects',
  'every project',
  'all',
  'tous',
  'toutes',
  'global',
] as const;

/**
 * Synonymes de statuts (map vers les enums internes)
 */
export const StatusSynonyms: Record<string, string> = {
  // TERMINE
  terminé: 'TERMINE',
  terminée: 'TERMINE',
  terminées: 'TERMINE',
  terminés: 'TERMINE',
  fini: 'TERMINE',
  finie: 'TERMINE',
  finies: 'TERMINE',
  finis: 'TERMINE',
  done: 'TERMINE',
  completed: 'TERMINE',
  finished: 'TERMINE',
  // EN_COURS
  'en cours': 'EN_COURS',
  'en-cours': 'EN_COURS',
  encours: 'EN_COURS',
  'in progress': 'EN_COURS',
  inprogress: 'EN_COURS',
  progress: 'EN_COURS',
  active: 'EN_COURS',
  // ANNULE
  annulé: 'ANNULE',
  annulée: 'ANNULE',
  annulées: 'ANNULE',
  annulés: 'ANNULE',
  cancel: 'ANNULE',
  cancelled: 'ANNULE',
  canceled: 'ANNULE',
  // A_REWORK
  'à rework': 'A_REWORK',
  'a rework': 'A_REWORK',
  rework: 'A_REWORK',
  // GHOST_PRODUCTION
  'ghost production': 'GHOST_PRODUCTION',
  ghost: 'GHOST_PRODUCTION',
  ghostprod: 'GHOST_PRODUCTION',
} as const;

/**
 * Alias de champs (synonymes pour les propriétés de projet)
 */
export const FieldAliases: Record<string, string> = {
  // Progress / Avancement
  avancement: 'progress',
  progression: 'progress',
  progress: 'progress',
  pourcent: 'progress',
  pourcentage: 'progress',
  '%': 'progress',
  niveau: 'progress',
  // Deadline
  deadline: 'deadline',
  'dead line': 'deadline',
  dealine: 'deadline',
  'date limite': 'deadline',
  'date-limite': 'deadline',
  datelimite: 'deadline',
  due: 'deadline',
  // Status
  statut: 'status',
  status: 'status',
  état: 'status',
  etat: 'status',
  state: 'status',
  // Collab
  collab: 'collab',
  collaborateur: 'collab',
  collaborateurs: 'collab',
  feat: 'collab',
  featuring: 'collab',
  partenaire: 'collab',
  'avec qui': 'collab',
  // Style
  style: 'style',
  genre: 'style',
  type: 'style',
  // Release Date
  'date de sortie': 'releaseDate',
  'date sortie': 'releaseDate',
  sortie: 'releaseDate',
  release: 'releaseDate',
  quand: 'releaseDate',
  when: 'releaseDate',
} as const;

/**
 * Synonymes d'unités de temps (pour parsing de deadlines)
 */
export const TimeUnitsSynonyms: Record<
  string,
  { days?: number; weeks?: number; months?: number; years?: number }
> = {
  // Jours
  jour: { days: 1 },
  jours: { days: 1 },
  day: { days: 1 },
  days: { days: 1 },
  // Semaines
  semaine: { weeks: 1 },
  semaines: { weeks: 1 },
  week: { weeks: 1 },
  weeks: { weeks: 1 },
  // Mois
  mois: { months: 1 },
  month: { months: 1 },
  months: { months: 1 },
  // Ans
  an: { years: 1 },
  ans: { years: 1 },
  année: { years: 1 },
  années: { years: 1 },
  year: { years: 1 },
  years: { years: 1 },
} as const;

/**
 * Construit une partie d'alternation regex à partir d'un tableau de mots
 * Ex: BuildAlternationRegexPart(['passe', 'mets']) → "(?:passe|mets)"
 *
 * @param words - Tableau de mots à alterner
 * @returns Partie regex pour alternation
 */
export function BuildAlternationRegexPart(words: readonly string[]): string {
  if (words.length === 0) return '';
  if (words.length === 1) return words[0];
  return `(?:${words.join('|')})`;
}

/**
 * Normalise les espaces multiples en un seul espace
 *
 * @param input - Texte à normaliser
 * @returns Texte avec espaces normalisés
 */
export function NormalizeWhitespace(input: string): string {
  return input.replace(/\s+/g, ' ').trim();
}

/**
 * Normalise les accents (é → e, à → a, etc.)
 * Utile pour tolérer les fautes de frappe et variations
 *
 * @param input - Texte à normaliser
 * @returns Texte sans accents
 */
export function NormalizeAccents(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Supprime les diacritiques
    .replace(/['\u2019]/g, "'"); // Normalise les apostrophes
}

/**
 * Normalise une chaîne pour le traitement NLP
 * Combine normalisation des espaces et accents
 *
 * @param input - Texte à normaliser
 * @returns Texte normalisé pour NLP
 */
export function NormalizeForNlp(input: string): string {
  return NormalizeWhitespace(NormalizeAccents(input));
}
