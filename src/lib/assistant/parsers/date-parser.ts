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

/**
 * Convertit une date relative en format ISO (YYYY-MM-DD)
 * Supporte : "aujourd'hui", "demain", "après-demain", "semaine prochaine", "mois prochain",
 * "dans X jours/semaines/mois", et les dates ISO existantes
 */
export function parseRelativeDate(dateStr: string): string | null {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const lowerDateStr = dateStr.toLowerCase().trim();

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

  // "dans X mois" / "in X months" / "dans X month"
  const dansMoisMatch = lowerDateStr.match(/dans\s+(\d+)\s+mois|in\s+(\d+)\s+months?/i);
  if (dansMoisMatch) {
    const months = parseInt(dansMoisMatch[1] || dansMoisMatch[2], 10);
    if (!isNaN(months) && months > 0) {
      const futureDate = new Date(today);
      futureDate.setMonth(futureDate.getMonth() + months);
      return formatLocalDate(futureDate);
    }
  }

  // "dans X jours" / "in X days" / "dans X day"
  const dansJoursMatch = lowerDateStr.match(/dans\s+(\d+)\s+jours?|in\s+(\d+)\s+days?/i);
  if (dansJoursMatch) {
    const days = parseInt(dansJoursMatch[1] || dansJoursMatch[2], 10);
    if (!isNaN(days) && days > 0) {
      const futureDate = new Date(today);
      futureDate.setDate(futureDate.getDate() + days);
      return formatLocalDate(futureDate);
    }
  }

  // "dans X semaines" / "in X weeks" / "dans X week"
  const dansSemainesMatch = lowerDateStr.match(/dans\s+(\d+)\s+semaines?|in\s+(\d+)\s+weeks?/i);
  if (dansSemainesMatch) {
    const weeks = parseInt(dansSemainesMatch[1] || dansSemainesMatch[2], 10);
    if (!isNaN(weeks) && weeks > 0) {
      const futureDate = new Date(today);
      futureDate.setDate(futureDate.getDate() + weeks * 7);
      return formatLocalDate(futureDate);
    }
  }

  // Si c'est déjà une date ISO, la retourner
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }

  return null;
}
