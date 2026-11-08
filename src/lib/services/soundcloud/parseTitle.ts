/**
 * Parse SoundCloud title to extract artist and title
 * Handles formats like "Youssou N'Dour - KIRIKOU (LARIAN FLIP)"
 */

// Découpages en temps linéaire (sans regex à retour arrière, cf. Sonar S8786).
// Ils renvoient les mêmes groupes que les anciennes regex.

/** « Artiste - Titre (Remix) » : /^(.+?)\s*-\s*(.+?)\s*\(([^)]+)\)$/ */
export function matchDashParen(title: string): [string, string, string] | null {
  if (!title.endsWith(')')) return null;
  const dash = title.indexOf('-', 1);
  if (dash < 0) return null;
  const previousClose = title.lastIndexOf(')', title.length - 2);
  const firstTitleChar = title.slice(dash + 1).search(/\S/);
  if (firstTitleChar < 0) return null;
  const open = title.indexOf('(', Math.max(previousClose + 1, dash + 2 + firstTitleChar));
  if (open < 0) return null;
  const inner = title.slice(open + 1, -1);
  if (!inner) return null;
  return [title.slice(0, dash), title.slice(dash + 1, open), inner];
}

/** « Artiste - Titre » : /^(.+?)\s*-\s*(.+)$/ */
export function matchDash(title: string): [string, string] | null {
  const dash = title.indexOf('-', 1);
  if (dash < 0 || dash === title.length - 1) return null;
  return [title.slice(0, dash), title.slice(dash + 1)];
}

const TRAILING_REMIX = /\s(FLIP|REMIX|BOOTLEG|EDIT|REWORK)[)\]]$/i;

