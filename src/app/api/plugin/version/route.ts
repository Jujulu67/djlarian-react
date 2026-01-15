import { NextResponse } from 'next/server';

/**
 * GET /api/plugin/version
 * Returns the latest version of LarianCrusher from GitHub releases
 * This is a public endpoint (no auth required)
 */
export async function GET() {
  try {
    const repo = process.env.GITHUB_PLUGIN_REPO || 'Jujulu67/LarianCrusher';
    const token = process.env.GITHUB_TOKEN;

    if (!token) {
      // Return a fallback version if no token
      return NextResponse.json({ version: 'v1.0.0', error: 'Token not configured' });
    }

    const releaseRes = await fetch(`https://api.github.com/repos/${repo}/releases/latest`, {
      headers: {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github.v3+json',
      },
      next: { revalidate: 3600 }, // Cache for 1 hour
    });

    if (!releaseRes.ok) {
      return NextResponse.json({ version: 'v1.0.0', error: 'Failed to fetch' });
    }

    const release = await releaseRes.json();

    return NextResponse.json({
      version: release.tag_name || release.name || 'v1.0.0',
      name: release.name,
      publishedAt: release.published_at,
      url: release.html_url,
    });
  } catch (error) {
    console.error('[PLUGIN_VERSION_ERROR]', error);
    return NextResponse.json({ version: 'v1.0.0', error: 'Internal error' });
  }
}
