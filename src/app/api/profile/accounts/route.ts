import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/auth';
import prisma from '@/lib/prisma';

/**
 * GET /api/profile/accounts
 * Récupère les comptes OAuth liés à l'utilisateur connecté
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // Récupérer l'utilisateur avec ses comptes OAuth
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        hashedPassword: true,
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

    if (!user) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });
    }

    // Vérifier les providers disponibles
    const availableProviders = {
      google: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
      twitch: !!(process.env.TWITCH_CLIENT_ID && process.env.TWITCH_CLIENT_SECRET),
    };

    // Filtrer les comptes OAuth (type 'oauth' ou 'oidc')
    const oauthAccounts = user.Account.filter((acc) => acc.type === 'oauth' || acc.type === 'oidc');

    // Construire la réponse avec le statut de chaque provider
    const accounts = {
      google: {
        linked: oauthAccounts.some((acc) => acc.provider === 'google'),
        available: availableProviders.google,
        accountId: oauthAccounts.find((acc) => acc.provider === 'google')?.id || null,
      },
      twitch: {
        linked: oauthAccounts.some((acc) => acc.provider === 'twitch'),
        available: availableProviders.twitch,
        accountId: oauthAccounts.find((acc) => acc.provider === 'twitch')?.id || null,
      },
    };

    // Calculer la sécurité
    const hasPassword = !!user.hashedPassword;
    const canUnlink = oauthAccounts.length > 1 || hasPassword;

    return NextResponse.json({
      accounts,
      security: {
        hasPassword,
        oauthCount: oauthAccounts.length,
        canUnlink,
        isSecure: canUnlink,
      },
    });
  } catch (error) {
    console.error('[API] Erreur récupération comptes OAuth:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des comptes' },
      { status: 500 }
    );
  }
}
