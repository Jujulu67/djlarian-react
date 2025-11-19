import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { isR2Configured } from '@/lib/r2';

// Note: Pas de Edge Runtime car Prisma nécessite Node.js
// Le runtime sera automatiquement détecté par OpenNext

export async function GET() {
  console.log('[HEALTH CHECK] Début du health check');
  console.log('[HEALTH CHECK] Environment:', {
    NODE_ENV: process.env.NODE_ENV,
    NEXT_RUNTIME: process.env.NEXT_RUNTIME,
    CF_PAGES: process.env.CF_PAGES,
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
      r2: {
        status: isR2Configured ? 'configured' : 'not_configured',
        message: isR2Configured ? 'R2 is configured' : 'R2 is not configured',
      },
      environment: {
        nodeEnv: process.env.NODE_ENV || 'not_set',
        runtime: process.env.NEXT_RUNTIME || 'unknown',
        cfPages: process.env.CF_PAGES || 'not_set',
      },
    },
  };

  // Test database connection
  console.log('[HEALTH CHECK] Test de la connexion à la base de données...');
  try {
    console.log('[HEALTH CHECK] Prisma client type:', typeof prisma);
    console.log('[HEALTH CHECK] Prisma client methods:', Object.keys(prisma).slice(0, 10));
    
    console.log('[HEALTH CHECK] Exécution de $queryRaw...');
    // Utiliser une requête simple qui ne nécessite pas fs
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('[HEALTH CHECK] $queryRaw réussi, résultat:', result);
    
    health.checks.database.status = 'connected';
    health.checks.database.message = 'Database connection successful';
    console.log('[HEALTH CHECK] Connexion à la base de données réussie');
  } catch (error) {
    console.error('[HEALTH CHECK] Erreur lors du test de connexion à la base de données');
    health.checks.database.status = 'error';
    const errorMessage = error instanceof Error ? error.message : String(error);
    health.checks.database.message = errorMessage;
    health.status = 'degraded';
    
    // Log détaillé pour debug
    console.error('[HEALTH CHECK] Database error details:', {
      message: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      errorType: error?.constructor?.name,
      errorName: error instanceof Error ? error.name : undefined,
      errorCode: (error as any)?.code,
      errorErrno: (error as any)?.errno,
      errorSyscall: (error as any)?.syscall,
      errorPath: (error as any)?.path,
      fullError: JSON.stringify(error, Object.getOwnPropertyNames(error)),
    });
    
    // Vérifier si l'erreur vient de fs.readdir
    if (errorMessage.includes('fs.readdir') || errorMessage.includes('readdir')) {
      console.error('[HEALTH CHECK] ⚠️ Erreur fs.readdir détectée !');
      console.error('[HEALTH CHECK] Cela indique que Prisma essaie d\'utiliser fs.readdir');
      console.error('[HEALTH CHECK] Vérifier que Prisma est correctement externalisé dans le build');
    }
  }

  // Test R2 connection (if configured)
  if (isR2Configured) {
    try {
      // Just check if R2 client is available, don't make actual request
      health.checks.r2.status = 'available';
      health.checks.r2.message = 'R2 client is available';
    } catch (error) {
      health.checks.r2.status = 'error';
      health.checks.r2.message =
        error instanceof Error ? error.message : 'Unknown R2 error';
      health.status = 'degraded';
    }
  }

  const statusCode = health.status === 'ok' ? 200 : 503;
  return NextResponse.json(health, { status: statusCode });
}

