/**
 * Parser de dates relatives en format ISO
 * Convertit des expressions comme "demain", "semaine prochaine" en dates ISO (YYYY-MM-DD)
 */

/**
 * Formate une date en format ISO local (YYYY-MM-DD)
 * Utilise le fuseau horaire local pour éviter les décalages UTC
 */
export function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** "aujourd'hui", "demain", "après-demain" */
function parseDayKeyword(lowerDateStr: string, today: Date): string | null {
  if (lowerDateStr === "aujourd'hui" || lowerDateStr === 'today') {
    return formatLocalDate(today);
  }

  if (lowerDateStr === 'demain' || lowerDateStr === 'tomorrow') {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return formatLocalDate(tomorrow);
  }

  if (lowerDateStr === 'après-demain' || lowerDateStr === 'day after tomorrow') {
    const dayAfter = new Date(today);
    dayAfter.setDate(dayAfter.getDate() + 2);
    return formatLocalDate(dayAfter);
  }

  return null;
}

/** "semaine prochaine" (= dans 7 jours) et "mois prochain" */
function parseNextPeriod(lowerDateStr: string, today: Date): string | null {
  // "semaine pro", "semaine prochaine", "next week"
  // Interpréter comme "dans 7 jours" (plus simple et prévisible)
  if (
    lowerDateStr.includes('semaine pro') ||
    lowerDateStr.includes('semaine prochaine') ||
    lowerDateStr.includes('next week')
  ) {
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    return formatLocalDate(nextWeek);
  }

  // "mois prochain", "au mois prochain", "next month"
  if (lowerDateStr.includes('mois prochain') || lowerDateStr.includes('next month')) {
    const nextMonth = new Date(today);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    return formatLocalDate(nextMonth);
  }

  return null;
}

/** "dans X mois", "dans X jours", "dans X semaines" (et équivalents anglais) */
function parseDuration(lowerDateStr: string, today: Date): string | null {
  // "dans X mois" / "in X months" / "dans X month"
  const dansMoisMatch = /dans\s+(\d+)\s+mois|in\s+(\d+)\s+months?/i.exec(lowerDateStr);
  if (dansMoisMatch) {
    const months = Number.parseInt(dansMoisMatch[1] || dansMoisMatch[2], 10);
    if (!Number.isNaN(months) && months > 0) {
      const futureDate = new Date(today);
      futureDate.setMonth(futureDate.getMonth() + months);
      return formatLocalDate(futureDate);
    }
  }

  // "dans X jours" / "in X days" / "dans X day"
  const dansJoursMatch = /dans\s+(\d+)\s+jours?|in\s+(\d+)\s+days?/i.exec(lowerDateStr);
  if (dansJoursMatch) {
    const days = Number.parseInt(dansJoursMatch[1] || dansJoursMatch[2], 10);
    if (!Number.isNaN(days) && days > 0) {
      const futureDate = new Date(today);
      futureDate.setDate(futureDate.getDate() + days);
      return formatLocalDate(futureDate);
    }
  }

  // "dans X semaines" / "in X weeks" / "dans X week"
  const dansSemainesMatch = /dans\s+(\d+)\s+semaines?|in\s+(\d+)\s+weeks?/i.exec(lowerDateStr);
  if (dansSemainesMatch) {
    const weeks = Number.parseInt(dansSemainesMatch[1] || dansSemainesMatch[2], 10);
    if (!Number.isNaN(weeks) && weeks > 0) {
      const futureDate = new Date(today);
      futureDate.setDate(futureDate.getDate() + weeks * 7);
      return formatLocalDate(futureDate);
    }
  }

  return null;
}

