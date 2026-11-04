import type { Prisma } from '@prisma/client';

import prisma from '@/lib/prisma';
import { LiveItemType } from '@/types/live';
import { RewardType } from '@/types/slot-machine';

/**
 * Jetons et récompenses de la machine à sous, côté serveur.
 * Les items gagnés sont octroyés par /api/slot-machine/spin et /spin-batch dans la même
 * transaction que le débit des jetons : le client ne choisit jamais ni le type ni la quantité.
 */

export const DAILY_TOKENS = 100;

/** Client Prisma utilisable : le client global ou celui d'une transaction. */
type Db = Pick<Prisma.TransactionClient, 'liveItem' | 'userLiveItem'>;

const ITEM_NAMES: Record<LiveItemType, string> = {
  [LiveItemType.LOYALTY_BONUS]: 'Loyalty Bonus',
  [LiveItemType.WATCH_STREAK]: 'Watch Streak Bonus',
  [LiveItemType.CHEER_PROGRESS]: 'Cheer Bonus',
  [LiveItemType.SUBSCRIBER_BONUS]: 'Subscriber Bonus',
  [LiveItemType.ETERNAL_TICKET]: 'Eternal Ticket',
  [LiveItemType.WAVEFORM_COLOR]: 'Waveform Color',
  [LiveItemType.BACKGROUND_IMAGE]: 'Background Image',
  [LiveItemType.QUEUE_SKIP]: 'Queue Skip',
  [LiveItemType.SUB_GIFT_BONUS]: 'Sub Gift Bonus',
  [LiveItemType.MARBLES_WINNER_BONUS]: 'Marbles Winner Bonus',
  [LiveItemType.SHINY_NAME]: 'Shiny Name',
};

const ITEM_ICONS: Record<LiveItemType, string> = {
  [LiveItemType.LOYALTY_BONUS]: '💎',
  [LiveItemType.WATCH_STREAK]: '🔥',
  [LiveItemType.CHEER_PROGRESS]: '💜',
  [LiveItemType.SUBSCRIBER_BONUS]: '👑',
  [LiveItemType.ETERNAL_TICKET]: '🎫',
  [LiveItemType.WAVEFORM_COLOR]: '🎨',
  [LiveItemType.BACKGROUND_IMAGE]: '🖼️',
  [LiveItemType.QUEUE_SKIP]: '⏭️',
  [LiveItemType.SUB_GIFT_BONUS]: '🎁',
  [LiveItemType.MARBLES_WINNER_BONUS]: '🎲',
  [LiveItemType.SHINY_NAME]: '✨',
};

/** Type d'item correspondant à une récompense, ou null pour les jetons / aucun gain. */
export function rewardToLiveItemType(rewardType: RewardType | null): LiveItemType | null {
  if (rewardType === RewardType.ETERNAL_TICKET) return LiveItemType.ETERNAL_TICKET;
  if (rewardType === RewardType.QUEUE_SKIP) return LiveItemType.QUEUE_SKIP;
  return null;
}

/** Récupère le LiveItem d'un type, en le créant s'il n'existe pas encore. */
export async function getOrCreateLiveItem(db: Db, itemType: LiveItemType) {
  return db.liveItem.upsert({
    where: { type: itemType },
    update: {},
    create: {
      type: itemType,
      name: ITEM_NAMES[itemType],
      description: `Bonus ${ITEM_NAMES[itemType]}`,
      icon: ITEM_ICONS[itemType],
      isActive: true,
    },
  });
}

/** Ajoute `quantity` exemplaires d'un item à l'inventaire de l'utilisateur. */
export async function grantLiveItem(
  db: Db,
  userId: string,
  itemType: LiveItemType,
  quantity: number
): Promise<void> {
  if (!Number.isInteger(quantity) || quantity <= 0) return;

  const liveItem = await getOrCreateLiveItem(db, itemType);
  await db.userLiveItem.upsert({
    where: { userId_itemId: { userId, itemId: liveItem.id } },
    update: { quantity: { increment: quantity } },
    create: {
      userId,
      itemId: liveItem.id,
      quantity,
      activatedQuantity: 0,
      isActivated: false,
    },
  });
}

/** Octroie les items gagnés lors d'un ou plusieurs tirages. */
export async function grantSlotMachineItems(
  db: Db,
  userId: string,
  items: { queueSkips: number; eternalTickets: number }
): Promise<void> {
  if (items.queueSkips > 0) {
    await grantLiveItem(db, userId, LiveItemType.QUEUE_SKIP, items.queueSkips);
  }
  if (items.eternalTickets > 0) {
    await grantLiveItem(db, userId, LiveItemType.ETERNAL_TICKET, items.eternalTickets);
  }
}

/** Vrai si la dernière recharge date d'un jour calendaire antérieur. */
export function shouldResetDaily(lastResetDate: Date, now: Date = new Date()): boolean {
  const lastReset = new Date(lastResetDate);
  const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const lastResetDateOnly = new Date(
    lastReset.getFullYear(),
    lastReset.getMonth(),
    lastReset.getDate()
  );
  return nowDate.getTime() > lastResetDateOnly.getTime();
}

/**
 * Récupère (ou crée) le solde de jetons de l'utilisateur et applique la recharge quotidienne.
 * La recharge est conditionnée à l'ancienne date : deux requêtes simultanées ne rechargent
 * qu'une fois.
 */
export async function loadUserTokens(userId: string) {
  let userTokens = await prisma.userSlotMachineTokens.upsert({
    where: { userId },
    update: {},
    create: { userId, tokens: DAILY_TOKENS, lastResetDate: new Date() },
  });

  if (shouldResetDaily(userTokens.lastResetDate)) {
    await prisma.userSlotMachineTokens.updateMany({
      where: { userId, lastResetDate: userTokens.lastResetDate },
      data: { tokens: DAILY_TOKENS, lastResetDate: new Date() },
    });
    userTokens = await prisma.userSlotMachineTokens.findUniqueOrThrow({ where: { userId } });
  }

  return userTokens;
}

export type SpinOutcome = {
  /** Coût total des tirages, débité seulement si le solde le couvre. */
  cost: number;
  /** Jetons gagnés (gains en jetons + bonus des items spéciaux). */
  tokensWon: number;
  spins: number;
  wins: number;
  queueSkips: number;
  eternalTickets: number;
};

/**
 * Applique le résultat d'un ou plusieurs tirages en une transaction : débit atomique
 * (refusé si le solde est insuffisant au moment de l'écriture), crédit des gains, statistiques
 * et octroi des items. Renvoie false si le solde ne couvrait pas le coût (rien n'est écrit).
 */
export async function applySpinOutcome(userId: string, outcome: SpinOutcome): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const debit = await tx.userSlotMachineTokens.updateMany({
      where: { userId, tokens: { gte: outcome.cost } },
      data: {
        tokens: { decrement: outcome.cost },
        totalSpins: { increment: outcome.spins },
        totalWins: { increment: outcome.wins },
      },
    });
    if (debit.count === 0) return false;

    if (outcome.tokensWon > 0) {
      await tx.userSlotMachineTokens.update({
        where: { userId },
        data: { tokens: { increment: outcome.tokensWon } },
      });
    }

    await grantSlotMachineItems(tx, userId, {
      queueSkips: outcome.queueSkips,
      eternalTickets: outcome.eternalTickets,
    });
    return true;
  });
}
