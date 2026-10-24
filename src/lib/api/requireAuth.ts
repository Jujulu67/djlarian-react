import { timingSafeEqual } from 'crypto';

import { NextResponse } from 'next/server';
import type { Session } from 'next-auth';

import { auth } from '@/auth';

import { getInternalSecret, INTERNAL_AUTH_HEADER } from './internalAuth';

type AuthResult = { session: Session; error: null } | { session: null; error: NextResponse };

/**
 * Vérifie qu'un utilisateur est connecté.
 * Usage : `const { session, error } = await requireAuth(); if (error) return error;`
 */
export async function requireAuth(): Promise<AuthResult> {
  const session = await auth();
  if (!session?.user) {
    return {
      session: null,
      error: NextResponse.json({ error: 'Non autorisé' }, { status: 401 }),
    };
  }
  return { session, error: null };
}

/**
 * Vérifie qu'un administrateur est connecté.
 * Usage : `const { session, error } = await requireAdmin(); if (error) return error;`
 */
export async function requireAdmin(): Promise<AuthResult> {
  const result = await requireAuth();
  if (result.error) return result;
  if (result.session.user.role !== 'ADMIN') {
    return {
      session: null,
      error: NextResponse.json({ error: 'Non autorisé' }, { status: 403 }),
    };
  }
  return result;
}

/** Vrai si la requête vient du serveur lui-même (en-tête interne signé par le secret d'auth). */
export function isInternalRequest(request: Request): boolean {
  const secret = getInternalSecret();
  const provided = request.headers.get(INTERNAL_AUTH_HEADER);
  if (!secret || !provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}
