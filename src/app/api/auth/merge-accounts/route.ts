import { NextRequest, NextResponse } from 'next/server';

import { hkdf } from '@panva/hkdf';
import { jwtDecrypt } from 'jose';

import { rateLimit } from '@/lib/api/rateLimiter';
import { compare as bcryptCompare } from '@/lib/bcrypt-edge';
import { logger } from '@/lib/logger';
import prisma from '@/lib/prisma';

/** Tentatives de fusion par minute et par IP (le mot de passe y est vérifié). */
const MERGE_RATE_LIMIT = 5;

/** Vrai si aucun mot de passe n'est requis, ou si le mot de passe fourni correspond. */
async function isPasswordAccepted(
  password: unknown,
  hashedPassword: string | null
): Promise<boolean> {
  if (!hashedPassword) return true;
  return (
    typeof password === 'string' &&
    password.length > 0 &&
    (await bcryptCompare(password, hashedPassword))
  );
}

/** Champs du compte existant à mettre à jour avec les données OAuth choisies. */
function buildUserUpdateData(
  options: { useOAuthName?: boolean; useOAuthImage?: boolean },
  payload: { name?: string; image?: string }
): { name?: string; image?: string } {
  const updateData: { name?: string; image?: string } = {};
  if (options.useOAuthName && payload.name) updateData.name = payload.name;
  if (options.useOAuthImage && payload.image) updateData.image = payload.image;
  return updateData;
}

/**
 * Route pour fusionner les comptes après confirmation utilisateur
 */
export async function POST(request: NextRequest) {
  const rateLimitResponse = await rateLimit(request, MERGE_RATE_LIMIT);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const body = await request.json();
    const { token, password } = body;
    const options = body.options ?? {};

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

    // Compte protégé par mot de passe : prouver qu'on en est le propriétaire. Sans cette
    // vérification, quelqu'un qui a créé un compte avec l'email d'une victime garderait
    // l'accès par mot de passe une fois la connexion OAuth de la victime fusionnée.
    const passwordOk = await isPasswordAccepted(password, existingUser.hashedPassword);
    if (!passwordOk) {
      logger.warn('[API] merge accounts - Mot de passe absent ou incorrect');
      return NextResponse.json({ error: 'Mot de passe incorrect' }, { status: 403 });
    }

    // Préparer les données de mise à jour
    const updateData = buildUserUpdateData(options, payload);

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
    logger.error('[API] Erreur merge accounts:', error);
    return NextResponse.json({ error: 'Erreur lors de la fusion des comptes' }, { status: 500 });
  }
}
