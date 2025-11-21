import path from 'path';

import { config } from 'dotenv';
import { defineConfig } from 'prisma/config';

// Charger .env.local en priorité (Next.js standard)
// Puis .env comme fallback
config({ path: path.resolve(process.cwd(), '.env.local') });
config({ path: path.resolve(process.cwd(), '.env') });

// Utiliser process.env directement
const databaseUrl = process.env.DATABASE_URL || 'file:./prisma/dev.db';

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
