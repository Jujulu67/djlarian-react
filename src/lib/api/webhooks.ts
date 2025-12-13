import { logger } from '@/lib/logger';
import prisma from '@/lib/prisma';
import { defaultConfigs } from '@/config/defaults';
import { sanitizeObjectForLogs, sanitizeForLogs } from '@/lib/assistant/utils/sanitize-logs';

/**
 * Récupère l'URL du webhook depuis la base de données
 */
async function getWebhookUrl(): Promise<string | null> {
  try {
    const config = await prisma.siteConfig.findUnique({
      where: {
        section_key: {
          section: 'api',
          key: 'webhookUrl',
        },
      },
    });

    return config?.value || null;
  } catch (error) {
    logger.error("Erreur lors de la récupération de l'URL webhook:", error);
    return null;
  }
}

/**
 * Types d'événements pour les webhooks
 */
export type WebhookEventType =
  | 'music.created'
  | 'music.updated'
  | 'music.deleted'
  | 'event.created'
  | 'event.updated'
  | 'event.deleted'
  | 'user.created'
  | 'user.updated'
  | 'user.deleted'
  | 'upload.completed'
  | 'config.updated';

/**
 * Payload d'un webhook
 */
export interface WebhookPayload {
  event: WebhookEventType;
  timestamp: string;
  data: Record<string, unknown>;
  metadata?: {
    userId?: string;
    ip?: string;
    userAgent?: string;
  };
}

/**
 * Envoie un webhook de manière asynchrone (non bloquant)
 * @param event Type d'événement
 * @param data Données de l'événement
 * @param metadata Métadonnées optionnelles
 */
export async function sendWebhook(
  event: WebhookEventType,
  data: Record<string, unknown>,
  metadata?: WebhookPayload['metadata']
): Promise<void> {
  try {
    const webhookUrl = await getWebhookUrl();

    // Si pas d'URL configurée, ne rien faire
    if (!webhookUrl || webhookUrl.trim() === '') {
      return;
    }

    // Sanitizer les données avant de les envoyer (security-critical)
    // Note: On sanitize seulement pour les logs, pas pour le webhook lui-même
    // car le webhook peut avoir besoin des données complètes
    const sanitizedDataForLogs = sanitizeObjectForLogs(data);

    const payload: WebhookPayload = {
      event,
      timestamp: new Date().toISOString(),
      data,
      metadata,
    };

    // Envoyer de manière asynchrone (ne pas bloquer la requête)
    fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'DJ-Larian-Webhook/1.0',
      },
      body: JSON.stringify(payload),
    })
      .then(async (response) => {
        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unknown error');
          // Sanitizer l'errorText au cas où il contiendrait des données sensibles
          const sanitizedErrorText =
            typeof errorText === 'string' ? sanitizeForLogs(errorText) : String(errorText);
          logger.warn(
            `Webhook failed: ${response.status} ${response.statusText} - ${sanitizedErrorText}`
          );
        } else {
          logger.debug(`Webhook sent successfully: ${event}`, sanitizedDataForLogs);
        }
      })
      .catch((error) => {
        // Sanitizer le message d'erreur
        const sanitizedError = sanitizeObjectForLogs({
          message: error.message,
          stack: error.stack,
        });
        logger.error(`Error sending webhook:`, sanitizedError);
      });
  } catch (error) {
    logger.error("Erreur lors de l'envoi du webhook:", error);
    // Ne pas bloquer l'exécution en cas d'erreur
  }
}
