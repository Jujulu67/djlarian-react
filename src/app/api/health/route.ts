import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { isR2Configured } from '@/lib/r2';

// Note: Pas de Edge Runtime car Prisma nécessite Node.js
// Le runtime sera automatiquement détecté par OpenNext

export async function GET() {
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
  try {
    // Utiliser une requête simple qui ne nécessite pas fs
    await prisma.$queryRaw`SELECT 1 as test`;
    health.checks.database.status = 'connected';
    health.checks.database.message = 'Database connection successful';
  } catch (error) {
    health.checks.database.status = 'error';
    const errorMessage = error instanceof Error ? error.message : String(error);
    health.checks.database.message = errorMessage;
    health.status = 'degraded';
    
    // Log détaillé pour debug
    console.error('[HEALTH CHECK] Database error:', {
      message: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      errorType: error?.constructor?.name,
    });
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