/** « Titre (Artiste REMIX) » : /^(.+?)\s*[([](.+?)\s+(FLIP|…)[)\]]$/i */
export function matchBracketRemix(title: string): [string, string, string] | null {
  const end = TRAILING_REMIX.exec(title);
  if (!end) return null;
  const before = title.slice(0, end.index);
  const open = before.slice(1).search(/[([]/) + 1;
  if (open < 1) return null;
  const artist = before.slice(open + 1);
  if (!artist.trim()) return null;
  return [title.slice(0, open), artist, end[1]];
}

/**
 * « Titre : X par Y » → [_, X], comme /Titre\s*[:\u00A0]\s*(.+?)(?:\s+par\s+|$)/i
 * mais en temps linéaire (Sonar S8786) : le texte vient d'une page récupérée.
 */
export function matchTitreField(text: string): [string, string] | null {
  const label = /Titre[^\S\n]*[:\u00A0]/i.exec(text);
  if (!label) return null;
  const rest = text.slice(label.index + label[0].length).replace(/^\s+/, '');
  const line = rest.split('\n', 1)[0];
  const by = line.search(/\spar\s/i);
  const title = (by < 0 ? line : line.slice(0, by)).trimEnd();
  return title ? [label[0] + title, title] : null;
}

/**
 * Normalizes artist name (ex: "larian67" -> "Larian")
 */
export function normalizeArtistName(name: string): string {
  if (!name) return name;
  // Capitalize first letter and remove trailing numbers if present
  const normalized = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
  // Remove trailing numbers (ex: larian67 -> Larian)
  return normalized.replace(/(?<!\d)\d+$/, '');
}

// Termes de remix reconnus dans la partie entre parenthèses ou dans le titre
const REMIX_TERM_PATTERNS = [
  /\b(FLIP|flip)\b/i,
  /\b(REMIX|remix)\b/i,
  /\b(BOOTLEG|bootleg)\b/i,
  /\b(EDIT|edit)\b/i,
  /\b(REWORK|rework)\b/i,
];

type ParsedParts = { artist: string; title: string };

// "Artiste - Titre (REMIX TERM)" : garde tout le contenu du remix (ex : "LARIAN FLIP")
function parseDashParen(match: [string, string, string], profileName: string): ParsedParts {
  const artistPart = match[0].trim();
  const titlePart = match[1].trim();
  const remixPart = match[2].trim();

  // Check if remix part contains profile name or remix term
  const hasRemixTerm = REMIX_TERM_PATTERNS.some((p) => p.test(remixPart));
  const hasProfileName = remixPart.toLowerCase().includes(profileName.toLowerCase());

  if (hasRemixTerm || hasProfileName) {
    return { artist: `${artistPart} (${remixPart})`, title: titlePart };
  }
  // No remix, just artist - title (remix info)
  return { artist: artistPart, title: titlePart };
}

// "Artiste - Titre" sans parenthèses : le terme de remix du titre passe dans l'artiste
function parseDashPlain(match: [string, string]): ParsedParts {
  const artistPart = match[0].trim();
  const titlePart = match[1].trim();

  // Check if title contains remix term
  const titleHasRemix = REMIX_TERM_PATTERNS.some((p) => p.test(titlePart));
  if (!titleHasRemix) {
    return { artist: artistPart, title: titlePart };
  }

  const remixMatch = /\b(FLIP|REMIX|BOOTLEG|EDIT|REWORK)\b/i.exec(titlePart);
  if (!remixMatch) {
    return { artist: artistPart, title: titlePart };
  }
  const remixTerm = remixMatch[1].toUpperCase();
  // Remove remix term from title
  return {
    artist: `${artistPart} (${remixTerm})`,
    title: titlePart.replace(/\b(FLIP|REMIX|BOOTLEG|EDIT|REWORK)\b/gi, '').trim(),
  };
}

// "Titre (Artiste REMIX)" ou "Titre [Artiste REMIX]"
function parseBracketRemix(match: [string, string, string]): ParsedParts {
  const titlePart = match[0].trim();
  const artistPart = match[1].trim();
  const remixTerm = match[2].toUpperCase();
  return { artist: `${artistPart} (${remixTerm})`, title: titlePart };
}

// Choisit le motif reconnu ; sans motif, le titre tel quel et le profil comme artiste
function parseRawTitle(title: string, profileName: string, normalizedProfile: string): ParsedParts {
  // Pattern 1: "Artist - Title (REMIX TERM)"
  // Ex: "Youssou N'Dour - KIRIKOU (LARIAN FLIP)"
  const match1 = matchDashParen(title);
  if (match1) return parseDashParen(match1, profileName);

  // Pattern 2: "Artist - Title" (without parentheses)
  const match2 = matchDash(title);
  if (match2) return parseDashPlain(match2);

  // Pattern 3: "Title (Artist REMIX)" or "Title [Artist REMIX]"
  const match3 = matchBracketRemix(title);
  if (match3) return parseBracketRemix(match3);

  // No recognized pattern, use title as-is and profile as artist
  return { artist: normalizedProfile, title };
}

// Capitalise le titre : chaque mot si tout est en majuscules, sinon la première lettre seulement
function capitalizeTitle(title: string): string {
  if (title === title.toUpperCase() && title.length > 1) {
    return title
      .toLowerCase()
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
  return title.charAt(0).toUpperCase() + title.slice(1);
}

/**
 * Parse SoundCloud title to extract artist and title
 * Handles formats like "Youssou N'Dour - KIRIKOU (LARIAN FLIP)"
 *
 * @param title - The full title from SoundCloud
 * @param profileName - The SoundCloud profile name (ex: "larian67")
 * @returns An object with artist and title parsed
 */
export function parseSoundCloudTitle(
  title: string,
  profileName: string
): { artist: string; title: string } {
  const normalizedProfile = normalizeArtistName(profileName);
  if (!title) {
    return { artist: normalizedProfile, title: '' };
  }

  const parsed = parseRawTitle(title, profileName, normalizedProfile);
  return {
    artist: parsed.artist.trim(),
    title: capitalizeTitle(parsed.title).trim(),
  };
}

/**
 * Detect track type from title
 */
export function detectTrackType(
  title: string
): 'single' | 'ep' | 'album' | 'remix' | 'live' | 'djset' | 'video' {
  const lowerTitle = title.toLowerCase();

  // Detect remixes (FLIP, REMIX, BOOTLEG, EDIT, REWORK)
  if (
    lowerTitle.includes('remix') ||
    lowerTitle.includes('remix by') ||
    lowerTitle.includes('flip') ||
    lowerTitle.includes('bootleg') ||
    lowerTitle.includes('edit') ||
    lowerTitle.includes('rework')
  ) {
    return 'remix';
  }
  if (lowerTitle.includes('dj set') || lowerTitle.includes('djset') || lowerTitle.includes('mix')) {
    return 'djset';
  }
  if (lowerTitle.includes('live')) {
    return 'live';
  }
  if (lowerTitle.includes('ep')) {
    return 'ep';
  }
  if (lowerTitle.includes('album')) {
    return 'album';
  }
  if (lowerTitle.includes('video') || lowerTitle.includes('clip')) {
    return 'video';
  }

  // Default to single for SoundCloud
  return 'single';
}
