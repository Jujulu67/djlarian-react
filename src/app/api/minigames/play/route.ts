import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { createSuccessResponse, createUnauthorizedResponse } from '@/lib/api/responseHelpers';
import { handleApiError } from '@/lib/api/errorHandler';
import prisma from '@/lib/prisma';
import { RewardType } from '@/types/slot-machine';

// Configuration du RTP (Return To Player) ~ 0.7
const GAME_COST = 10; // Coût par partie

// Valeurs estimées pour le calcul RTP :
// Queue Skip = 500 jetons
// Eternal Ticket = 50 jetons
// 1 Jeton = 1 valeur

interface GameOutcome {
  rewardType: RewardType | null;
  rewardAmount: number;
  isWin: boolean;
  message: string;
}

function determineOutcome(gameType: 'roulette' | 'scratch' | 'mystery'): GameOutcome {
  const rand = Math.random();

  // 0.1% - Super Jackpot (Queue Skip)
  if (rand < 0.001) {
    return {
      rewardType: RewardType.QUEUE_SKIP,
      rewardAmount: 1,
      isWin: true,
      message: 'JACKPOT ! Vous avez gagné un Queue Skip !',
    };
  }

  // 1% - Rare (Eternal Ticket)
  if (rand < 0.011) {
    return {
      rewardType: RewardType.ETERNAL_TICKET,
      rewardAmount: 1,
      isWin: true,
      message: 'Incroyable ! Un Ticket Éternel !',
    };
  }

  // 5% - Big Win (50 Jetons)
  if (rand < 0.061) {
    return {
      rewardType: RewardType.TOKENS,
      rewardAmount: 50,
      isWin: true,
      message: 'Gros Gain ! 50 Jetons !',
    };
  }

  // 20% - Medium Win (15 Jetons)
  if (rand < 0.261) {
    return {
      rewardType: RewardType.TOKENS,
      rewardAmount: 15,
      isWin: true,
      message: 'Gagné ! 15 Jetons.',
    };
  }

  // 10% - Refund/Small Win (5 Jetons)
  if (rand < 0.361) {
    return {
      rewardType: RewardType.TOKENS,
      rewardAmount: 5,
      isWin: true,
      message: 'Petit gain : 5 Jetons.',
    };
  }

  // 63.9% - Perdu
  const loseMessages = {
    roulette: [
      'Rien ne va plus...',
      'La banque gagne.',
      'Pas de chance sur ce tour.',
      'Réessayez !',
    ],
    scratch: [
      'Ticket perdant.',
      'Grattez encore !',
      'Pas de lot cette fois.',
      'La chance tournera.',
    ],
    mystery: [
      'Le coffre était vide.',
      'Score insuffisant.',
      'Les esprits sont silencieux.',
      'Retentez votre chance.',
    ],
  };

  const messages = loseMessages[gameType];
  return {
    rewardType: null,
    rewardAmount: 0,
    isWin: false,
    message: messages[Math.floor(Math.random() * messages.length)],
  };
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return createUnauthorizedResponse('Non authentifié');
    }

    const body = await request.json();
    const { gameType } = body;

    if (!['roulette', 'scratch', 'mystery'].includes(gameType)) {
      return NextResponse.json({ error: 'Type de jeu invalide' }, { status: 400 });
    }

    // Gestion des jetons
    let userTokens = await prisma.userSlotMachineTokens.findUnique({
      where: { userId: session.user.id },
    });

    if (!userTokens) {
      // Création initiale si n'existe pas (ne devrait pas arriver souvent si passé par la map)
      userTokens = await prisma.userSlotMachineTokens.create({
        data: {
          userId: session.user.id,
          tokens: 100, // Default daily
          lastResetDate: new Date(),
        },
      });
    }

    if (userTokens.tokens < GAME_COST) {
      return NextResponse.json(
        { error: `Pas assez de jetons. Coût : ${GAME_COST} jetons.` },
        { status: 400 }
      );
    }

    const outcome = determineOutcome(gameType as 'roulette' | 'scratch' | 'mystery');

    // Mise à jour BDD
    let newTokens = userTokens.tokens - GAME_COST;
    if (outcome.rewardType === RewardType.TOKENS) {
      newTokens += outcome.rewardAmount;
    }

    await prisma.userSlotMachineTokens.update({
      where: { userId: session.user.id },
      data: {
        tokens: newTokens,
        totalSpins: { increment: 1 }, // On utilise le même compteur pour tous les jeux pour l'instant
        totalWins: outcome.isWin ? { increment: 1 } : undefined,
      },
    });

    return createSuccessResponse({
      ...outcome,
      newBalance: newTokens,
      cost: GAME_COST,
    });
  } catch (error) {
    return handleApiError(error, 'POST /api/minigames/play');
  }
}
