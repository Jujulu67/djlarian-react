import { NextResponse } from 'next/server';

import { getInstagramPosts } from '@/lib/services/instagram';

/**
 * Endpoint pour récupérer les posts Instagram
 * Cache: 1 heure (3600 secondes)
 */
export async function GET(): Promise<NextResponse> {
  try {
    // Si pas de credentials Instagram, retourner un tableau vide
    if (!process.env.INSTAGRAM_ACCESS_TOKEN || !process.env.INSTAGRAM_USER_ID) {
      return NextResponse.json(
        {
          posts: [],
          error: 'Instagram credentials not configured',
        },
        {
          status: 200, // 200 car c'est un fallback gracieux, pas une erreur
        }
      );
    }

    const posts = await getInstagramPosts(6);

    return NextResponse.json(
      {
        posts,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        },
      }
    );
  } catch (error) {
    console.error('Error fetching Instagram posts:', error);
    return NextResponse.json(
      {
        posts: [],
        error: 'Failed to fetch Instagram posts',
      },
      {
        status: 500,
      }
    );
  }
}
