/**
 * Parse SoundCloud title to extract artist and title
 * Handles formats like "Youssou N'Dour - KIRIKOU (LARIAN FLIP)"
 */

/**
 * Normalizes artist name (ex: "larian67" -> "Larian")
 */
export function normalizeArtistName(name: string): string {
  if (!name) return name;
  // Capitalize first letter and remove trailing numbers if present
  const normalized = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
  // Remove trailing numbers (ex: larian67 -> Larian)
  return normalized.replace(/\d+$/, '');
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
  if (!title) {
    const normalizedProfile = normalizeArtistName(profileName);
    return { artist: normalizedProfile, title: '' };
  }

  const normalizedProfile = normalizeArtistName(profileName);
  let parsedArtist = normalizedProfile;
  let parsedTitle = title;

  // Detect remix terms (FLIP, REMIX, BOOTLEG, etc.)
  const remixPatterns = [
    /\b(FLIP|flip)\b/i,
    /\b(REMIX|remix)\b/i,
    /\b(BOOTLEG|bootleg)\b/i,
    /\b(EDIT|edit)\b/i,
    /\b(REWORK|rework)\b/i,
  ];

  // Pattern 1: "Artist - Title (REMIX TERM)"
  // Ex: "Youssou N'Dour - KIRIKOU (LARIAN FLIP)"
  const pattern1 = /^(.+?)\s*-\s*(.+?)\s*\(([^)]+)\)$/i;
  const match1 = title.match(pattern1);
  if (match1) {
    const artistPart = match1[1].trim();
    const titlePart = match1[2].trim();
    const remixPart = match1[3].trim();

    // Check if remix part contains profile name or remix term
    const hasRemixTerm = remixPatterns.some((p) => p.test(remixPart));
    const hasProfileName = remixPart.toLowerCase().includes(profileName.toLowerCase());

    if (hasRemixTerm || hasProfileName) {
      // Keep entire remix content (ex: "LARIAN FLIP" not just "FLIP")
      parsedArtist = `${artistPart} (${remixPart})`;
      parsedTitle = titlePart;
    } else {
      // No remix, just artist - title (remix info)
      parsedArtist = artistPart;
      parsedTitle = titlePart;
    }
  } else {
    // Pattern 2: "Artist - Title" (without parentheses)
    const pattern2 = /^(.+?)\s*-\s*(.+)$/;
    const match2 = title.match(pattern2);
    if (match2) {
      const artistPart = match2[1].trim();
      const titlePart = match2[2].trim();

      // Check if title contains remix term
      const titleHasRemix = remixPatterns.some((p) => p.test(titlePart));
      if (titleHasRemix) {
        // Find remix term
        const remixMatch = titlePart.match(/\b(FLIP|REMIX|BOOTLEG|EDIT|REWORK)\b/i);
        if (remixMatch) {
          const remixTerm = remixMatch[1].toUpperCase();
          parsedArtist = `${artistPart} (${remixTerm})`;
          // Remove remix term from title
          parsedTitle = titlePart.replace(/\b(FLIP|REMIX|BOOTLEG|EDIT|REWORK)\b/gi, '').trim();
        } else {
          parsedArtist = artistPart;
          parsedTitle = titlePart;
        }
      } else {
        parsedArtist = artistPart;
        parsedTitle = titlePart;
      }
    } else {
      // Pattern 3: "Title (Artist REMIX)" or "Title [Artist REMIX]"
      const pattern3 = /^(.+?)\s*[\(\[](.+?)\s+(FLIP|REMIX|BOOTLEG|EDIT|REWORK)[\)\]]$/i;
      const match3 = title.match(pattern3);
      if (match3) {
        const titlePart = match3[1].trim();
        const artistPart = match3[2].trim();
        const remixTerm = match3[3].toUpperCase();
        parsedArtist = `${artistPart} (${remixTerm})`;
        parsedTitle = titlePart;
      } else {
        // No recognized pattern, use title as-is and profile as artist
        parsedTitle = title;
        parsedArtist = normalizedProfile;
      }
    }
  }

  // Normalize title (capitalize first letter of each word if all uppercase)
  if (parsedTitle === parsedTitle.toUpperCase() && parsedTitle.length > 1) {
    parsedTitle = parsedTitle
      .toLowerCase()
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  } else {
    // Capitalize only first letter
    parsedTitle = parsedTitle.charAt(0).toUpperCase() + parsedTitle.slice(1);
  }

  return { artist: parsedArtist.trim(), title: parsedTitle.trim() };
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
