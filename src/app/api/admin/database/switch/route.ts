import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { spawn } from 'child_process';
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

      // Sauvegarder la DATABASE_URL actuelle si elle existe
      const currentDbUrlMatch = envContent.match(/^DATABASE_URL=(.*)$/m);
      if (
        currentDbUrlMatch &&
        !(await fs
          .access(envBackupPath)
          .then(() => true)
          .catch(() => false))
      ) {
        // Créer un backup si on n'en a pas déjà un
        await fs.writeFile(envBackupPath, `DATABASE_URL=${currentDbUrlMatch[1]}\n`, 'utf-8');
      }

      // Lire DATABASE_URL_PRODUCTION si elle existe
      const prodDbUrlMatch = envContent.match(/^DATABASE_URL_PRODUCTION=(.*)$/m);
      const prodDbUrl = prodDbUrlMatch
        ? prodDbUrlMatch[1].trim().replace(/^["']|["']$/g, '')
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
      } else {
        // Utiliser SQLite local
        const sqliteUrl = 'file:./prisma/dev.db';
        if (envContent.match(/^DATABASE_URL=/m)) {
          envContent = envContent.replace(/^DATABASE_URL=.*$/m, `DATABASE_URL=${sqliteUrl}`);
        } else {
          envContent += `\nDATABASE_URL=${sqliteUrl}\n`;
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
    } catch (error) {
      logger.error('Erreur lors de la régénération du client Prisma', error);
      // Ne pas bloquer si la régénération échoue, l'utilisateur pourra le faire manuellement
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