/** Fins et débuts de période : fin de semaine, fin/début de mois, quinzaine */
function parsePeriodBoundary(lowerDateStr: string, today: Date): string | null {
  // "fin de semaine", "fin de la semaine", "end of week"
  if (
    lowerDateStr.includes('fin de semaine') ||
    lowerDateStr.includes('fin de la semaine') ||
    lowerDateStr.includes('end of week')
  ) {
    const endOfWeek = new Date(today);
    // Aller au dimanche de la semaine en cours (0 = dimanche, 6 = samedi)
    const daysUntilSunday = 7 - endOfWeek.getDay();
    endOfWeek.setDate(endOfWeek.getDate() + (daysUntilSunday === 7 ? 0 : daysUntilSunday));
    return formatLocalDate(endOfWeek);
  }

  // "fin du mois", "fin de mois", "end of month"
  if (
    lowerDateStr.includes('fin du mois') ||
    lowerDateStr.includes('fin de mois') ||
    lowerDateStr.includes('end of month')
  ) {
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return formatLocalDate(endOfMonth);
  }

  // "début du mois", "début de mois prochain", "beginning of month"
  if (
    lowerDateStr.includes('début du mois prochain') ||
    lowerDateStr.includes('début de mois prochain') ||
    lowerDateStr.includes('beginning of next month')
  ) {
    const beginNextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    return formatLocalDate(beginNextMonth);
  }

  // "dans une quinzaine", "quinze jours" → 15 jours
  if (
    lowerDateStr.includes('quinzaine') ||
    lowerDateStr.includes('quinze jours') ||
    lowerDateStr.includes('15 jours')
  ) {
    const fortnight = new Date(today);
    fortnight.setDate(fortnight.getDate() + 15);
    return formatLocalDate(fortnight);
  }

  return null;
}

const DAY_NAMES: Record<string, number> = {
  dimanche: 0,
  lundi: 1,
  mardi: 2,
  mercredi: 3,
  jeudi: 4,
  vendredi: 5,
  samedi: 6,
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

/** Jours nommés : "lundi prochain", "mardi prochain", etc. */
function parseNamedDay(lowerDateStr: string, today: Date): string | null {
  for (const [dayName, dayNumber] of Object.entries(DAY_NAMES)) {
    const namedDayPattern = new RegExp(String.raw`${dayName}\s*(?:prochain|next)?`, 'i');
    if (namedDayPattern.test(lowerDateStr)) {
      const namedDay = new Date(today);
      const currentDay = namedDay.getDay();
      let daysUntil = dayNumber - currentDay;
      // Si le jour est aujourd'hui ou déjà passé cette semaine, aller à la semaine prochaine
      if (daysUntil <= 0) {
        daysUntil += 7;
      }
      namedDay.setDate(namedDay.getDate() + daysUntil);
      return formatLocalDate(namedDay);
    }
  }
  return null;
}

/** Date ISO (YYYY-MM-DD) déjà formatée, ou DD/MM/YYYY / DD-MM-YYYY */
function parseAbsoluteDate(dateStr: string): string | null {
  // Si c'est déjà une date ISO, la retourner
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }

  // Support DD/MM/YYYY ou DD-MM-YYYY
  const frDateMatch = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/.exec(dateStr);
  if (frDateMatch) {
    const day = Number.parseInt(frDateMatch[1], 10);
    const month = Number.parseInt(frDateMatch[2], 10);
    const year = Number.parseInt(frDateMatch[3], 10);
    const date = new Date(year, month - 1, day);
    // Vérification basique de validité
    if (date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day) {
      return formatLocalDate(date);
    }
  }

  return null;
}

/**
 * Convertit une date relative en format ISO (YYYY-MM-DD)
 * Supporte : "aujourd'hui", "demain", "après-demain", "semaine prochaine", "mois prochain",
 * "dans X jours/semaines/mois", et les dates ISO existantes
 */
export function parseRelativeDate(dateStr: string): string | null {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const lowerDateStr = dateStr.toLowerCase().trim();

  // L'ordre des analyseurs est significatif : le premier qui reconnaît la chaîne gagne
  return (
    parseDayKeyword(lowerDateStr, today) ??
    parseNextPeriod(lowerDateStr, today) ??
    parseDuration(lowerDateStr, today) ??
    parsePeriodBoundary(lowerDateStr, today) ??
    parseNamedDay(lowerDateStr, today) ??
    parseAbsoluteDate(dateStr)
  );
}
