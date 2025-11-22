import fs from 'fs';
import path from 'path';

import { config } from 'dotenv';
import { defineConfig } from 'prisma/config';

// Charger .env.local en priorité (Next.js standard)
// Puis .env comme fallback
config({ path: path.resolve(process.cwd(), '.env.local') });
config({ path: path.resolve(process.cwd(), '.env') });

// Fonction pour obtenir la DATABASE_URL selon le switch (même logique que prisma.ts)
function getDatabaseUrl(): string {
  // En production, toujours utiliser la DATABASE_URL de l'environnement
  if (process.env.NODE_ENV === 'production') {
    return process.env.DATABASE_URL || '';
  }

  // En développement, vérifier le fichier de switch
  try {
    const switchPath = path.join(process.cwd(), '.db-switch.json');
    if (fs.existsSync(switchPath)) {
      const switchConfig = JSON.parse(fs.readFileSync(switchPath, 'utf-8'));
      if (switchConfig.useProduction && process.env.DATABASE_URL_PRODUCTION) {
        return process.env.DATABASE_URL_PRODUCTION;
      }
    }
  } catch (error) {
    // En cas d'erreur, utiliser la DATABASE_URL par défaut
  }

  // Par défaut, utiliser DATABASE_URL (qui pointe vers SQLite local en dev)
  return process.env.DATABASE_URL || 'file:./prisma/dev.db';
}

// Utiliser la fonction pour obtenir la bonne URL
const databaseUrl = getDatabaseUrl();

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: databaseUrl,
    // Si vous utilisez directUrl pour migrations:
    // directUrl: process.env.DIRECT_URL,
    // Si vous utilisez shadowDatabaseUrl:
    // shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL,
  },
});
