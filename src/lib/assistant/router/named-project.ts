/**
 * Repère un projet existant désigné par son nom dans une commande de modification
 * (« passe Fly à 50% », « mets le projet Dark Mage en terminé »).
 *
 * Le parseur ne connaît pas les noms des projets : sans ça, « à 50% » était lu comme
 * le filtre « les projets à 50 % » et le nom était ignoré.
 */
import type { Project } from '@/lib/domain/projects';

/** Mots de commande : un projet qui porte exactement ce nom n'est pas visé par erreur. */
const RESERVED_NAMES = new Set([
  'projet',
  'projets',
  'termine',
  'termines',
  'en cours',
  'annule',
  'annules',
  'ghost prod',
  'ghost production',
  'rework',
  'archive',
  'archives',
  'collab',
  'style',
  'label',
  'deadline',
  'note',
  'notes',
  'tous',
  'toutes',
]);

/** Commande qui vise explicitement plusieurs projets : pas de ciblage par nom. */
const PLURAL_SCOPE =
  /\b(?:les|tous\s+les|toutes\s+les|ces|mes|nos)\s+projets\b|\btous\b|\bpasse[- ]les\b|\bmets[- ]les\b/i;

/** Les notes ont leur propre extraction du nom de projet. */
const NOTE_REQUEST = /\bnotes?\b|\bsession\b/i;

const fold = (text: string) => text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);

export type NamedProjectResult =
  | { kind: 'none' }
  | { kind: 'ambiguous'; name: string; count: number }
  | { kind: 'found'; project: Project; rewrittenMessage: string };

/** Remplace le nom (et un « le projet » qui le précède) par « le projet ». */
function rewriteMessage(message: string, start: number, end: number): string {
  const before = message.slice(0, start).replace(/(?:\b(?:le|ce)\s+)?(?:projet\s+)?$/i, '');
  const rewritten = `${before}le projet${message.slice(end)}`;
  return rewritten
    .replace(/\bde le projet\b/gi, 'du projet')
    .replace(/\bdu le projet\b/gi, 'du projet')
    .replace(/\bà le projet\b/gi, 'au projet')
    .replace(/\bau le projet\b/gi, 'au projet');
}

export function findNamedProject(message: string, projects: Project[]): NamedProjectResult {
  if (NOTE_REQUEST.test(message) || PLURAL_SCOPE.test(message)) return { kind: 'none' };

  const original = message.normalize('NFC');
  const folded = fold(original);
  // Les positions trouvées dans le texte replié servent à découper l'original
  const source = folded.length === original.length ? original : folded;

  let best: { name: string; start: number; end: number } | null = null;
  const candidatesByName = new Map<string, Project[]>();

  for (const project of projects) {
    const name = fold(project.name ?? '')
      .trim()
      .replace(/\s+/g, ' ');
    if (name.length < 3 || RESERVED_NAMES.has(name)) continue;
    const pattern = new RegExp(
      String.raw`(?<![\p{L}\p{N}])${escapeRegExp(name).replace(/ /g, String.raw`\s+`)}(?![\p{L}\p{N}])`,
      'u'
    );
    const match = pattern.exec(folded);
    if (!match) continue;
    candidatesByName.set(name, [...(candidatesByName.get(name) ?? []), project]);
    if (!best || match[0].length > best.end - best.start) {
      best = { name, start: match.index, end: match.index + match[0].length };
    }
  }

  if (!best) return { kind: 'none' };
  const matches = candidatesByName.get(best.name) ?? [];
  if (matches.length > 1) {
    return { kind: 'ambiguous', name: matches[0].name, count: matches.length };
  }
  return {
    kind: 'found',
    project: matches[0],
    rewrittenMessage: rewriteMessage(source, best.start, best.end),
  };
}
