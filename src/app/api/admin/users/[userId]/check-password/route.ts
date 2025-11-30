import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';

/**
 * Route pour vérifier si un utilisateur a un mot de passe et des comptes OAuth
 * GET /api/admin/users/[userId]/check-password
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await auth();

    // Vérifier l'authentification et les autorisations
    if (!session?.user?.role || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const resolvedParams = await params;
    const { userId } = resolvedParams;

    // Récupérer l'utilisateur par email si userId est un email
    let user;
    if (userId.includes('@')) {
      user = await prisma.user.findUnique({
        where: { email: userId },
        select: {
          id: true,
          name: true,
          email: true,
          hashedPassword: true,
          role: true,
          createdAt: true,
          Account: {
            select: {
              id: true,
              provider: true,
              type: true,
              providerAccountId: true,
            },
          },
        },
      });
    } else {
      user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          hashedPassword: true,
          role: true,
          createdAt: true,
          Account: {
            select: {
              id: true,
              provider: true,
              type: true,
              providerAccountId: true,
            },
          },
        },
      });
    }

    if (!user) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });
    }

    const oauthAccounts = user.Account.filter((acc) => acc.type === 'oauth');
    const hasPassword = !!user.hashedPassword;
    const canUnlink = oauthAccounts.length > 1 || hasPassword;

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt.toISOString(),
      },
      hasPassword,
      passwordHash: user.hashedPassword ? `${user.hashedPassword.substring(0, 20)}...` : null,
      oauthAccounts: oauthAccounts.map((acc) => ({
        id: acc.id,
        provider: acc.provider,
        providerAccountId: acc.providerAccountId,
      })),
      totalAccounts: user.Account.length,
      canUnlink,
      securityStatus: canUnlink
        ? oauthAccounts.length === 1 && hasPassword
          ? 'warning'
          : 'ok'
        : 'critical',
    });
  } catch (error) {
    logger.error('[Admin] Erreur vérification mot de passe:', error);
    return NextResponse.json({ error: 'Erreur lors de la vérification' }, { status: 500 });
  }
}
