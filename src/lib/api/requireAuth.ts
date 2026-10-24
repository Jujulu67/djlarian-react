import { timingSafeEqual } from 'crypto';

import { NextResponse } from 'next/server';
import type { Session } from 'next-auth';

import { auth } from '@/auth';

import { getInternalSecret, INTERNAL_AUTH_HEADER } from './internalAuth';

type AuthResult = { session: Session; error: null } | { session: null; error: NextResponse };

type AuthErrorOptions = {
  /** Code renvoyé à un visiteur non connecté (401 par défaut). */
  anonymousStatus?: 401 | 403;
  /** Message d'erreur renvoyé au client ('Non autorisé' par défaut). */
  message?: string;
  /** Réponse complète à renvoyer à un visiteur non connecté (remplace anonymousStatus/message). */
  onAnonymous?: () => NextResponse;
  /** Si vrai, une session sans `user.id` est traitée comme anonyme (garantit `session.user.id`). */
  requireUserId?: boolean;
};

function authError(message: string, status: number): AuthResult {
  return { session: null, error: NextResponse.json({ error: message }, { status }) };
}

/**
 * Vérifie qu'un utilisateur est connecté.
 * Usage : `const { session, error } = await requireAuth(); if (error) return error;`
 */
export async function requireAuth({
  anonymousStatus = 401,
  message = 'Non autorisé',
  onAnonymous,
  requireUserId = false,
}: AuthErrorOptions = {}): Promise<AuthResult> {
  const session = await auth();
  if (!session?.user || (requireUserId && !session.user.id)) {
    return onAnonymous
      ? { session: null, error: onAnonymous() }
      : authError(message, anonymousStatus);
  }
  return { session, error: null };
}

/**
 * Vérifie qu'un administrateur est connecté.
 * Usage : `const { session, error } = await requireAdmin(); if (error) return error;`
 * Les options permettent de conserver les codes et messages existants d'une route.
 */
export async function requireAdmin({
  nonAdminStatus = 403,
  onNonAdmin,
  ...options
}: AuthErrorOptions & {
  /** Code renvoyé à un utilisateur connecté non admin (403 par défaut). */
  nonAdminStatus?: 401 | 403;
  /** Réponse complète à renvoyer à un utilisateur non admin (remplace nonAdminStatus/message). */
  onNonAdmin?: () => NextResponse;
} = {}): Promise<AuthResult> {
  const result = await requireAuth(options);
  if (result.error) return result;
  if (result.session.user.role !== 'ADMIN') {
    if (onNonAdmin) return { session: null, error: onNonAdmin() };
    return authError(options.message ?? 'Non autorisé', nonAdminStatus);
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
