import { NextResponse } from 'next/server';

import { logger } from '@/lib/logger';
import prisma from '@/lib/prisma';

// Health check endpoint public - Vercel (Node.js runtime)
// Ne renvoie qu'un statut : les détails (erreur Prisma, environnement) vont dans les logs.

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1 as test`;
    return NextResponse.json({ status: 'ok' }, { status: 200 });
  } catch (error) {
    logger.error('HEALTH CHECK - Database connection failed', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      errorType: error?.constructor?.name,
      errorCode:
        error && typeof error === 'object' && 'code' in error ? String(error.code) : undefined,
      nodeEnv: process.env.NODE_ENV,
      runtime: process.env.NEXT_RUNTIME || 'nodejs',
      databaseUrlSet: Boolean(process.env.DATABASE_URL),
    });
    return NextResponse.json({ status: 'error' }, { status: 503 });
  }
}
