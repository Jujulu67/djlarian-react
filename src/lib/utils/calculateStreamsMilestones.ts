/**
 * Calcul des jalons de streams (J7, J14, J21, J28, J56, J84, J180, J365)
 * basés sur la date de release du projet
 */

export interface StreamsMilestones {
  streamsJ7: number | null;
  streamsJ14: number | null;
  streamsJ21: number | null;
  streamsJ28: number | null;
  streamsJ56: number | null;
  streamsJ84: number | null;
  streamsJ180: number | null; // 6 mois
  streamsJ365: number | null; // 1 an
}

export interface StreamsDataPoint {
  date: string; // Format YYYY-MM-DD
  streams: number;
}

/**
 * Trouve la valeur des streams à une date donnée exacte
 * Retourne null si la date exacte n'existe pas
 */
function findStreamsAtDateExact(
  streamsData: StreamsDataPoint[],
  targetDate: string
): number | null {
  const found = streamsData.find((d) => d.date === targetDate);
  return found ? found.streams : null;
}

/**
 * Trouve la valeur des streams à une date donnée
 * Si la date exacte n'existe pas, on prend la valeur la plus proche avant cette date
 */
function findStreamsAtDate(streamsData: StreamsDataPoint[], targetDate: string): number | null {
  // Trier par date décroissante pour trouver la valeur la plus récente avant ou à la date cible
  const sortedData = [...streamsData]
    .filter((d) => d.date <= targetDate)
    .sort((a, b) => b.date.localeCompare(a.date));

  if (sortedData.length === 0) {
    return null;
  }

  // Retourner la valeur la plus récente avant ou à la date cible
  return sortedData[0].streams;
}

/**
 * Calcule la somme des streams journaliers entre deux dates
 * Les streams dans le CSV sont JOURNALIERS (chaque ligne = streams du jour)
 * Il faut donc simplement additionner toutes les valeurs entre startDate et endDate
 */
function calculateStreamsBetweenDates(
  streamsData: StreamsDataPoint[],
  startDate: string,
  endDate: string
): number {
  // Filtrer et trier les données par date
  const sortedData = [...streamsData]
    .filter((d) => d.date >= startDate && d.date <= endDate)
    .sort((a, b) => a.date.localeCompare(b.date));

  if (sortedData.length === 0) {
    return 0;
  }

  // Les streams sont journaliers, donc on additionne directement toutes les valeurs
  return sortedData.reduce((sum, dataPoint) => sum + dataPoint.streams, 0);
}

/**
 * Ajoute des jours à une date
 */
function addDays(dateStr: string, days: number): string {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + days);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/**
 * Calcule les jalons de streams basés sur la date de release
 * Les streams dans le CSV sont cumulatifs, donc on calcule la différence
 * depuis le jour avant la release (ou la release si pas disponible) jusqu'au jalon
 */
export function calculateStreamsMilestones(
  releaseDate: string,
  streamsData: StreamsDataPoint[]
): StreamsMilestones {
  const milestones: StreamsMilestones = {
    streamsJ7: null,
    streamsJ14: null,
    streamsJ21: null,
    streamsJ28: null,
    streamsJ56: null,
    streamsJ84: null,
    streamsJ180: null,
    streamsJ365: null,
  };

  // Vérifier que la date de release est valide
  if (!releaseDate || !/^\d{4}-\d{2}-\d{2}$/.test(releaseDate)) {
    return milestones;
  }

  // Déterminer le point de référence (pour calculer les streams journaliers)
  // On utilise toujours la release comme point de départ pour le calcul
  // Mais on peut utiliser le jour avant comme référence si pas de données à la release
  const releaseStreams = findStreamsAtDate(streamsData, releaseDate);
  const dayBefore = addDays(releaseDate, -1);
  const dayBeforeStreams = findStreamsAtDate(streamsData, dayBefore);

  // Vérifier qu'on a au moins des données (release ou jour avant)
  if (releaseStreams === null && dayBeforeStreams === null) {
    return milestones;
  }

  // Calculer chaque jalon
  // Les streams sont cumulatifs dans le CSV, donc on calcule la somme des streams journaliers
  // depuis la release jusqu'à chaque jalon
  const jalonDays = [7, 14, 21, 28, 56, 84, 180, 365];
  const jalonKeys: (keyof StreamsMilestones)[] = [
    'streamsJ7',
    'streamsJ14',
    'streamsJ21',
    'streamsJ28',
    'streamsJ56',
    'streamsJ84',
    'streamsJ180',
    'streamsJ365',
  ];

  // Trouver la dernière date disponible dans les données
  const sortedAllData = [...streamsData].sort((a, b) => b.date.localeCompare(a.date));
  const lastAvailableDate = sortedAllData.length > 0 ? sortedAllData[0].date : null;

  for (let i = 0; i < jalonDays.length; i++) {
    const days = jalonDays[i];
    const key = jalonKeys[i];
    const targetDate = addDays(releaseDate, days);

    // Vérifier qu'on a des données jusqu'à la date cible exacte
    // On doit avoir une donnée à la date exacte du jalon, pas juste avant
    const streamsAtTargetExact = findStreamsAtDateExact(streamsData, targetDate);

    // Vérifier aussi qu'on a au moins des données jusqu'à cette date (pas seulement avant)
    // Si la dernière date disponible est avant la date cible, on ne peut pas calculer
    if (lastAvailableDate && lastAvailableDate < targetDate) {
      // Pas assez de données, on laisse null (sera affiché comme N/A)
      continue;
    }

    if (streamsAtTargetExact !== null) {
      // Calculer la somme des streams journaliers depuis la release jusqu'à targetDate
      const total = calculateStreamsBetweenDates(streamsData, releaseDate, targetDate);

      // Vérifier qu'on a bien des données pour toute la période
      const hasReleaseData = findStreamsAtDateExact(streamsData, releaseDate) !== null;

      if (hasReleaseData && total >= 0) {
        milestones[key] = total;
      }
    }
    // Si pas de données à la date cible exacte, on laisse null (sera affiché comme N/A)
  }

  return milestones;
}
