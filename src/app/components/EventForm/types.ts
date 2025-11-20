export interface TicketInfo {
  price?: number;
  currency?: string;
  quantity?: number;
  buyUrl?: string;
  url?: string;
  availableTo?: string;
  availableFrom?: string;
}

export interface RecurrenceConfig {
  isRecurring: boolean;
  frequency: 'weekly' | 'monthly';
  day?: number; // 0-6 pour les jours de la semaine (0=dimanche)
  endDate?: string;
  excludedDates?: string[]; // Dates à exclure de la récurrence
}

export interface EventFormData {
  title: string;
  description: string;
  location: string;
  address?: string;
  date?: string;
  startDate?: string;
  endDate?: string;
  status?: 'UPCOMING' | 'COMPLETED' | 'CANCELLED';
  isPublished?: boolean;
  publishAt?: string;
  hasTickets?: boolean;
  featured?: boolean;
  imageId?: string | null;
  tickets: TicketInfo;
  recurrence?: RecurrenceConfig;
}
