import { requireAuth } from '@/lib/api/requireAuth';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { NextResponse } from 'next/server';

type ReleaseAsset = {
  name: string;
  url: string;
  size: number;
  content_type?: string;
  browser_download_url: string;
};

type DownloadParams = {
  licenseId: string | null;
  email: string | null;
  licenseKey: string | null;
  os: string | null;
};

type LicenseAuth =
  | { error: NextResponse; license?: never }
  | { error?: never; license: { revoked: boolean } };

/** Paramètres de la requête ; un POST peut les remplacer par son corps JSON */
async function readParams(req: Request): Promise<DownloadParams> {
  const { searchParams } = new URL(req.url);

  const params: DownloadParams = {
    licenseId: searchParams.get('id'),
    email: searchParams.get('email'),
    licenseKey: searchParams.get('licenseKey'),
    os: searchParams.get('os'), // 'mac' or 'windows'
  };

  if (req.method === 'POST') {
    try {
      const body = await req.json();
      if (body.id) params.licenseId = body.id;
      if (body.email) params.email = body.email;
      if (body.licenseKey) params.licenseKey = body.licenseKey;
      if (body.os) params.os = body.os;
    } catch (e) {
      // Ignore JSON parse errors
    }
  }

  return params;
}

/** Vérifie la licence : email + clé (app desktop) ou session + id (interface web) */
async function authorizeLicense({
  licenseId,
  email,
  licenseKey,
}: Pick<DownloadParams, 'licenseId' | 'email' | 'licenseKey'>): Promise<LicenseAuth> {
  if (email && licenseKey) {
    // Auth via email + licenseKey (Desktop App flow)
    const license = await prisma.license.findUnique({
      where: {
        licenseKey: licenseKey,
      },
      include: {
        user: true,
      },
    });

    if (!license || license.user.email?.toLowerCase() !== email.toLowerCase()) {
      return { error: new NextResponse('Invalid email or license key', { status: 401 }) };
    }
    return { license };
  }

  if (licenseId) {
    // Auth via session + licenseId (Web UI flow)
    const { session, error: authError } = await requireAuth({
      onAnonymous: () => new NextResponse('Unauthorized', { status: 401 }),
    });
    if (authError) return { error: authError };

    const license = await prisma.license.findUnique({
      where: {
        id: licenseId,
        userId: session.user.id, // Ensure owner
      },
    });

    if (!license) {
      return { error: new NextResponse('License not found', { status: 404 }) };
    }
    return { license };
  }

  return { error: new NextResponse('Missing authentication parameters', { status: 400 }) };
}

/** Installeur correspondant à l'OS : .pkg/.dmg/mac ou .exe/.msi/win (hors « standalone ») */
function findInstallerAsset(assets: ReleaseAsset[], os: string) {
  const findByExtension = (extension: string) =>
    assets.find((a: ReleaseAsset) => a.name.toLowerCase().endsWith(extension));
  const findByKeyword = (keyword: string) =>
    assets.find((a: ReleaseAsset) => {
      const lowerName = a.name.toLowerCase();
      return lowerName.includes(keyword) && !lowerName.includes('standalone');
    });

  if (os === 'mac') {
    return findByExtension('.pkg') || findByExtension('.dmg') || findByKeyword('mac');
  }
  if (os === 'windows') {
    return findByExtension('.exe') || findByExtension('.msi') || findByKeyword('win');
  }
  return undefined;
}

/**
 * Récupère l'URL signée de l'asset GitHub.
 * Redirection manuelle : l'en-tête Authorization ne doit pas suivre la redirection (S3/Azure).
 */
async function fetchSignedAssetUrl(asset: ReleaseAsset, token: string): Promise<string | null> {
  const assetRes = await fetch(asset.url, {
    headers: {
      Authorization: `token ${token}`,
      Accept: 'application/octet-stream',
    },
    redirect: 'manual',
  });

  const downloadUrl = assetRes.status === 302 ? assetRes.headers.get('location') : null;
  if (!downloadUrl) {
    logger.error(
      `Failed to get redirect URL from GitHub: ${assetRes.status} ${assetRes.statusText}`
    );
  }
  return downloadUrl;
}

async function handleDownloadRequest(req: Request) {
  try {
    const { licenseId, email, licenseKey, os } = await readParams(req);

    if (!os) {
      return new NextResponse('Missing os parameter', { status: 400 });
    }

    // 1. Verify license
    const auth = await authorizeLicense({ licenseId, email, licenseKey });
    if (auth.error) return auth.error;

    if (auth.license.revoked) {
      return new NextResponse('License revoked', { status: 403 });
    }

    // 2. GitHub Integration
    const repo = process.env.GITHUB_PLUGIN_REPO || 'Jujulu67/LarianCrusher';
    const token = process.env.GITHUB_TOKEN;

    if (!token) {
      logger.error('GITHUB_TOKEN not configured');
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
      logger.error('Failed to fetch latest release:', await releaseRes.text());
      return new NextResponse('Failed to fetch installers', { status: 502 });
    }

    const release = await releaseRes.json();

    // Find asset based on OS
    // Expecting filenames like: LarianCrusher-Mac.pkg, LarianCrusher-Win.exe, etc.
    const assets: ReleaseAsset[] = release.assets || [];
    const asset = findInstallerAsset(assets, os);

    if (!asset) {
      return new NextResponse(`No installer found for ${os}`, { status: 404 });
    }

    // 3. Get the asset from GitHub
    // This allows us to capture the temporary signed URL generated by GitHub's Release API.
    const downloadUrl = await fetchSignedAssetUrl(asset, token);

    if (!downloadUrl) {
      return new NextResponse(`Failed to resolve installer URL from GitHub`, { status: 502 });
    }

    // If it's a POST request (specifically from the Desktop plugin),
    // it's cleaner and safer to just return the signed URL and let the native plugin download it,
    // saving Vercel execution bandwidth.
    if (req.method === 'POST') {
      return NextResponse.json(
        { downloadUrl },
        {
          headers: {
            'Cache-Control': 'no-store',
          },
        }
      );
    }

    // For GET request (Web UI), proxy the stream safely
    const finalAssetRes = await fetch(downloadUrl); // Don't send Authorization to the redirect URL

    if (!finalAssetRes.ok) {
      logger.error(
        `Failed to download asset: ${finalAssetRes.status} ${finalAssetRes.statusText}`,
        {
          url: downloadUrl,
          assetName: asset.name,
        }
      );
      return new NextResponse(`Failed to proxy asset from GitHub (${finalAssetRes.status})`, {
        status: 502,
      });
    }

    // Return the stream with correct headers
    return new NextResponse(finalAssetRes.body, {
      headers: {
        'Content-Type': asset.content_type || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${asset.name}"`,
        'Content-Length': asset.size.toString(),
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    logger.error('[DOWNLOAD_ERROR]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}

export async function GET(req: Request) {
  return handleDownloadRequest(req);
}

export async function POST(req: Request) {
  return handleDownloadRequest(req);
}
