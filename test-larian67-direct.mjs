/**
 * Test simple : Combien de projets a Larian67 ?
 * Utilise directement Prisma avec les adaptateurs
 */

import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '.env.local') });

// Importer Prisma et les adaptateurs
import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaNeon } from '@prisma/adapter-neon';

// Fonction pour obtenir la DATABASE_URL
function getDatabaseUrl() {
  if (process.env.NODE_ENV === 'production') {
    return process.env.DATABASE_URL || '';
  }
  try {
    const switchPath = join(process.cwd(), '.db-switch.json');
    if (existsSync(switchPath)) {
      const switchConfig = JSON.parse(readFileSync(switchPath, 'utf-8'));
      if (switchConfig.useProduction && process.env.DATABASE_URL_PRODUCTION) {
        return process.env.DATABASE_URL_PRODUCTION;
      }
    }
  } catch (error) {
    // Ignorer
  }
  return process.env.DATABASE_URL || '';
}

// Fonction pour créer l'adaptateur
async function createAdapter(databaseUrl) {
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not defined');
  }

  if (databaseUrl.startsWith('file:')) {
    return new PrismaBetterSqlite3({
      url: databaseUrl,
    });
  } else if (databaseUrl.includes('neon.tech') || databaseUrl.includes('@ep-')) {
    const { Pool } = await import('@neondatabase/serverless');
    const pool = new Pool({ connectionString: databaseUrl });
    return new PrismaNeon(pool);
  } else {
    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: databaseUrl });
    return new PrismaPg(pool);
  }
}

async function test() {
  // Créer le client Prisma
  const databaseUrl = getDatabaseUrl();
  const adapter = await createAdapter(databaseUrl);
  const prisma = new PrismaClient({ adapter });

  try {
    console.log('🧪 Test: Combien de projets a Larian67 ?\n');

    // Chercher l'utilisateur Larian67
    const user = await prisma.user.findFirst({
      where: { name: 'Larian67' },
      select: { id: true, name: true, email: true },
    });

    if (!user) {
      console.log('❌ Utilisateur Larian67 non trouvé dans la base de données');
      console.log("\n💡 Vérifiez que l'utilisateur existe avec ce nom exact.");
      return;
    }

    console.log(`✅ Utilisateur trouvé: ${user.name} (ID: ${user.id})`);
    if (user.email) {
      console.log(`   Email: ${user.email}\n`);
    }

    // Compter les projets
    const projects = await prisma.project.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        name: true,
        progress: true,
        status: true,
        deadline: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    console.log(`📊 Réponse: Larian67 a ${projects.length} projet(s)\n`);

    if (projects.length > 0) {
      console.log('📝 Liste des projets:');
      projects.forEach((p, i) => {
        const progress = p.progress !== null ? `${p.progress}%` : 'N/A';
        const deadline = p.deadline ? new Date(p.deadline).toLocaleDateString('fr-FR') : 'Aucune';
        console.log(`  ${i + 1}. ${p.name}`);
        console.log(`     - Progression: ${progress}`);
        console.log(`     - Statut: ${p.status}`);
        console.log(`     - Deadline: ${deadline}`);
      });
    } else {
      console.log('   Aucun projet trouvé pour cet utilisateur.');
    }

    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    await prisma.$disconnect();
  }
}

test();
