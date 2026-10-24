import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export const formatDuration = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

export const formatDate = (date: string): string => {
  return new Date(date).toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

/**
 * Date + heure en français via date-fns, ex. « 05 mars 2025 à 14:30 ».
 * (Différent de formatDate : jour sur 2 chiffres et heure incluse.)
 */
export const formatDateTimeFr = (date: string | Date): string => {
  return format(new Date(date), 'dd MMMM yyyy à HH:mm', { locale: fr });
};

export const formatTime = (date: string): string => {
  return new Date(date).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const formatNumber = (number: number): string => {
  if (number >= 1000000) {
    return `${(number / 1000000).toFixed(1)}M`;
  }
  if (number >= 1000) {
    return `${(number / 1000).toFixed(1)}k`;
  }
  return number.toString();
};

/**
 * Formate une date ISO en format français (DD/MM/YYYY).
 * Renvoie '' si la date est absente, et la valeur d'origine si elle est invalide.
 */
export const formatDateFrench = (dateString: string | null): string => {
  if (!dateString) return '';

  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return dateString;
  }
};
