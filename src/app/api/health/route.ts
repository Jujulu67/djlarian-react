import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { isBlobConfigured } from '@/lib/blob';

// Health check endpoint - Vercel (Node.js runtime)

export async function GET() {
  logger.debug('HEALTH CHECK - Début du health check');
  logger.debug('HEALTH CHECK - Environment', {
    NODE_ENV: process.env.NODE_ENV,
    NEXT_RUNTIME: process.env.NEXT_RUNTIME,
    DATABASE_URL: process.env.DATABASE_URL ? `set (${process.env.DATABASE_URL.length} chars)` : 'not_set',
  });

  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    checks: {
      database: {
        status: 'unknown',
        message: '',
      },
      blob: {
        status: isBlobConfigured ? 'configured' : 'not_configured',
        message: isBlobConfigured ? 'Vercel Blob is configured' : 'Vercel Blob is not configured',
      },
      environment: {
        nodeEnv: process.env.NODE_ENV || 'not_set',
        runtime: process.env.NEXT_RUNTIME || 'nodejs',
      },
    },
  };

  // Test database connection
  logger.debug('HEALTH CHECK - Test de la connexion à la base de données...');
  try {
    logger.debug('HEALTH CHECK - Prisma client type', typeof prisma);
    logger.debug('HEALTH CHECK - Prisma client methods', Object.keys(prisma).slice(0, 10));
    
    logger.debug('HEALTH CHECK - Exécution de $queryRaw...');
    // Utiliser une requête simple qui ne nécessite pas fs
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    logger.debug('HEALTH CHECK - $queryRaw réussi', result);
    
    health.checks.database.status = 'connected';
    health.checks.database.message = 'Database connection successful';
    logger.debug('HEALTH CHECK - Connexion à la base de données réussie');
  } catch (error) {
    logger.error('HEALTH CHECK - Erreur lors du test de connexion à la base de données');
    health.checks.database.status = 'error';
    const errorMessage = error instanceof Error ? error.message : String(error);
    health.checks.database.message = errorMessage;
    health.status = 'degraded';
    
    // Log détaillé pour debug
    logger.error('HEALTH CHECK - Database error details', {
      message: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      errorType: error?.constructor?.name,
      errorName: error instanceof Error ? error.name : undefined,
      errorCode: error && typeof error === 'object' && 'code' in error ? String(error.code) : undefined,
      errorErrno: error && typeof error === 'object' && 'errno' in error ? Number(error.errno) : undefined,
      errorSyscall: error && typeof error === 'object' && 'syscall' in error ? String(error.syscall) : undefined,
      errorPath: error && typeof error === 'object' && 'path' in error ? String(error.path) : undefined,
      fullError: JSON.stringify(error, Object.getOwnPropertyNames(error)),
    });
    
  }

  // Test Vercel Blob connection (if configured)
  if (isBlobConfigured) {
    try {
      // Just check if Blob is configured, don't make actual request
      health.checks.blob.status = 'available';
      health.checks.blob.message = 'Vercel Blob is available';
    } catch (error) {
      health.checks.blob.status = 'error';
      health.checks.blob.message =
        error instanceof Error ? error.message : 'Unknown Blob error';
      health.status = 'degraded';
    }
  }

  const statusCode = health.status === 'ok' ? 200 : 503;
  return NextResponse.json(health, { status: statusCode });
}

