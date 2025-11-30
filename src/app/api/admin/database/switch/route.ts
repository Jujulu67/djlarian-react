import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';

import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/auth';
import { logger } from '@/lib/logger';

// Route pour basculer entre base locale et production
export async function POST(req: NextRequest): Promise<NextResponse> {
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

    // Mettre à jour migration_lock.toml pour correspondre au provider
    const migrationLockPath = path.join(
      process.cwd(),
      'prisma',
      'migrations',
      'migration_lock.toml'
    );
    try {
      if (
        await fs
          .access(migrationLockPath)
          .then(() => true)
          .catch(() => false)
      ) {
        let lockContent = await fs.readFile(migrationLockPath, 'utf-8');

        if (useProduction) {
          // Changer vers PostgreSQL
          lockContent = lockContent.replace(/provider\s*=\s*"sqlite"/, 'provider = "postgresql"');
        } else {
          // Changer vers SQLite
          lockContent = lockContent.replace(/provider\s*=\s*"postgresql"/, 'provider = "sqlite"');
        }

        await fs.writeFile(migrationLockPath, lockContent, 'utf-8');
        logger.info(
          `[DB SWITCH] migration_lock.toml mis à jour vers ${useProduction ? 'postgresql' : 'sqlite'}`
        );
      }
    } catch (error) {
      logger.warn('[DB SWITCH] Impossible de mettre à jour migration_lock.toml', error);
      // Ne pas bloquer, mais avertir
    }

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
          logger.info(
            '[DB SWITCH] BLOB_READ_WRITE_TOKEN configuré depuis BLOB_READ_WRITE_TOKEN_PRODUCTION'
          );
        } else {
          // Vérifier si BLOB_READ_WRITE_TOKEN existe déjà directement
          const existingBlobToken = envContent.match(/^BLOB_READ_WRITE_TOKEN=(.*)$/m);
          if (!existingBlobToken || !existingBlobToken[1].trim()) {
            logger.warn(
              '[DB SWITCH] ⚠️  BLOB_READ_WRITE_TOKEN_PRODUCTION non défini dans .env.local. ' +
                'Les images seront servies localement. ' +
                'Pour utiliser Vercel Blob en mode production, ajoutez BLOB_READ_WRITE_TOKEN_PRODUCTION dans .env.local'
            );
          } else {
            logger.info(
              '[DB SWITCH] BLOB_READ_WRITE_TOKEN existe déjà dans .env.local, conservé tel quel'
            );
          }
        }
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

    // Créer un fichier de marqueur pour indiquer qu'un redémarrage est nécessaire
    // Ce fichier sera lu par le script de redémarrage pour savoir quoi faire
    const restartMarkerPath = path.join(process.cwd(), '.db-restart-required.json');
    await fs.writeFile(
      restartMarkerPath,
      JSON.stringify(
        {
          timestamp: Date.now(),
          useProduction,
          requiresRestart: true,
          needsPrismaGenerate: true,
          needsCacheClean: true,
        },
        null,
        2
      ),
      'utf-8'
    );

    // Redémarrer automatiquement le serveur en arrière-plan
    // Le script de redémarrage s'occupera de :
    // 1. Arrêter le serveur
    // 2. Régénérer Prisma
    // 3. Nettoyer le cache
    // 4. Redémarrer le serveur
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

export async function GET(_req: NextRequest): Promise<NextResponse> {
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
