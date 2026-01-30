import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const licenseId = searchParams.get('id');
    const os = searchParams.get('os'); // 'mac' or 'windows'

    if (!licenseId || !os) {
      return new NextResponse('Missing parameters', { status: 400 });
    }

    // 1. Verify license
    const license = await prisma.license.findUnique({
      where: {
        id: licenseId,
        userId: session.user.id, // Ensure owner
      },
    });

    if (!license) {
      return new NextResponse('License not found', { status: 404 });
    }

    if (license.revoked) {
      return new NextResponse('License revoked', { status: 403 });
    }

    // 2. GitHub Integration
    const repo = process.env.GITHUB_PLUGIN_REPO || 'Jujulu67/LarianCrusher';
    const token = process.env.GITHUB_TOKEN;

    if (!token) {
      console.error('GITHUB_TOKEN not configured');
      return new NextResponse('Server configuration error', { status: 500 });
    }

    // Fetch latest release info from GitHub
    const releaseRes = await fetch(`https://api.github.com/repos/${repo}/releases/latest`, {
      headers: {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github.v3+json',
      },
      cache: 'no-store', // Disable cache to ensure we get the latest assets
    });

    if (!releaseRes.ok) {
      console.error('Failed to fetch latest release:', await releaseRes.text());
      return new NextResponse('Failed to fetch installers', { status: 502 });
    }

    const release = await releaseRes.json();

    // Find asset based on OS
    // Expecting filenames like: LarianCrusher-Mac.pkg, LarianCrusher-Win.exe, etc.
    const asset = release.assets.find((a: any) => {
      const name = a.name.toLowerCase();
      if (os === 'mac') {
        return name.endsWith('.pkg') || name.endsWith('.dmg') || name.includes('mac');
      }
      if (os === 'windows') {
        return name.endsWith('.exe') || name.endsWith('.msi') || name.includes('win');
      }
      return false;
    });

    if (!asset) {
      return new NextResponse(`No installer found for ${os}`, { status: 404 });
    }

    // 3. Stream the asset from GitHub
    // We use manual redirect handling to ensure the Authorization header
    // is NOT sent to the redirect destination (S3/Azure), which often causes 403s.
    let assetRes = await fetch(asset.url, {
      headers: {
        Authorization: `token ${token}`,
        Accept: 'application/octet-stream',
      },
      redirect: 'manual',
    });

    if (assetRes.status === 302) {
      const redirectUrl = assetRes.headers.get('location');
      if (redirectUrl) {
        assetRes = await fetch(redirectUrl); // Don't send Authorization to the redirect URL
      }
    }

    if (!assetRes.ok) {
      console.error(`Failed to download asset: ${assetRes.status} ${assetRes.statusText}`, {
        url: asset.url,
        assetName: asset.name,
      });
      return new NextResponse(`Failed to download asset from GitHub (${assetRes.status})`, {
        status: 502,
      });
    }

    // Return the stream with correct headers
    return new NextResponse(assetRes.body, {
      headers: {
        'Content-Type': asset.content_type || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${asset.name}"`,
        'Content-Length': asset.size.toString(),
      },
    });
  } catch (error) {
    console.error('[DOWNLOAD_ERROR]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}
