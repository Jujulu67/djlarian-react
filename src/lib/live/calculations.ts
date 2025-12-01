import type { LiveChances, UserLiveItem, UserTicket } from '@/types/live';
import { LiveItemType } from '@/types/live';
import { getItemDefinition } from './items';

/**
 * Calcule le multiplier total basé sur les items activés
 */
export function calculateMultiplier(activatedItems: UserLiveItem[]): number {
  let multiplier = 1.0;

  for (const item of activatedItems) {
    if (item.LiveItem) {
      const definition = getItemDefinition(item.LiveItem.type as LiveItemType);
      if (definition?.multiplier) {
        multiplier *= definition.multiplier;
      }
    }
  }

  return Math.round(multiplier * 100) / 100; // Arrondir à 2 décimales
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
 */
export function calculateChances(
  tickets: UserTicket[],
  activatedItems: UserLiveItem[],
  hasSubmission: boolean
): LiveChances {
  const activeTickets = calculateActiveTickets(tickets);
  const multiplier = calculateMultiplier(activatedItems);

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
        totalTickets += definition.givesTickets * item.quantity;
      }
    }
  }

  return totalTickets;
}
