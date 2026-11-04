import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/requireAuth';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';

// GET /api/user/game-stats - Get user game stats
export async function GET() {
  try {
    const { session, error: authError } = await requireAuth({
      message: 'Non authentifié',
      requireUserId: true,
    });
    if (authError) return authError;

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        gameHighScore: true,
        hasDiscoveredCasino: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });
    }

    return NextResponse.json({ data: user });
  } catch (error) {
    logger.error('Error fetching game stats:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST /api/user/game-stats - Update user game stats
export async function POST(request: Request) {
  try {
    const { session, error: authError } = await requireAuth({
      message: 'Non authentifié',
      requireUserId: true,
    });
    if (authError) return authError;

    const body = await request.json();
    const { gameHighScore, hasDiscoveredCasino } = body;

    // Build update data conditionally
    const updateData: { gameHighScore?: number; hasDiscoveredCasino?: boolean } = {};

    // Only update highscore if provided and greater than current
    if (typeof gameHighScore === 'number') {
      const currentUser = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { gameHighScore: true },
      });

      if (gameHighScore > (currentUser?.gameHighScore ?? 0)) {
        updateData.gameHighScore = gameHighScore;
      }
    }

    // Only set hasDiscoveredCasino to true (never back to false)
    if (hasDiscoveredCasino === true) {
      updateData.hasDiscoveredCasino = true;
    }

    // Only update if there's something to update
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ data: { updated: false } });
    }

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: updateData,
      select: {
        gameHighScore: true,
        hasDiscoveredCasino: true,
      },
    });

    return NextResponse.json({ data: { ...user, updated: true } });
  } catch (error) {
    logger.error('Error updating game stats:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
