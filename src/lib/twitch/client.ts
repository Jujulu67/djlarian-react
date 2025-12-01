import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';
import type { TwitchSubscriptionStatus } from '@/types/live';

interface TwitchTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  scope: string[];
}

interface TwitchUserResponse {
  data: Array<{
    id: string;
    login: string;
    display_name: string;
    type: string;
    broadcaster_type: string;
    description: string;
    profile_image_url: string;
    offline_image_url: string;
    view_count: number;
    created_at: string;
  }>;
}

interface TwitchSubscriptionResponse {
  data: Array<{
    broadcaster_id: string;
    broadcaster_login: string;
    broadcaster_name: string;
    gifter_id?: string;
    gifter_login?: string;
    gifter_name?: string;
    is_gift: boolean;
    tier: string;
    plan_name: string;
  }>;
  pagination?: {
    cursor?: string;
  };
}

const TWITCH_API_BASE = 'https://api.twitch.tv/helix';
const TWITCH_OAUTH_BASE = 'https://id.twitch.tv/oauth2';

/**
 * Récupère le token d'accès Twitch pour un utilisateur
 */
async function getTwitchAccessToken(userId: string): Promise<string | null> {
  try {
    const account = await prisma.account.findFirst({
      where: {
        userId,
        provider: 'twitch',
      },
      select: {
        access_token: true,
        refresh_token: true,
        expires_at: true,
      },
    });

    if (!account || !account.access_token) {
      return null;
    }

    // Vérifier si le token est expiré
    const now = Math.floor(Date.now() / 1000);
    if (account.expires_at && account.expires_at < now) {
      // Token expiré, essayer de le rafraîchir
      if (account.refresh_token) {
        const refreshedToken = await refreshTwitchToken(userId, account.refresh_token);
        return refreshedToken;
      }
      return null;
    }

    return account.access_token;
  } catch (error) {
    logger.error('[Twitch] Erreur lors de la récupération du token:', error);
    return null;
  }
}

/**
 * Rafraîchit le token Twitch
 */
async function refreshTwitchToken(userId: string, refreshToken: string): Promise<string | null> {
  try {
    const clientId = process.env.TWITCH_CLIENT_ID;
    const clientSecret = process.env.TWITCH_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      logger.error('[Twitch] Client ID ou Secret manquant');
      return null;
    }

    const response = await fetch(`${TWITCH_OAUTH_BASE}/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!response.ok) {
      logger.error('[Twitch] Erreur lors du refresh token:', await response.text());
      return null;
    }

    const data = (await response.json()) as TwitchTokenResponse;

    // Mettre à jour le token dans la base de données
    await prisma.account.updateMany({
      where: {
        userId,
        provider: 'twitch',
      },
      data: {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: Math.floor(Date.now() / 1000) + data.expires_in,
      },
    });

    return data.access_token;
  } catch (error) {
    logger.error('[Twitch] Erreur lors du refresh token:', error);
    return null;
  }
}

/**
 * Récupère l'ID du broadcaster Twitch depuis les variables d'environnement
 */
function getBroadcasterId(): string | null {
  return process.env.TWITCH_BROADCASTER_ID || null;
}

/**
 * Vérifie si un utilisateur est abonné au broadcaster
 */
export async function checkTwitchSubscription(userId: string): Promise<TwitchSubscriptionStatus> {
  try {
    const accessToken = await getTwitchAccessToken(userId);
    if (!accessToken) {
      return {
        isSubscribed: false,
        tier: null,
        subscriberSince: null,
      };
    }

    const broadcasterId = getBroadcasterId();
    if (!broadcasterId) {
      logger.warn('[Twitch] TWITCH_BROADCASTER_ID non configuré');
      return {
        isSubscribed: false,
        tier: null,
        subscriberSince: null,
      };
    }

    // Récupérer l'ID Twitch de l'utilisateur
    const userResponse = await fetch(`${TWITCH_API_BASE}/users`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Client-Id': process.env.TWITCH_CLIENT_ID || '',
      },
    });

    if (!userResponse.ok) {
      logger.error(
        "[Twitch] Erreur lors de la récupération de l'utilisateur:",
        await userResponse.text()
      );
      return {
        isSubscribed: false,
        tier: null,
        subscriberSince: null,
      };
    }

    const userData = (await userResponse.json()) as TwitchUserResponse;
    if (!userData.data || userData.data.length === 0) {
      return {
        isSubscribed: false,
        tier: null,
        subscriberSince: null,
      };
    }

    const twitchUserId = userData.data[0].id;

    // Vérifier la subscription
    const subResponse = await fetch(
      `${TWITCH_API_BASE}/subscriptions/user?broadcaster_id=${broadcasterId}&user_id=${twitchUserId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Client-Id': process.env.TWITCH_CLIENT_ID || '',
        },
      }
    );

    if (!subResponse.ok) {
      // 404 signifie que l'utilisateur n'est pas abonné
      if (subResponse.status === 404) {
        return {
          isSubscribed: false,
          tier: null,
          subscriberSince: null,
        };
      }
      logger.error(
        '[Twitch] Erreur lors de la vérification de la subscription:',
        await subResponse.text()
      );
      return {
        isSubscribed: false,
        tier: null,
        subscriberSince: null,
      };
    }

    const subData = (await subResponse.json()) as TwitchSubscriptionResponse;
    if (!subData.data || subData.data.length === 0) {
      return {
        isSubscribed: false,
        tier: null,
        subscriberSince: null,
      };
    }

    const subscription = subData.data[0];
    const tier =
      subscription.tier === '1000'
        ? 1
        : subscription.tier === '2000'
          ? 2
          : subscription.tier === '3000'
            ? 3
            : null;

    return {
      isSubscribed: true,
      tier,
      subscriberSince: null, // L'API Twitch ne retourne pas cette info directement
    };
  } catch (error) {
    logger.error('[Twitch] Erreur lors de la vérification de la subscription:', error);
    return {
      isSubscribed: false,
      tier: null,
      subscriberSince: null,
    };
  }
}
