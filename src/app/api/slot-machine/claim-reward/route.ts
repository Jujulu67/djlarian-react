import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createSuccessResponse, createUnauthorizedResponse } from '@/lib/api/responseHelpers';
import { handleApiError } from '@/lib/api/errorHandler';
import prisma from '@/lib/prisma';
import { RewardType } from '@/types/slot-machine';
import { LiveItemType } from '@/types/live';
import { requireAuth } from '@/lib/api/requireAuth';

const claimRewardSchema = z.object({
  rewardType: z.nativeEnum(RewardType),
  rewardAmount: z.number().int().positive(),
});

/**
 * Helper pour obtenir ou créer un LiveItem par type
 */
async function getOrCreateLiveItem(itemType: LiveItemType) {
  let item = await prisma.liveItem.findUnique({
    where: { type: itemType },
  });

  if (!item) {
    const itemNames: Record<LiveItemType, string> = {
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

    const itemIcons: Record<LiveItemType, string> = {
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

    item = await prisma.liveItem.create({
      data: {
        type: itemType,
        name: itemNames[itemType],
        description: `Bonus ${itemNames[itemType]}`,
        icon: itemIcons[itemType],
        isActive: true,
      },
    });
  }

  return item;
}

/**
 * POST /api/slot-machine/claim-reward
 * Réclame une récompense gagnée
 */
export async function POST(request: NextRequest) {
  try {
    const { session, error } = await requireAuth({
      requireUserId: true,
      onAnonymous: () => createUnauthorizedResponse('Non authentifié'),
    });
    if (error) return error;

    const body = await request.json();
    const validatedData = claimRewardSchema.parse(body);
    const { rewardType, rewardAmount } = validatedData;

    // Pour les jetons, ils sont déjà ajoutés dans l'API spin
    if (rewardType === RewardType.TOKENS) {
      return createSuccessResponse({ message: 'Jetons déjà ajoutés' }, 200, 'Récompense réclamée');
    }

    // Pour les tickets éternels et queue skips, créer ou mettre à jour le UserLiveItem
    let itemType: LiveItemType;
    if (rewardType === RewardType.ETERNAL_TICKET) {
      itemType = LiveItemType.ETERNAL_TICKET;
    } else if (rewardType === RewardType.QUEUE_SKIP) {
      itemType = LiveItemType.QUEUE_SKIP;
    } else {
      return NextResponse.json({ error: 'Type de récompense invalide' }, { status: 400 });
    }

    // Obtenir ou créer le LiveItem
    const liveItem = await getOrCreateLiveItem(itemType);

    // Récupérer ou créer le UserLiveItem
    let userItem = await prisma.userLiveItem.findUnique({
      where: {
        userId_itemId: {
          userId: session.user.id,
          itemId: liveItem.id,
        },
      },
    });

    if (!userItem) {
      // Créer un nouveau UserLiveItem
      userItem = await prisma.userLiveItem.create({
        data: {
          userId: session.user.id,
          itemId: liveItem.id,
          quantity: rewardAmount,
          activatedQuantity: 0,
          isActivated: false,
        },
      });
    } else {
      // Incrémenter la quantité
      await prisma.userLiveItem.update({
        where: { id: userItem.id },
        data: {
          quantity: { increment: rewardAmount },
        },
      });
    }

    return createSuccessResponse(
      {
        message: `Récompense réclamée : ${rewardAmount} ${rewardType === RewardType.ETERNAL_TICKET ? 'Ticket(s) Éternel(s)' : 'Queue Skip(s)'}`,
        userItemId: userItem.id,
      },
      200,
      'Récompense réclamée'
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Données invalides', details: error.issues },
        { status: 400 }
      );
    }
    return handleApiError(error, 'POST /api/slot-machine/claim-reward');
  }
}
