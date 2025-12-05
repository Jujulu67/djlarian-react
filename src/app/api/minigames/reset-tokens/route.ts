import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { createSuccessResponse, createUnauthorizedResponse } from '@/lib/api/responseHelpers';
import { handleApiError } from '@/lib/api/errorHandler';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return createUnauthorizedResponse('Non authentifié');
    }

    // Optional: Check for admin role if your app has roles
    // if (session.user.role !== 'ADMIN') { ... }

    // Reset tokens to daily amount
    const RESET_AMOUNT = 100;

    const userTokens = await prisma.userSlotMachineTokens.upsert({
      where: { userId: session.user.id },
      update: {
        tokens: RESET_AMOUNT,
        lastResetDate: new Date(),
      },
      create: {
        userId: session.user.id,
        tokens: RESET_AMOUNT,
        lastResetDate: new Date(),
      },
    });

    return createSuccessResponse(userTokens, 200, `Jetons réinitialisés à ${RESET_AMOUNT}`);
  } catch (error) {
    return handleApiError(error, 'POST /api/minigames/reset-tokens');
  }
}
