import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';

// GET /api/user/game-stats - Get user game stats
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
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
    console.error('Error fetching game stats:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST /api/user/game-stats - Update user game stats
export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json();
    const { gameHighScore, hasDiscoveredCasino } = body;

    // Build update data conditionally
    const updateData: { gameHighScore?: number; hasDiscoveredCasino?: boolean } = {};

    // Only update highscore if provided and greater than current
    if (typeof gameHighScore === 'number') {
      const currentUser = await prisma.user.findUnique({
        where: { email: session.user.email },
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
      where: { email: session.user.email },
      data: updateData,
      select: {
        gameHighScore: true,
        hasDiscoveredCasino: true,
      },
    });

    return NextResponse.json({ data: { ...user, updated: true } });
  } catch (error) {
    console.error('Error updating game stats:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
