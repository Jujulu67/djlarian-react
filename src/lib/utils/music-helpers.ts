import { Track, MusicType } from '@/lib/utils/types';

/* -------------------------------------------------------------------------- */
/*  Types et constantes partagés                                              */
/* -------------------------------------------------------------------------- */

export const MUSIC_TYPES: { label: string; value: MusicType }[] = [
  { label: 'Single', value: 'single' },
  { label: 'EP/Album', value: 'ep' },
  { label: 'Remix', value: 'remix' },
  { label: 'DJ Set', value: 'djset' },
  { label: 'Live', value: 'live' },
  { label: 'Video', value: 'video' },
];

/** Formulaire vide par défaut utilisé partout */
export const emptyTrackForm: Omit<Track, 'id'> & { id?: string } = {
  title: '',
  artist: 'Larian',
  imageId: undefined,
  releaseDate: new Date().toISOString().split('T')[0],
  genre: [],
  type: 'single',
  description: '',
  featured: false,
  platforms: {},
  isPublished: true,
  bpm: undefined,
  musicalKey: undefined,
  collection: undefined,
  user: undefined,
  createdAt: undefined,
  updatedAt: undefined,
};

/* -------------------------------------------------------------------------- */
/*  Utilitaire : extraire BPM / genres depuis le titre YouTube                */
/* -------------------------------------------------------------------------- */
export function extractInfoFromTitle(title: string) {
  const result = {
    cleanTitle: title,
    bpm: undefined as number | undefined,
    genres: [] as string[],
  };

  // Nettoyage des entités HTML courantes
  const cleanTitle = title
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/'/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');

  // Assigner le titre nettoyé
  result.cleanTitle = cleanTitle;

  // BPM éventuel
  const bpmMatch =
    cleanTitle.match(/\b(\d{2,3})\s*(?:bpm|BPM)\b/) ||
    cleanTitle.match(/\[(\d{2,3})\]/) ||
    cleanTitle.match(/\((\d{2,3})\s*(?:bpm|BPM)\)/);

  if (bpmMatch?.[1]) {
    const detected = parseInt(bpmMatch[1]);
    if (detected >= 70 && detected <= 200) result.bpm = detected;
  }

  // Genres possibles
  const genreKeywords = [
    'House',
    'Tech House',
    'Deep House',
    'Progressive House',
    'Future House',
    'Techno',
    'Melodic Techno',
    'Hard Techno',
    'Industrial Techno',
    'Trance',
    'Progressive Trance',
    'Uplifting Trance',
    'Psytrance',
    'Drum & Bass',
    'DnB',
    'Jungle',
    'Dubstep',
    'Trap',
    'Future Bass',
    'Ambient',
    'Chill',
    'Lo-Fi',
    'EDM',
    'Electronic',
    'Electronica',
    'Hardstyle',
    'Hardcore',
    'Gabber',
    'Disco',
    'Nu Disco',
    'Funk',
    'Breakbeat',
    'Big Beat',
    'Breaks',
    'Downtempo',
    'Trip Hop',
    'Chillout',
  ];

  genreKeywords.forEach((g) => {
    const re = new RegExp(`\\b${g.replace(/\s+/g, '\\s+')}\\b`, 'i');
    if (re.test(cleanTitle)) result.genres.push(g);
  });

  // Tags implicites
  if (/\b(remix|flip|edit)\b/i.test(cleanTitle)) result.genres.push('Remix');
  if (/\b(live|set)\b/i.test(cleanTitle) || /@/.test(cleanTitle)) result.genres.push('Live');
  if (/\b(mix|session)\b/i.test(cleanTitle)) result.genres.push('DJ Set');

  return result;
}
