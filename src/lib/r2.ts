import { S3Client, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';

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

/**
 * Lister tous les fichiers dans R2
 */
export const listR2Files = async (): Promise<Array<{
  id: string;
  name: string;
  path: string;
  type: string;
  size: number;
  lastModified: string;
}>> => {
  if (!r2Client) {
    return [];
  }

  try {
    const command = new ListObjectsV2Command({
      Bucket: bucketName,
    });

    const response = await r2Client.send(command);
    const files = response.Contents || [];

    // Filtrer pour ne garder que les images
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const imageFiles = files.filter((file) => {
      if (!file.Key) return false;
      const ext = file.Key.toLowerCase().substring(file.Key.lastIndexOf('.'));
      return imageExtensions.includes(ext);
    });

    // Créer un objet pour chaque image avec des métadonnées
    return imageFiles.map((file) => {
      const filename = file.Key || '';
      
      // Déterminer le type d'image basé sur le nom du fichier
      let type = 'Autre';
      if (filename.includes('cover')) type = 'Couverture';
      else if (filename.includes('event')) type = 'Événement';
      else if (filename.includes('staff')) type = 'Staff';

      return {
        id: filename,
        name: filename,
        path: getR2PublicUrl(filename),
        type,
        size: file.Size || 0,
        lastModified: file.LastModified?.toISOString() || new Date().toISOString(),
      };
    });
  } catch (error) {
    console.error('Erreur lors de la liste des fichiers R2:', error);
    return [];
  }
};

