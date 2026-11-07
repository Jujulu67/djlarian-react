/**
 * Règles pures des votes en live : saisie des participants, décompte, égalités, minuterie.
 * Aucune dépendance à la base, pour être testées seules.
 */

export const POLL_LIMITS = {
  titleMaxLength: 120,
  labelMaxLength: 80,
  minOptions: 2,
  maxOptions: 50,
  minDurationSec: 10,
  maxDurationSec: 30 * 60,
  maxExtendSec: 10 * 60,
} as const;

export const POLL_STATUS = {
  DRAFT: 'DRAFT',
  ACTIVE: 'ACTIVE',
  FINISHED: 'FINISHED',
} as const;

export type PollStatus = (typeof POLL_STATUS)[keyof typeof POLL_STATUS];

/** Puces et numéros en tête de ligne : « 1. », « 2) », « #3 - », « - », « • », « * ». */
const LEADING_MARKER = /^(?:#?\d{1,3}\s*[.)\-:–]\s*|[-•*–]\s+)/;

function cleanLabel(raw: string): string {
  return raw
    .replace(LEADING_MARKER, '')
    .replaceAll(/\s+/g, ' ')
    .trim()
    .slice(0, POLL_LIMITS.labelMaxLength);
}

/**
 * Transforme un copier-coller en liste de participants : une ligne par nom, ou des noms
 * séparés par des virgules ou points-virgules s'il n'y a qu'une ligne. Retire les puces
 * et numéros, les lignes vides et les doublons (sans tenir compte de la casse).
 */
export function parseParticipants(text: string): string[] {
  const lines = text.split(/\r?\n/).filter((line) => line.trim() !== '');
  const pieces = lines.length === 1 ? lines[0].split(/[,;]/) : lines;

  const seen = new Set<string>();
  const labels: string[] = [];
  for (const piece of pieces) {
    const label = cleanLabel(piece);
    const key = label.toLocaleLowerCase('fr');
    if (label === '' || seen.has(key)) continue;
    seen.add(key);
    labels.push(label);
  }
  return labels;
}

export type TallyEntry = { optionId: string; votes: number };

export type RoundOutcome =
  | { kind: 'winner'; winnerId: string }
  | { kind: 'tie'; tiedIds: string[] };

/**
 * Compte les voix d'une manche. L'ordre des candidats sert à départager l'affichage
 * à égalité de voix (ordre de saisie), pas le résultat.
 */
export function tallyVotes(
  candidateIds: readonly string[],
  votes: ReadonlyArray<{ optionId: string }>
): TallyEntry[] {
  const counts = new Map<string, number>(candidateIds.map((id) => [id, 0]));
  for (const { optionId } of votes) {
    const current = counts.get(optionId);
    if (current !== undefined) counts.set(optionId, current + 1);
  }
  return candidateIds
    .map((optionId, index) => ({ optionId, votes: counts.get(optionId) ?? 0, index }))
    .sort((a, b) => b.votes - a.votes || a.index - b.index)
    .map(({ optionId, votes }) => ({ optionId, votes }));
}

/** Gagnant unique, ou liste des ex æquo en tête (tous les candidats si personne n'a voté). */
export function getRoundOutcome(tally: readonly TallyEntry[]): RoundOutcome {
  if (tally.length === 0) return { kind: 'tie', tiedIds: [] };
  const best = tally[0].votes;
  const tiedIds = tally.filter((entry) => entry.votes === best).map((entry) => entry.optionId);
  return tiedIds.length === 1 ? { kind: 'winner', winnerId: tiedIds[0] } : { kind: 'tie', tiedIds };
}

export function isRoundOpen(round: { endsAt: Date | string }, now: Date = new Date()): boolean {
  return new Date(round.endsAt).getTime() > now.getTime();
}

/** Secondes restantes (arrondies au-dessus), 0 si la manche est terminée. */
export function secondsLeft(endsAt: Date | string | number, nowMs: number): number {
  return Math.max(0, Math.ceil((new Date(endsAt).getTime() - nowMs) / 1000));
}

export function formatCountdown(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

/** Alphabet sans caractères ambigus (0/O, 1/I/L) pour un code lisible à l'oral. */
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const POLL_CODE_LENGTH = 6;
export const POLL_CODE_PATTERN = new RegExp(`^[${CODE_ALPHABET}]{${POLL_CODE_LENGTH}}$`);

/** `randomInt(max)` doit renvoyer un entier uniforme dans [0, max) (crypto côté serveur). */
export function generatePollCode(randomInt: (max: number) => number): string {
  let code = '';
  for (let i = 0; i < POLL_CODE_LENGTH; i++) {
    code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  }
  return code;
}

export function normalizePollCode(raw: string): string {
  return raw.trim().toUpperCase();
}
