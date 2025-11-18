import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

// Configuration R2
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const bucketName = process.env.R2_BUCKET_NAME || 'djlarian-uploads';
const publicUrl = process.env.R2_PUBLIC_URL;

// Vérifier si R2 est configuré (pour la production)
const isR2Configured = !!(accountId && accessKeyId && secretAccessKey);

// Client R2 (seulement si configuré)
export const r2Client = isR2Configured
  ? new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    })
  : null;

export { bucketName, publicUrl, isR2Configured };

/**
 * Upload un fichier vers R2
 */
export const uploadToR2 = async (
  key: string,
  buffer: Buffer,
  contentType: string = 'image/jpeg'
): Promise<string> => {
  if (!r2Client) {
    throw new Error('R2 client not configured');
  }

  await r2Client.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );

  // Retourner l'URL publique
  if (publicUrl) {
    return `${publicUrl}/${key}`;
  }
  // Fallback sur l'URL publique R2 par défaut
  return `https://pub-${accountId}.r2.dev/${key}`;
};

/**
 * Supprimer un fichier de R2
 */
export const deleteFromR2 = async (key: string): Promise<void> => {
  if (!r2Client) {
    throw new Error('R2 client not configured');
  }

  await r2Client.send(
    new DeleteObjectCommand({
      Bucket: bucketName,
      Key: key,
    })
  );
};

/**
 * Obtenir l'URL publique d'un fichier R2
 */
export const getR2PublicUrl = (key: string): string => {
  if (publicUrl) {
    return `${publicUrl}/${key}`;
  }
  if (accountId) {
    return `https://pub-${accountId}.r2.dev/${key}`;
  }
  // Fallback local
  return `/uploads/${key}`;
};

