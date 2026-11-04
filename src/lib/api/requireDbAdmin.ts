import { NextResponse } from 'next/server';

import prisma from '@/lib/prisma';

import { requireAuth, type AuthResult } from './requireAuth';

/**
 * Vérifie qu'un administrateur est connecté, en relisant son rôle en base (par email)
 * plutôt que dans la session : un changement de rôle s'applique sans reconnexion.
 * Réponses : 401 `{ error: 'Unauthorized' }` si anonyme, 403 `{ error: 'Forbidden' }` sinon.
 * Usage : `const { session, error } = await requireDbAdmin(); if (error) return error;`
 */
export async function requireDbAdmin(): Promise<AuthResult> {
  const result = await requireAuth({ message: 'Unauthorized' });
  if (result.error) return result;

  const dbUser = await prisma.user.findUnique({
    where: { email: result.session.user.email as string },
    select: { role: true },
  });

  if (dbUser?.role !== 'ADMIN') {
    return {
      session: null,
      error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    };
  }
  return result;
}
