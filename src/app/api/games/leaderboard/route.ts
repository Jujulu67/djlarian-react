import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // 1. Rhythm Game Leaderboard (Top 10 highest scores)
    const rhythmGameLeaderboard = await prisma.user.findMany({
      where: {
        gameHighScore: {
          gt: 0, // Only users who have played
        },
      },
      select: {
        id: true,
        name: true,
        image: true,
        gameHighScore: true,
      },
      orderBy: {
        gameHighScore: 'desc',
      },
      take: 10,
    });

    // 2. Casino Leaderboard (Top 10 most wins/tokens)
    // Using UserSlotMachineTokens to find top winners
    const casinoLeaderboardRaw = await prisma.userSlotMachineTokens.findMany({
      where: {
        totalWins: {
          gt: 0,
        },
      },
      select: {
        totalWins: true,
        totalSpins: true,
        tokens: true,
        User: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
      orderBy: {
        totalWins: 'desc',
      },
      take: 10,
    });

    // Flatten casino data structure for easier frontend consumption
    const casinoLeaderboard = casinoLeaderboardRaw.map((record) => ({
      id: record.User.id,
      name: record.User.name,
      image: record.User.image,
      totalWins: record.totalWins,
      totalSpins: record.totalSpins,
      tokens: record.tokens,
    }));

    // 3. Richest Players (Top 10 tokens currently held)
    const richestLeaderboardRaw = await prisma.userSlotMachineTokens.findMany({
      where: {
        tokens: {
          gt: 0,
        },
      },
      select: {
        totalWins: true,
        totalSpins: true,
        tokens: true,
        User: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
      orderBy: {
        tokens: 'desc',
      },
      take: 10,
    });

    const richestLeaderboard = richestLeaderboardRaw.map((record) => ({
      id: record.User.id,
      name: record.User.name,
      image: record.User.image,
      totalWins: record.totalWins,
      totalSpins: record.totalSpins,
      tokens: record.tokens,
    }));

    // 4. Most Active Players (Top 10 total spins)
    const mostActiveLeaderboardRaw = await prisma.userSlotMachineTokens.findMany({
      where: {
        totalSpins: {
          gt: 0,
        },
      },
      select: {
        totalWins: true,
        totalSpins: true,
        tokens: true,
        User: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
      orderBy: {
        totalSpins: 'desc',
      },
      take: 10,
    });

    const mostActiveLeaderboard = mostActiveLeaderboardRaw.map((record) => ({
      id: record.User.id,
      name: record.User.name,
      image: record.User.image,
      totalWins: record.totalWins,
      totalSpins: record.totalSpins,
      tokens: record.tokens,
    }));

    // 5. Global Community Stats
    const globalStats = await prisma.userSlotMachineTokens.aggregate({
      _sum: {
        tokens: true,
        totalSpins: true,
        totalWins: true,
      },
    });

    return NextResponse.json({
      rhythmGame: rhythmGameLeaderboard,
      casino: casinoLeaderboard,
      richest: richestLeaderboard,
      mostActive: mostActiveLeaderboard,
      global: {
        totalTokens: globalStats._sum.tokens || 0,
        totalSpins: globalStats._sum.totalSpins || 0,
        totalWins: globalStats._sum.totalWins || 0,
      },
    });
  } catch (error) {
    console.error('[LEADERBOARD_GET]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
