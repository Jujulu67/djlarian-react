/**
 * Système de logging centralisé pour l'application
 * Remplace tous les console.log/warn/error par un système unifié
 *
 * Niveaux de log :
 * - debug: Informations de débogage (désactivé en production)
 * - info: Informations générales
 * - warn: Avertissements
 * - error: Erreurs
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogOptions {
  level?: LogLevel;
  prefix?: string;
  disableInProduction?: boolean;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  private isProduction = process.env.NODE_ENV === 'production';

  /**
   * Log de débogage (uniquement en développement)
   */
  debug(message: string, ...args: unknown[]): void {
    if (this.isDevelopment) {
      console.log(`[DEBUG] ${message}`, ...args);
    }
  }

  /**
   * Log d'information
   */
  info(message: string, ...args: unknown[]): void {
    if (!this.isProduction) {
      console.log(`[INFO] ${message}`, ...args);
    }
  }

  /**
   * Log d'avertissement
   */
  warn(message: string, ...args: unknown[]): void {
    console.warn(`[WARN] ${message}`, ...args);
  }

  /**
   * Log d'erreur
   * Accepte un message et des arguments supplémentaires (peut être une erreur)
   */
  error(message: string, ...args: unknown[]): void {
    // Convertir les erreurs en format lisible
    const formattedArgs = args.map((arg) => {
      if (arg instanceof Error) {
        return arg.message;
      }
      return arg;
    });
    console.error(`[ERROR] ${message}`, ...formattedArgs);
  }

  /**
   * Log avec préfixe personnalisé
   */
  log(prefix: string, message: string, ...args: unknown[]): void {
    if (!this.isProduction) {
      console.log(`[${prefix}] ${message}`, ...args);
    }
  }

  /**
   * Log avec options avancées
   */
  logWithOptions(message: string, options: LogOptions = {}, ...args: unknown[]): void {
    const { level = 'info', prefix, disableInProduction = false } = options;

    if (disableInProduction && this.isProduction) {
      return;
    }

    const logPrefix = prefix ? `[${prefix}]` : '';
    const levelPrefix = `[${level.toUpperCase()}]`;

    switch (level) {
      case 'debug':
        if (this.isDevelopment) {
          console.log(`${levelPrefix} ${logPrefix} ${message}`, ...args);
        }
        break;
      case 'info':
        if (!this.isProduction) {
          console.log(`${levelPrefix} ${logPrefix} ${message}`, ...args);
        }
        break;
      case 'warn':
        console.warn(`${levelPrefix} ${logPrefix} ${message}`, ...args);
        break;
      case 'error':
        console.error(`${levelPrefix} ${logPrefix} ${message}`, ...args);
        break;
    }
  }
}

// Export d'une instance singleton
export const logger = new Logger();

// Export de la classe pour les cas avancés
export { Logger };

// Export des types
export type { LogLevel, LogOptions };
