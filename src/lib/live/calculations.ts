import type { LiveChances, UserLiveItem, UserTicket } from '@/types/live';
import { LiveItemType, TicketSource } from '@/types/live';
import { getItemDefinition } from './items';

/**
 * Calcule le multiplier basé sur le temps écoulé depuis la soumission
 * Le multiplier double toutes les 30 minutes de manière exponentielle
 * Mis à jour en temps réel chaque minute
 * @param submissionCreatedAt Date de création de la soumission
 * @param sessionStartTime Date de début de la séance (première soumission non rollée)
 * @param timeOffsetMinutes Offset de temps simulé en minutes (pour les tests admin)
 * @returns Multiplier exponentiel (commence à 1.0, double toutes les 30 minutes, arrondi à 1 décimale)
 */
export function calculateMultiplier(
  submissionCreatedAt: Date,
  sessionStartTime: Date,
  timeOffsetMinutes: number = 0
): number {
  const now = new Date();

  // Temps écoulé en minutes depuis la création de la soumission
  // Ajouter l'offset de temps simulé pour les tests
  const minutesElapsed =
    (now.getTime() - submissionCreatedAt.getTime()) / (1000 * 60) + timeOffsetMinutes;

  // S'assurer que le temps écoulé n'est pas négatif
  const adjustedMinutes = Math.max(0, minutesElapsed);

  // Multiplier exponentiel : double toutes les 30 minutes
  // Formule : 2^(minutes_écoulées / 30)
  // Exemple : 0min = 1.0, 15min ≈ 1.4, 30min = 2.0, 45min ≈ 2.8, 60min = 4.0
  const multiplier = Math.pow(2, adjustedMinutes / 30);

  // Arrondir à 1 décimale
  return Math.round(multiplier * 10) / 10;
}

/**
 * Calcule le nombre total de tickets actifs
 */
export function calculateActiveTickets(tickets: UserTicket[]): number {
  const now = new Date();
  return tickets
    .filter((ticket) => !ticket.expiresAt || ticket.expiresAt > now)
    .reduce((sum, ticket) => sum + ticket.quantity, 0);
}

/**
 * Calcule les chances de soumission
 * @deprecated Cette fonction n'est plus utilisée. Utiliser directement calculateMultiplier avec les dates de soumission.
 */
export function calculateChances(
  tickets: UserTicket[],
  activatedItems: UserLiveItem[],
  hasSubmission: boolean
): LiveChances {
  const activeTickets = calculateActiveTickets(tickets);
  // Note: Cette fonction est obsolète car elle utilise l'ancien système de multiplier basé sur les items
  // Le nouveau système utilise le temps depuis la soumission
  // Pour compatibilité, on retourne un multiplier de 1.0
  const multiplier = 1.0;

  // Formule de base : chances = (tickets * multiplier) / total_tickets_globaux * 100
  // Pour simplifier, on utilise une formule basée sur les tickets et le multiplier
  // Plus il y a de tickets et plus le multiplier est élevé, plus les chances sont grandes
  const baseChance = activeTickets * multiplier;
  const chancePercentage = Math.min(100, Math.round((baseChance / 10) * 100) / 100);

  return {
    multiplier,
    chancePercentage,
    activeTickets,
    hasSubmission,
  };
}

/**
 * Calcule les tickets donnés par les items activés
 */
export function calculateTicketsFromItems(activatedItems: UserLiveItem[]): number {
  let totalTickets = 0;

  for (const item of activatedItems) {
    if (item.LiveItem) {
      const definition = getItemDefinition(item.LiveItem.type as LiveItemType);
      if (definition?.givesTickets) {
        // Utiliser activatedQuantity au lieu de quantity
        totalTickets += definition.givesTickets * (item.activatedQuantity || 0);
      }
    }
  }

  return totalTickets;
}

/**
 * Calcule le poids total d'un utilisateur pour le tirage de la roue
 * Poids de base : 1 ticket par utilisateur
 * Eternal tickets : +1 par ticket (basé sur UserTicket.quantity avec source ETERNAL_TICKET)
 *   - Seulement si l'item ETERNAL_TICKET est activé
 * Subscriber bonus : +20 tickets (basé sur UserLiveItem activé de type SUBSCRIBER_BONUS)
 * Loyalty bonus : +10 tickets (basé sur UserLiveItem activé de type LOYALTY_BONUS)
 * @param activeTickets Tickets actifs de l'utilisateur
 * @param activatedItems Items activés de l'utilisateur
 * @param multiplier Multiplier optionnel à appliquer au poids final
 * @returns Poids final (baseWeight * multiplier si multiplier fourni)
 */
export function calculateTicketWeight(
  activeTickets: UserTicket[],
  activatedItems: UserLiveItem[],
  multiplier?: number
): number {
  let weight = 1; // Base

  // Filtrer les tickets actifs (non expirés)
  const now = new Date();
  const validTickets = activeTickets.filter(
    (ticket) => !ticket.expiresAt || ticket.expiresAt > now
  );

  // Eternal tickets: +1 par ticket (activatedQuantity de l'item ETERNAL_TICKET activé)
  // Les tickets éternels sont stockés dans la activatedQuantity de l'item UserLiveItem, pas dans UserTicket
  const eternalTicketItem = activatedItems.find((item) => {
    if (!item.LiveItem) return false;
    const itemType = String(item.LiveItem.type);
    return itemType === String(LiveItemType.ETERNAL_TICKET);
  });

  if (eternalTicketItem) {
    // Utiliser la activatedQuantity de l'item ETERNAL_TICKET activé
    weight += eternalTicketItem.activatedQuantity || 0;
  }

  // Subscriber bonus: +20 par item activé
  const subscriberItems = activatedItems.filter((item) => {
    if (!item.LiveItem) return false;
    return String(item.LiveItem.type) === String(LiveItemType.SUBSCRIBER_BONUS);
  });
  subscriberItems.forEach((item) => {
    weight += 20 * (item.activatedQuantity || 0);
  });

  // Loyalty bonus: +10 par item activé
  const loyaltyItems = activatedItems.filter((item) => {
    if (!item.LiveItem) return false;
    return String(item.LiveItem.type) === String(LiveItemType.LOYALTY_BONUS);
  });
  loyaltyItems.forEach((item) => {
    weight += 10 * (item.activatedQuantity || 0);
  });

  // Appliquer le multiplier si fourni
  if (multiplier !== undefined && multiplier !== null) {
    weight = weight * multiplier;
  }

  return weight;
}
