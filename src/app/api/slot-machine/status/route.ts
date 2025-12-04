import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { createSuccessResponse, createUnauthorizedResponse } from '@/lib/api/responseHelpers';
import { handleApiError } from '@/lib/api/errorHandler';
import prisma from '@/lib/prisma';
import type { SlotMachineStatus } from '@/types/slot-machine';

const DAILY_TOKENS = 100;

/**
 * Vérifie si un reset quotidien est nécessaire et le fait si besoin
 */
function shouldResetDaily(lastResetDate: Date): boolean {
  const now = new Date();
  const lastReset = new Date(lastResetDate);

  // Comparer les dates (sans l'heure)
  const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const lastResetDateOnly = new Date(
    lastReset.getFullYear(),
    lastReset.getMonth(),
    lastReset.getDate()
  );

  return nowDate.getTime() > lastResetDateOnly.getTime();
}

/**
 * GET /api/slot-machine/status
 * Récupère le statut de la machine à sous pour l'utilisateur
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return createUnauthorizedResponse('Non authentifié');
    }

    // Récupérer ou créer l'entrée pour l'utilisateur
    let userTokens = await prisma.userSlotMachineTokens.findUnique({
      where: { userId: session.user.id },
    });

    // Si l'utilisateur n'a pas encore d'entrée, en créer une
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

    // Calculer la date du prochain reset (minuit du jour suivant)
    const now = new Date();
    const nextReset = new Date(now);
    nextReset.setDate(nextReset.getDate() + 1);
    nextReset.setHours(0, 0, 0, 0);

    const status: SlotMachineStatus = {
      tokens: userTokens.tokens,
      nextResetDate: nextReset,
      totalSpins: userTokens.totalSpins,
      totalWins: userTokens.totalWins,
    };

    return createSuccessResponse(status, 200, 'Statut récupéré');
  } catch (error) {
    return handleApiError(error, 'GET /api/slot-machine/status');
  }
}
