import { NextResponse } from 'next/server';

const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID;
const TWITCH_CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET;
const TWITCH_CHANNEL = 'larianmusic';

interface TwitchStreamData {
  id: string;
  user_id: string;
  user_login: string;
  user_name: string;
  game_id: string;
  game_name: string;
  type: string;
  title: string;
  viewer_count: number;
  started_at: string;
  language: string;
  thumbnail_url: string;
  tag_ids: string[];
  is_mature: boolean;
}

interface TwitchAPIResponse {
  data: TwitchStreamData[];
}

/**
 * Vérifie si le stream Twitch est en ligne
 */
export async function GET(): Promise<NextResponse> {
  try {
    // Si pas de credentials Twitch, retourner offline par défaut
    if (!TWITCH_CLIENT_ID || !TWITCH_CLIENT_SECRET) {
      return NextResponse.json({
        isLive: false,
        error: 'Twitch credentials not configured',
      });
    }

    // Obtenir un token d'accès Twitch
    const tokenResponse = await fetch('https://id.twitch.tv/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: TWITCH_CLIENT_ID,
        client_secret: TWITCH_CLIENT_SECRET,
        grant_type: 'client_credentials',
      }),
    });

    if (!tokenResponse.ok) {
      console.error('Failed to get Twitch token:', tokenResponse.statusText);
      return NextResponse.json({
        isLive: false,
        error: 'Failed to authenticate with Twitch',
      });
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Vérifier le statut du stream
    const streamResponse = await fetch(
      `https://api.twitch.tv/helix/streams?user_login=${TWITCH_CHANNEL}`,
      {
        headers: {
          'Client-ID': TWITCH_CLIENT_ID,
          Authorization: `Bearer ${accessToken}`,
        },
        next: { revalidate: 60 }, // Cache pour 60 secondes
      }
    );

    if (!streamResponse.ok) {
      console.error('Failed to get stream status:', streamResponse.statusText);
      return NextResponse.json({
        isLive: false,
        error: 'Failed to fetch stream status',
      });
    }

    const streamData: TwitchAPIResponse = await streamResponse.json();
    const isLive = streamData.data && streamData.data.length > 0;

    return NextResponse.json({
      isLive,
      stream: isLive ? streamData.data[0] : null,
    });
  } catch (error) {
    console.error('Error checking Twitch status:', error);
    return NextResponse.json({
      isLive: false,
      error: 'Internal server error',
    });
  }
}
