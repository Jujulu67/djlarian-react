import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { createSuccessResponse, createUnauthorizedResponse } from '@/lib/api/responseHelpers';
import { handleApiError } from '@/lib/api/errorHandler';
import prisma from '@/lib/prisma';
import type { SpinResult } from '@/types/slot-machine';
import { SymbolType, RewardType } from '@/types/slot-machine';
import { COST_PER_SPIN, getRandomSymbol, determineReward } from '@/lib/slot-machine-logic';

const DAILY_TOKENS = 100;

/**
 * Vérifie si un reset quotidien est nécessaire et le fait si besoin
 */
function shouldResetDaily(lastResetDate: Date): boolean {
  const now = new Date();
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
 * POST /api/slot-machine/spin
 * Joue un tour de machine à sous
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return createUnauthorizedResponse('Non authentifié');
    }

    // Récupérer ou créer l'entrée pour l'utilisateur
    let userTokens = await prisma.userSlotMachineTokens.findUnique({
      where: { userId: session.user.id },
    });

    if (!userTokens) {
      userTokens = await prisma.userSlotMachineTokens.create({
        data: {
          userId: session.user.id,
          tokens: DAILY_TOKENS,
          lastResetDate: new Date(),
        },
      });
    }

    // Vérifier si un reset quotidien est nécessaire
    if (shouldResetDaily(userTokens.lastResetDate)) {
      const today = new Date();
      userTokens = await prisma.userSlotMachineTokens.update({
        where: { userId: session.user.id },
        data: {
          tokens: DAILY_TOKENS,
          lastResetDate: today,
        },
      });
    }

    // Vérifier que l'utilisateur a des jetons (3 jetons par spin)
    if (userTokens.tokens < COST_PER_SPIN) {
      return NextResponse.json(
        {
          error: `Vous n'avez plus assez de jetons. Il vous faut ${COST_PER_SPIN} jetons par spin. Revenez demain !`,
        },
        { status: 400 }
      );
    }

    // --- DYNAMIC LUCK SYSTEM ---
    // Si l'utilisateur a un taux de victoire inférieur à 45% (et au moins 10 spins), on booste les chances
    // Calcule du Win Rate : totalWins / totalSpins
    const winRate = userTokens.totalSpins > 10 ? userTokens.totalWins / userTokens.totalSpins : 1;
    const useBooster = winRate < 0.45;

    // Générer les 3 symboles avec pondération pour un résultat "réaliste"
    // Si useBooster est true, on augmente les chances de petits gains (Cerise/Citron)
    const symbols: [SymbolType, SymbolType, SymbolType] = [
      getRandomSymbol(useBooster),
      getRandomSymbol(useBooster),
      getRandomSymbol(useBooster),
    ];

    // Déterminer la récompense
    const reward = determineReward(symbols);

    // --- SPECIAL REWARD BONUS ---
    // User request: "sousous avec les big wins"
    // Ajouter un bonus de jetons pour les items spéciaux
    let tokenBonus = 0;
    if (reward.rewardType === RewardType.QUEUE_SKIP) {
      tokenBonus = 100;
      reward.message += ` (+${tokenBonus} jetons)`;
    } else if (reward.rewardType === RewardType.ETERNAL_TICKET) {
      tokenBonus = 50;
      reward.message += ` (+${tokenBonus} jetons)`;
    }

    // Calculer le nouveau nombre de jetons (3 jetons par spin)
    // + gain éventuel de jetons (si rewardType === TOKENS)
    // + bonus de jetons (si item spécial)
    const tokensWon =
      (reward.rewardType === RewardType.TOKENS ? reward.rewardAmount : 0) + tokenBonus;
    let newTokens = userTokens.tokens - COST_PER_SPIN + tokensWon;

    // Mettre à jour la base de données
    await prisma.userSlotMachineTokens.update({
      where: { userId: session.user.id },
      data: {
        tokens: newTokens,
        totalSpins: { increment: 1 },
        totalWins: { increment: reward.isWin ? 1 : 0 },
      },
    });

    // Mettre à jour l'inventaire si récompense spéciale
    if (reward.rewardType === RewardType.QUEUE_SKIP) {
      // Logique pour Queue Skip (via table UserLiveItem ou autre - à adapter selon votre schéma)
      // Ici on suppose que le client gère la réclamation via /claim-reward qui fera l'ajout réel
      // OU on l'ajoute directement ici. Le système actuel semble utiliser /claim-reward pour les items.
      // On garde donc la logique actuelle : on retourne le rewardType et le client appellera claim-reward.
      // MAIS on a déjà donné les jetons bonus ci-dessus.
    } else if (reward.rewardType === RewardType.ETERNAL_TICKET) {
      // Idem
    }

    // Si on a un token bonus, on doit le renvoyer dans le rewardAmount pour que le toast affiche le bon montant ?
    // Non, rewardAmount pour les items spéciaux est "1" (quantité).
    // On ne change pas rewardAmount pour ne pas casser la logique de claim.
    // Les jetons sont ajoutés directement au solde.

    const result: SpinResult = {
      symbols,
      rewardType: reward.rewardType,
      rewardAmount: reward.rewardAmount,
      isWin: reward.isWin,
      message: reward.message,
    };

    return createSuccessResponse(result, 200, 'Spin effectué');
  } catch (error) {
    return handleApiError(error, 'POST /api/slot-machine/spin');
  }
}
