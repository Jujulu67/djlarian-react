/**
 * Utilitaire de logging de performance pour les opérations DB
 * Mesure la latence des connexions, queries et handlers complets
 *
 * Usage:
 *   const perf = createDbPerformanceLogger('addItemToUser');
 *   const t0 = perf.start();
 *   // ... opérations DB ...
 *   perf.end(t0, { query: 'userLiveItem.findUnique' });
 */

import { logger } from './logger';

interface PerformanceMetrics {
  handler: string;
  connectTime?: number;
  queryTime?: number;
  totalTime: number;
  query?: string;
  operation?: string;
  metadata?: Record<string, unknown>;
}

class DbPerformanceLogger {
  private handlerName: string;
  private enabled: boolean;

  constructor(handlerName: string) {
    this.handlerName = handlerName;
    // Activer uniquement en production pour diagnostiquer les problèmes de latence
    this.enabled = process.env.NODE_ENV === 'production';
  }

  /**
   * Démarre le chronomètre et retourne le timestamp
   */
  start(): number {
    return Date.now();
  }

  /**
   * Mesure le temps de connexion (entre t0 et t1)
   */
  logConnection(t0: number, t1: number): number {
    const connectTime = t1 - t0;
    if (this.enabled && connectTime > 0) {
      // Utiliser console.log directement pour que ça apparaisse dans Vercel
      console.log(`[DB Perf] ${this.handlerName} - connect: ${connectTime}ms`);
    }
    return connectTime;
  }

  /**
   * Mesure le temps d'exécution de la query (entre t1 et t2)
   */
  logQuery(t1: number, t2: number, query?: string): number {
    const queryTime = t2 - t1;
    if (this.enabled && queryTime > 0) {
      const queryInfo = query ? ` (${query})` : '';
      // Utiliser console.log directement pour que ça apparaisse dans Vercel
      console.log(`[DB Perf] ${this.handlerName} - query: ${queryTime}ms${queryInfo}`);
    }
    return queryTime;
  }

  /**
   * Log les métriques complètes à la fin du handler
   */
  end(
    t0: number,
    options?: {
      connectTime?: number;
      queryTime?: number;
      query?: string;
      operation?: string;
      metadata?: Record<string, unknown>;
    }
  ): PerformanceMetrics {
    const t3 = Date.now();
    const totalTime = t3 - t0;
    const connectTime = options?.connectTime;
    const queryTime = options?.queryTime;

    const metrics: PerformanceMetrics = {
      handler: this.handlerName,
      totalTime,
      ...(connectTime !== undefined && { connectTime }),
      ...(queryTime !== undefined && { queryTime }),
      ...(options?.query && { query: options.query }),
      ...(options?.operation && { operation: options.operation }),
      ...(options?.metadata && { metadata: options.metadata }),
    };

    if (this.enabled) {
      // Log structuré pour faciliter l'analyse
      const parts: string[] = [];
      if (connectTime !== undefined) {
        parts.push(`connect: ${connectTime}ms`);
      }
      if (queryTime !== undefined) {
        parts.push(`query: ${queryTime}ms`);
      }
      parts.push(`total: ${totalTime}ms`);

      const queryInfo = options?.query ? ` [${options.query}]` : '';
      // Utiliser console.log directement pour que ça apparaisse dans Vercel
      console.log(`[DB Perf] ${this.handlerName}${queryInfo} - ${parts.join(', ')}`);

      // Avertissement si le temps total est suspect (> 1000ms)
      if (totalTime > 1000) {
        console.warn(`[DB Perf] ⚠️ ${this.handlerName} est lent: ${totalTime}ms (seuil: 1000ms)`);
      }

      // Avertissement si la query est rapide mais le handler total est lent
      // Cela indique un problème de cold start Vercel
      if (queryTime !== undefined && queryTime < 100 && totalTime > 500) {
        console.warn(
          `[DB Perf] ⚠️ ${this.handlerName}: query rapide (${queryTime}ms) mais handler lent (${totalTime}ms) - possible cold start Vercel`
        );
      }
    }

    return metrics;
  }

  /**
   * Wrapper pour mesurer une opération Prisma complète
   */
  async measureQuery<T>(
    queryFn: () => Promise<T>,
    queryName?: string
  ): Promise<{ result: T; metrics: PerformanceMetrics }> {
    const t0 = this.start();
    let t1: number | undefined;
    let t2: number | undefined;

    try {
      // Note: Avec Prisma et le pooling Neon, la connexion est généralement
      // réutilisée, donc on ne mesure pas séparément le temps de connexion
      t1 = Date.now();
      const result = await queryFn();
      t2 = Date.now();

      const queryTime = t2 - t1;
      const metrics = this.end(t0, {
        queryTime,
        query: queryName,
      });

      return { result, metrics };
    } catch (error) {
      const tError = Date.now();
      const queryTime = t1 && t2 ? t2 - t1 : undefined;
      this.end(t0, {
        queryTime,
        query: queryName,
        metadata: { error: error instanceof Error ? error.message : String(error) },
      });
      throw error;
    }
  }
}

/**
 * Crée un logger de performance pour un handler spécifique
 */
export function createDbPerformanceLogger(handlerName: string): DbPerformanceLogger {
  return new DbPerformanceLogger(handlerName);
}

/**
 * Helper pour mesurer rapidement une query Prisma
 */
export async function measureDbQuery<T>(
  handlerName: string,
  queryFn: () => Promise<T>,
  queryName?: string
): Promise<T> {
  const perf = createDbPerformanceLogger(handlerName);
  const { result } = await perf.measureQuery(queryFn, queryName);
  return result;
}
