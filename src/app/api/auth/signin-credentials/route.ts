import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/api/rateLimiter';
import { compare as bcryptCompare } from '@/lib/bcrypt-edge';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { hkdf } from '@panva/hkdf';
import { EncryptJWT, base64url, calculateJwkThumbprint } from 'jose';

/**
 * Route API pour la connexion avec credentials
 * Crée un JWT chiffré (JWE) compatible avec Auth.js v5
 *
 * Utilise la même méthode de dérivation de clé que Auth.js:
 * - HKDF avec SHA-256
 * - Salt = nom du cookie
 * - Info = "Auth.js Generated Encryption Key ({salt})"
 */

/** Tentatives de connexion par minute et par IP. */
const SIGNIN_RATE_LIMIT = 10;

/** Algorithme de hachage du thumbprint JWK, selon la taille de la clé en bits */
function getThumbprintHashAlg(keyBits: number) {
  if (keyBits === 512) return 'sha512';
  if (keyBits === 384) return 'sha384';
  return 'sha256';
}

export async function POST(request: NextRequest) {
  const rateLimitResponse = await rateLimit(request, SIGNIN_RATE_LIMIT);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      logger.warn('[API] /api/auth/signin-credentials - Credentials manquants');
      return NextResponse.json({ error: 'Email et mot de passe requis' }, { status: 400 });
    }

    // Récupérer l'utilisateur
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        hashedPassword: true,
        role: true,
        image: true,
      },
    });

    if (!user?.hashedPassword) {
      logger.warn(
        '[API] /api/auth/signin-credentials - Utilisateur non trouvé ou sans mot de passe'
      );
      return NextResponse.json({ error: 'CredentialsSignin' }, { status: 401 });
    }

    // Vérifier le mot de passe
    const isPasswordValid = await bcryptCompare(password, user.hashedPassword);

    if (!isPasswordValid) {
      logger.warn('[API] /api/auth/signin-credentials - Mot de passe invalide');
      return NextResponse.json({ error: 'CredentialsSignin' }, { status: 401 });
    }

    // Configuration
    const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;

    if (!secret) {
      logger.error('[API] /api/auth/signin-credentials - NEXTAUTH_SECRET non défini');
      return NextResponse.json({ error: 'Configuration error' }, { status: 500 });
    }

    const isSecure = process.env.NODE_ENV === 'production';
    const cookieName = isSecure ? '__Secure-authjs.session-token' : 'authjs.session-token';
    const salt = cookieName; // Le salt est le nom du cookie

    const maxAge = 30 * 24 * 60 * 60; // 30 jours
    const now = Math.floor(Date.now() / 1000);
    const expires = now + maxAge;

    // Payload du token - doit correspondre à ce que Auth.js attend
    const tokenPayload = {
      name: user.name,
      email: user.email,
      picture: user.image,
      sub: user.id,
      id: user.id,
      role: user.role,
    };

    // Dériver la clé de chiffrement exactement comme Auth.js le fait
    // Utilise HKDF avec SHA-256, longueur 64 bytes pour A256CBC-HS512
    const encryptionSecret = await hkdf(
      'sha256',
      secret,
      salt,
      `Auth.js Generated Encryption Key (${salt})`,
      64 // 64 bytes pour A256CBC-HS512
    );

    // Calculer le thumbprint pour le kid
    const hashAlg = getThumbprintHashAlg(encryptionSecret.byteLength << 3);
    const thumbprint = await calculateJwkThumbprint(
      { kty: 'oct', k: base64url.encode(encryptionSecret) },
      hashAlg
    );

    // Créer le JWE (JWT chiffré) avec jose
    const token = await new EncryptJWT(tokenPayload)
      .setProtectedHeader({ alg: 'dir', enc: 'A256CBC-HS512', kid: thumbprint })
      .setIssuedAt(now)
      .setExpirationTime(expires)
      .setJti(crypto.randomUUID())
      .encrypt(encryptionSecret);

    // Créer la réponse
    const response = NextResponse.json(
      {
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role,
        },
      },
      { status: 200 }
    );

    // Définir le cookie de session
    response.cookies.set(cookieName, token, {
      httpOnly: true,
      secure: isSecure,
      sameSite: 'lax',
      path: '/',
      maxAge: maxAge,
    });

    return response;
  } catch (error: unknown) {
    // Le détail reste dans les logs : le client ne reçoit qu'un message générique
    logger.error('[API] /api/auth/signin-credentials - Erreur:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
