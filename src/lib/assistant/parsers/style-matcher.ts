/**
 * Matcher de styles musicaux depuis les requêtes utilisateur
 * Mapping des styles musicaux avec leurs variations et alias
 */

/**
 * Mapping des styles musicaux avec leurs variations et alias
 */
export const STYLE_VARIATIONS: Record<string, string[]> = {
  'Drum and Bass': [
    'dnb',
    'drum and bass',
    'drum&bass',
    'drum n bass',
    'jungle',
    'liquid',
    'neurofunk',
    'neuro',
    'techstep',
  ],
  'Happy Hardcore': ['happy hardcore', 'happycore', 'uk hardcore', 'hardcore', 'hcore'],
  Hardstyle: ['hardstyle', 'rawstyle', 'raw hardstyle', 'euphoric hardstyle'],
  Hardcore: ['hardcore', 'frenchcore', 'uptempo', 'terror', 'speedcore', 'extratone'],
  House: ['house', 'deep house', 'tech house', 'progressive house', 'future house', 'bass house'],
  Techno: ['techno', 'minimal techno', 'acid techno', 'industrial techno', 'melodic techno'],
  Trance: ['trance', 'uplifting trance', 'psytrance', 'progressive trance', 'vocal trance'],
  Dubstep: ['dubstep', 'brostep', 'riddim', 'melodic dubstep'],
  Trap: ['trap', 'future bass', 'hybrid trap'],
  Bass: ['bass', 'bass music', 'bassline'],
  Electronic: ['electronic', 'edm', 'electronica'],
  Progressive: ['progressive', 'prog'],
  Ambient: ['ambient', 'chillout', 'downtempo'],
  Breaks: ['breaks', 'breakbeat', 'big beat'],
  Garage: ['garage', 'uk garage', '2-step', 'speed garage'],
  Dance: ['dance', 'eurodance', 'hands up'],
  'Hard Dance': ['hard dance', 'harddance'],
  Psytrance: ['psytrance', 'psy', 'goa', 'full on'],
  'Big Room': ['big room', 'festival house'],
  'Future House': ['future house', 'bounce'],
  Moombahton: ['moombahton', 'moombah'],
  Electro: ['electro', 'electro house'],
  Synthwave: ['synthwave', 'retrowave', 'outrun'],
  'Lo-Fi': ['lo-fi', 'lofi', 'lo fi'],
  Chill: ['chill', 'chillout', 'chillstep'],
};

/**
 * Trouve un style à partir d'une chaîne
 * PRIORITÉ 1: Chercher d'abord les variations (plus spécifiques et précises)
 * Cela permet de détecter "drum and bass" même si "Drum and Bass" n'est pas encore dans availableStyles
 */
export function findStyleFromString(
  text: string,
  availableStyles: string[]
): { style: string; matchedText: string } | null {
  const lowerText = text.toLowerCase();

  // PRIORITÉ 1: Chercher d'abord les variations (plus spécifiques et précises)
  // Cela permet de détecter "drum and bass" même si "Drum and Bass" n'est pas encore dans availableStyles
  for (const [canonicalStyle, variations] of Object.entries(STYLE_VARIATIONS)) {
    // Trier les variations par longueur (les plus longues en premier) pour prioriser les matches exacts
    const sortedVariations = [...variations].sort((a, b) => b.length - a.length);

    for (const variation of sortedVariations) {
      if (lowerText.includes(variation)) {
        // Si on trouve une variation, chercher le style correspondant dans availableStyles
        // D'abord, chercher le style canonique exact
        const exactMatch = availableStyles.find(
          (s) => s.toLowerCase() === canonicalStyle.toLowerCase()
        );
        if (exactMatch) {
          return { style: exactMatch, matchedText: variation };
        }

        // Sinon, chercher un style qui contient le nom canonique ou vice versa
        const partialMatch = availableStyles.find(
          (s) =>
            s.toLowerCase() === canonicalStyle.toLowerCase() ||
            s.toLowerCase().includes(canonicalStyle.toLowerCase()) ||
            canonicalStyle.toLowerCase().includes(s.toLowerCase())
        );
        if (partialMatch) {
          return { style: partialMatch, matchedText: variation };
        }

        // Si aucun match dans availableStyles, retourner quand même le style canonique
        // (il sera peut-être créé ou sera ignoré si non valide)
        return { style: canonicalStyle, matchedText: variation };
      }
    }
  }

  // PRIORITÉ 2: Vérifier les styles disponibles directement (fallback)
  for (const style of availableStyles) {
    const styleLower = style.toLowerCase();
    if (lowerText.includes(styleLower)) {
      return { style, matchedText: styleLower };
    }
  }

  return null;
}
