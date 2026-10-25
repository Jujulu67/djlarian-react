/**
 * Arithmétique de dates dans le fuseau du site (Europe/Paris), indépendante du fuseau de la
 * machine (serveur Vercel en UTC, navigateur d'un visiteur à l'étranger…).
 *
 * Un événement hebdomadaire à 20:00 heure de Paris doit rester à 20:00 heure de Paris après un
 * changement d'heure : ajouter 7 × 24 h en UTC le décalerait d'une heure.
 */

export const SITE_TIME_ZONE = 'Europe/Paris';

interface WallClock {
  year: number;
  month: number; // 0-11
  day: number;
  hour: number;
  minute: number;
  second: number;
  millisecond: number;
}

const formatters = new Map<string, Intl.DateTimeFormat>();

function getFormatter(timeZone: string): Intl.DateTimeFormat {
  let formatter = formatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    formatters.set(timeZone, formatter);
  }
  return formatter;
}

/** Heure « murale » d'un instant dans un fuseau donné */
function toWallClock(date: Date, timeZone: string): WallClock {
  const parts: Record<string, number> = {};
  for (const part of getFormatter(timeZone).formatToParts(date)) {
    if (part.type !== 'literal') parts[part.type] = Number(part.value);
  }
  return {
    year: parts.year,
    month: parts.month - 1,
    day: parts.day,
    hour: parts.hour,
    minute: parts.minute,
    second: parts.second,
    millisecond: date.getUTCMilliseconds(),
  };
}

function wallClockAsUtc(wall: WallClock): number {
  return Date.UTC(
    wall.year,
    wall.month,
    wall.day,
    wall.hour,
    wall.minute,
    wall.second,
    wall.millisecond
  );
}

/** Décalage (ms) du fuseau par rapport à UTC à un instant donné */
function offsetAt(timestamp: number, timeZone: string): number {
  const date = new Date(timestamp);
  return wallClockAsUtc(toWallClock(date, timeZone)) - timestamp;
}

/** Instant correspondant à une heure murale dans un fuseau (les débordements jour/mois sont normalisés) */
function fromWallClock(wall: WallClock, timeZone: string): Date {
  const asUtc = wallClockAsUtc(wall);
  const firstGuess = asUtc - offsetAt(asUtc, timeZone);
  // Deuxième passe : le décalage peut différer de part et d'autre d'un changement d'heure
  return new Date(asUtc - offsetAt(firstGuess, timeZone));
}

/** Ajoute des jours en conservant l'heure murale du fuseau (par défaut Europe/Paris) */
export function addDaysInTimeZone(date: Date, days: number, timeZone = SITE_TIME_ZONE): Date {
  const wall = toWallClock(date, timeZone);
  return fromWallClock({ ...wall, day: wall.day + days }, timeZone);
}

/**
 * Ajoute des mois en conservant l'heure murale du fuseau ; comme date-fns, le jour est ramené
 * au dernier jour du mois cible s'il n'existe pas (31 janvier + 1 mois → 28/29 février).
 */
export function addMonthsInTimeZone(date: Date, months: number, timeZone = SITE_TIME_ZONE): Date {
  const wall = toWallClock(date, timeZone);
  const targetMonth = wall.month + months;
  const daysInTargetMonth = new Date(Date.UTC(wall.year, targetMonth + 1, 0)).getUTCDate();
  return fromWallClock(
    { ...wall, month: targetMonth, day: Math.min(wall.day, daysInTargetMonth) },
    timeZone
  );
}
