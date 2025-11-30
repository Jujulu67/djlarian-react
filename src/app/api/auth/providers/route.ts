import { NextResponse } from 'next/server';

/**
 * GET /api/auth/providers
 * Retourne la liste des providers OAuth disponibles
 */
export async function GET() {
  const providers = {
    google: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    twitch: !!(process.env.TWITCH_CLIENT_ID && process.env.TWITCH_CLIENT_SECRET),
  };

  return NextResponse.json(providers);
}
