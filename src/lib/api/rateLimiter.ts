import { NextRequest, NextResponse } from 'next/server';

import { logger } from '@/lib/logger';
import prisma from '@/lib/prisma';
import { defaultConfigs } from '@/config/defaults';

// Cache en mémoire pour le rate limiting (simple, pour production utiliser Redis)
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitCache = new Map<string, RateLimitEntry>();
const CACHE_CLEANUP_INTERVAL = 60 * 1000; // Nettoyer le cache toutes les minutes

// Nettoyer le cache périodiquement
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitCache.entries()) {
      if (entry.resetTime < now) {
        rateLimitCache.delete(key);
      }
    }
  }, CACHE_CLEANUP_INTERVAL);
}

/**
 * Récupère la configuration API depuis la base de données
 */
async function getApiConfig() {
  try {
    const configs = await prisma.siteConfig.findMany({
      where: { section: 'api' },
    });

    const apiConfig: { apiEnabled: boolean; rateLimit: number } = {
      apiEnabled: defaultConfigs.api.apiEnabled,
      rateLimit: defaultConfigs.api.rateLimit,
    };

    configs.forEach((config) => {
      if (config.key === 'apiEnabled') {
        apiConfig.apiEnabled = config.value === 'true';
      } else if (config.key === 'rateLimit') {
        apiConfig.rateLimit = parseInt(config.value || '100', 10);
      }
    });

    return apiConfig;
  } catch (error) {
    logger.error('Erreur lors de la récupération de la config API:', error);
    // Retourner les valeurs par défaut en cas d'erreur
    return {
      apiEnabled: defaultConfigs.api.apiEnabled,
      rateLimit: defaultConfigs.api.rateLimit,
    };
  }
}

/**
 * Obtient l'identifiant unique pour le rate limiting (IP + route)
 */
function getRateLimitKey(request: NextRequest): string {
  const ip =
    request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
  const path = request.nextUrl.pathname;
  return `${ip}:${path}`;
}

/**
 * Middleware de rate limiting
 * @param request La requête Next.js
 * @param limit Optionnel: limite personnalisée (sinon utilise la config DB)
 * @returns null si OK, NextResponse avec erreur 429 si limité
 */
export async function rateLimit(
  request: NextRequest,
  customLimit?: number
): Promise<NextResponse | null> {
  try {
    // Récupérer la configuration API
    const apiConfig = await getApiConfig();

    // Vérifier si l'API est activée
    if (!apiConfig.apiEnabled) {
      return NextResponse.json({ error: 'API is disabled' }, { status: 503 });
    }

    // Utiliser la limite personnalisée ou celle de la config
    const limit = customLimit || apiConfig.rateLimit;
    const key = getRateLimitKey(request);
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute

    // Récupérer ou créer l'entrée
    let entry = rateLimitCache.get(key);

    if (!entry || entry.resetTime < now) {
      // Nouvelle fenêtre de temps
      entry = {
        count: 1,
        resetTime: now + windowMs,
      };
      rateLimitCache.set(key, entry);
      return null; // OK
    }

    // Vérifier la limite
    if (entry.count >= limit) {
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
      logger.warn(`Rate limit exceeded for ${key}: ${entry.count}/${limit}`);

      return NextResponse.json(
        {
          error: 'Too many requests',
          message: `Rate limit exceeded. Maximum ${limit} requests per minute.`,
          retryAfter,
        },
        {
          status: 429,
          headers: {
            'Retry-After': retryAfter.toString(),
            'X-RateLimit-Limit': limit.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(entry.resetTime).toISOString(),
          },
        }
      );
    }

    // Incrémenter le compteur
    entry.count++;
    rateLimitCache.set(key, entry);

    return null; // OK
  } catch (error) {
    logger.error('Erreur lors du rate limiting:', error);
    // En cas d'erreur, permettre la requête (fail open)
    return null;
  }
}
