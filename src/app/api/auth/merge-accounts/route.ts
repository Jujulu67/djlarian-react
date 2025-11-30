import { NextRequest, NextResponse } from 'next/server';

import prisma from '@/lib/prisma';
import { hkdf } from '@panva/hkdf';
import { jwtDecrypt } from 'jose';

/**
 * Route pour fusionner les comptes après confirmation utilisateur
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, options } = body;

    if (!token) {
      return NextResponse.json({ error: 'Token manquant' }, { status: 400 });
    }

    // Décrypter le token
    const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;
    if (!secret) {
      return NextResponse.json({ error: 'Configuration error' }, { status: 500 });
    }

    const isSecure = process.env.NODE_ENV === 'production';
    const cookieName = isSecure ? '__Secure-authjs.session-token' : 'authjs.session-token';
    const salt = cookieName;

    const encryptionSecret = await hkdf(
      'sha256',
      secret,
      salt,
      `Auth.js Generated Encryption Key (${salt})`,
      64
    );

    let decryptedToken;
    try {
      decryptedToken = await jwtDecrypt(token, encryptionSecret);
    } catch (error) {
      return NextResponse.json({ error: 'Token invalide ou expiré' }, { status: 400 });
    }

    const payload = decryptedToken.payload as {
      email: string;
      name?: string;
      image?: string;
      provider: string;
      providerAccountId: string;
      existingUserId: string;
      accountData: {
        type: string;
        refresh_token?: string;
        access_token?: string;
        expires_at?: number;
        token_type?: string;
        scope?: string;
        id_token?: string;
        session_state?: string;
      };
    };

    // Récupérer l'utilisateur existant
    const existingUser = await prisma.user.findUnique({
      where: { id: payload.existingUserId },
      include: { Account: true },
    });

    if (!existingUser) {
      return NextResponse.json({ error: 'Compte existant introuvable' }, { status: 404 });
    }

    // Vérifier si le compte OAuth n'est pas déjà lié
    const hasAccountForProvider = existingUser.Account.some(
      (acc) => acc.provider === payload.provider
    );

    if (hasAccountForProvider) {
      return NextResponse.json({ error: 'Le compte est déjà lié' }, { status: 400 });
    }

    // Préparer les données de mise à jour
    const updateData: {
      name?: string;
      image?: string;
    } = {};

    if (options.useOAuthName && payload.name) {
      updateData.name = payload.name;
    }

    if (options.useOAuthImage && payload.image) {
      updateData.image = payload.image;
    }

    // Fusionner les comptes dans une transaction
    await prisma.$transaction(async (tx) => {
      // Mettre à jour l'utilisateur
      if (Object.keys(updateData).length > 0) {
        await tx.user.update({
          where: { id: existingUser.id },
          data: updateData,
        });
      }

      // Créer le compte OAuth
      await tx.account.create({
        data: {
          userId: existingUser.id,
          type: payload.accountData.type,
          provider: payload.provider,
          providerAccountId: payload.providerAccountId,
          refresh_token: payload.accountData.refresh_token,
          access_token: payload.accountData.access_token,
          expires_at: payload.accountData.expires_at,
          token_type: payload.accountData.token_type,
          scope: payload.accountData.scope,
          id_token: payload.accountData.id_token,
          session_state: payload.accountData.session_state,
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: 'Comptes fusionnés avec succès',
      provider: payload.provider, // Retourner le provider pour la connexion automatique
      userId: existingUser.id, // Retourner l'ID utilisateur pour référence
    });
  } catch (error) {
    console.error('[API] Erreur merge accounts:', error);
    return NextResponse.json({ error: 'Erreur lors de la fusion des comptes' }, { status: 500 });
  }
}
