import { exec } from 'child_process';
import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { promisify } from 'util';

import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/auth';
import { logger } from '@/lib/logger';

const execAsync = promisify(exec);

// Route pour basculer entre base locale et production
export async function POST(req: NextRequest) {
  try {
    // Vérifier l'authentification
    const session = await auth();
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { useProduction } = await req.json();

    // Vérifier que nous sommes en développement
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: "Le switch de base de données n'est pas disponible en production" },
        { status: 403 }
      );
    }

    // Chemin vers les fichiers
    const configPath = path.join(process.cwd(), '.db-switch.json');
    const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma');
    const envLocalPath = path.join(process.cwd(), '.env.local');
    const envBackupPath = path.join(process.cwd(), '.env.local.backup');

    // Lire le schéma actuel
    let schemaContent = await fs.readFile(schemaPath, 'utf-8');

    // Modifier le provider selon le switch
    if (useProduction) {
      // Changer vers PostgreSQL
      schemaContent = schemaContent.replace(/provider\s*=\s*"sqlite"/, 'provider = "postgresql"');
    } else {
      // Changer vers SQLite
      schemaContent = schemaContent.replace(/provider\s*=\s*"postgresql"/, 'provider = "sqlite"');
    }

    // Sauvegarder le schéma modifié
    await fs.writeFile(schemaPath, schemaContent, 'utf-8');

    // Mettre à jour DATABASE_URL dans .env.local
    try {
      let envContent = '';
      if (
        await fs
          .access(envLocalPath)
          .then(() => true)
          .catch(() => false)
      ) {
        envContent = await fs.readFile(envLocalPath, 'utf-8');
      }

      // Sauvegarder la DATABASE_URL et BLOB_READ_WRITE_TOKEN actuels si elles existent
      const currentDbUrlMatch = envContent.match(/^DATABASE_URL=(.*)$/m);
      const currentBlobTokenMatch = envContent.match(/^BLOB_READ_WRITE_TOKEN=(.*)$/m);
      if (
        (currentDbUrlMatch || currentBlobTokenMatch) &&
        !(await fs
          .access(envBackupPath)
          .then(() => true)
          .catch(() => false))
      ) {
        // Créer un backup si on n'en a pas déjà un
        let backupContent = '';
        if (currentDbUrlMatch) {
          backupContent += `DATABASE_URL=${currentDbUrlMatch[1]}\n`;
        }
        if (currentBlobTokenMatch) {
          backupContent += `BLOB_READ_WRITE_TOKEN=${currentBlobTokenMatch[1]}\n`;
        }
        if (backupContent) {
          await fs.writeFile(envBackupPath, backupContent, 'utf-8');
        }
      }

      // Lire DATABASE_URL_PRODUCTION si elle existe
      const prodDbUrlMatch = envContent.match(/^DATABASE_URL_PRODUCTION=(.*)$/m);
      const prodDbUrl = prodDbUrlMatch
        ? prodDbUrlMatch[1].trim().replace(/^["']|["']$/g, '')
        : null;

      // Lire BLOB_READ_WRITE_TOKEN_PRODUCTION si elle existe
      const prodBlobTokenMatch = envContent.match(/^BLOB_READ_WRITE_TOKEN_PRODUCTION=(.*)$/m);
      const prodBlobToken = prodBlobTokenMatch
        ? prodBlobTokenMatch[1].trim().replace(/^["']|["']$/g, '')
        : null;

      if (useProduction) {
        // Utiliser DATABASE_URL_PRODUCTION ou demander à l'utilisateur
        if (prodDbUrl) {
          // Remplacer ou ajouter DATABASE_URL
          if (envContent.match(/^DATABASE_URL=/m)) {
            envContent = envContent.replace(/^DATABASE_URL=.*$/m, `DATABASE_URL=${prodDbUrl}`);
          } else {
            envContent += `\nDATABASE_URL=${prodDbUrl}\n`;
          }
        } else {
          throw new Error("DATABASE_URL_PRODUCTION n'est pas définie dans .env.local");
        }

        // Utiliser BLOB_READ_WRITE_TOKEN_PRODUCTION si disponible
        if (prodBlobToken) {
          // Remplacer ou ajouter BLOB_READ_WRITE_TOKEN
          if (envContent.match(/^BLOB_READ_WRITE_TOKEN=/m)) {
            envContent = envContent.replace(
              /^BLOB_READ_WRITE_TOKEN=.*$/m,
              `BLOB_READ_WRITE_TOKEN=${prodBlobToken}`
            );
          } else {
            envContent += `\nBLOB_READ_WRITE_TOKEN=${prodBlobToken}\n`;
          }
        }
        // Note: Si BLOB_READ_WRITE_TOKEN_PRODUCTION n'est pas défini, on garde BLOB_READ_WRITE_TOKEN tel quel
        // (peut être défini directement dans .env.local pour le dev local)
      } else {
        // Utiliser SQLite local
        const sqliteUrl = 'file:./prisma/dev.db';
        if (envContent.match(/^DATABASE_URL=/m)) {
          envContent = envContent.replace(/^DATABASE_URL=.*$/m, `DATABASE_URL=${sqliteUrl}`);
        } else {
          envContent += `\nDATABASE_URL=${sqliteUrl}\n`;
        }

        // Restaurer BLOB_READ_WRITE_TOKEN depuis le backup si disponible
        try {
          const backupContent = await fs.readFile(envBackupPath, 'utf-8');
          const backupBlobTokenMatch = backupContent.match(/^BLOB_READ_WRITE_TOKEN=(.*)$/m);
          if (backupBlobTokenMatch) {
            const backupBlobToken = backupBlobTokenMatch[1].trim().replace(/^["']|["']$/g, '');
            if (envContent.match(/^BLOB_READ_WRITE_TOKEN=/m)) {
              envContent = envContent.replace(
                /^BLOB_READ_WRITE_TOKEN=.*$/m,
                `BLOB_READ_WRITE_TOKEN=${backupBlobToken}`
              );
            } else {
              envContent += `\nBLOB_READ_WRITE_TOKEN=${backupBlobToken}\n`;
            }
          }
        } catch {
          // Pas de backup ou erreur, on laisse BLOB_READ_WRITE_TOKEN tel quel
          // (l'utilisateur peut avoir un token local ou pas)
        }
      }

      await fs.writeFile(envLocalPath, envContent, 'utf-8');
    } catch (error) {
      logger.error('Erreur lors de la mise à jour de .env.local', error);
      // Ne pas bloquer, mais avertir l'utilisateur
    }

    // Sauvegarder la préférence
    await fs.writeFile(
      configPath,
      JSON.stringify({ useProduction: Boolean(useProduction) }, null, 2),
      'utf-8'
    );

    // Régénérer le client Prisma
    try {
      await execAsync('npx prisma generate', { cwd: process.cwd() });
      logger.debug('Client Prisma régénéré avec succès');
    } catch (error) {
      logger.error('Erreur lors de la régénération du client Prisma', error);
      // Ne pas bloquer si la régénération échoue, l'utilisateur pourra le faire manuellement
    }

    // Nettoyer le cache Next.js pour forcer la recompilation avec le nouveau client Prisma
    try {
      const nextCachePath = path.join(process.cwd(), '.next');
      const { access } = await import('fs/promises');
      try {
        await access(nextCachePath);
        // Le cache existe, on le supprime
        const { rm } = await import('fs/promises');
        await rm(nextCachePath, { recursive: true, force: true });
        logger.debug('Cache Next.js nettoyé pour forcer la recompilation');
      } catch {
        // Le cache n'existe pas, c'est OK
        logger.debug('Aucun cache Next.js à nettoyer');
      }
    } catch (error) {
      logger.warn('Erreur lors du nettoyage du cache Next.js (non bloquant)', error);
      // Ne pas bloquer, le redémarrage du serveur devrait suffire
    }

    // Créer un fichier de marqueur pour indiquer qu'un redémarrage est nécessaire
    const restartMarkerPath = path.join(process.cwd(), '.db-restart-required.json');
    await fs.writeFile(
      restartMarkerPath,
      JSON.stringify(
        {
          timestamp: Date.now(),
          useProduction,
          requiresRestart: true,
        },
        null,
        2
      ),
      'utf-8'
    );

    // Redémarrer automatiquement le serveur en arrière-plan
    // Utiliser spawn avec detached pour que le script s'exécute indépendamment
    try {
      const restartScriptPath = path.join(process.cwd(), 'scripts', 'restart-dev-server.sh');

      // Lancer le script complètement détaché pour qu'il puisse tuer le processus parent
      // Le script attendra 2 secondes avant de tuer le processus pour que l'API puisse répondre
      const child = spawn('bash', [restartScriptPath], {
        cwd: process.cwd(),
        detached: true,
        stdio: 'ignore',
      });

      // Ne pas attendre le processus enfant
      child.unref();
    } catch (error) {
      logger.error('Erreur lors du lancement du script de redémarrage', error);
      // Ne pas bloquer, l'utilisateur pourra redémarrer manuellement
    }

    return NextResponse.json({
      success: true,
      message: useProduction
        ? 'Base de données de production activée. Le serveur redémarre automatiquement...'
        : 'Base de données locale activée. Le serveur redémarre automatiquement...',
      useProduction,
      requiresRestart: true,
      restarting: true,
    });
  } catch (error) {
    logger.error('Erreur lors du switch de base de données', error);
    return NextResponse.json(
      { error: 'Erreur lors du changement de base de données' },
      { status: 500 }
    );
  }
}

// Route pour récupérer l'état actuel
export async function GET(req: NextRequest) {
  try {
    // Vérifier l'authentification
    const session = await auth();
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    // Vérifier que nous sommes en développement
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ useProduction: true, locked: true });
    }

    // Lire le fichier de config
    const configPath = path.join(process.cwd(), '.db-switch.json');
    try {
      const configContent = await fs.readFile(configPath, 'utf-8');
      const config = JSON.parse(configContent);
      return NextResponse.json({ useProduction: Boolean(config.useProduction), locked: false });
    } catch {
      // Fichier n'existe pas, utiliser la valeur par défaut (local)
      return NextResponse.json({ useProduction: false, locked: false });
    }
  } catch (error) {
    logger.error("Erreur lors de la récupération de l'état", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération de l'état" },
      { status: 500 }
    );
  }
}
