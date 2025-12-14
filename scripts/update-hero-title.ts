import 'dotenv/config';
import { execSync } from 'child_process';
import { PrismaClient } from '@prisma/client';

async function main() {
  console.log('🔄 Checking database for heroTitle configuration...');

  try {
    const dbUrl = process.env.DATABASE_URL || 'file:./dev.db';
    console.log(`ℹ️ Using Database URL: ${dbUrl}`);

    // Strategy 1: Local SQLite (file: or sqlite:)
    // Use sqlite3 CLI to bypass Node ABI/adapter issues with better-sqlite3
    if (dbUrl.startsWith('file:') || dbUrl.startsWith('sqlite:')) {
      console.log('ℹ️ Local SQLite detected. Using sqlite3 CLI...');
      let dbPath = dbUrl.replace('file:', '').replace('sqlite:', '');

      // Handle Prisma convention: relative paths are relative to schema.prisma
      if (dbPath.startsWith('./')) {
        dbPath = dbPath.substring(2); // remove ./
      }

      // If running from root and db is dev.db, it's likely in prisma/dev.db
      // Check if we need to prefix with prisma/
      const fs = await import('fs');
      const path = await import('path');

      const potentialPaths = [
        path.join(process.cwd(), 'prisma', dbPath),
        path.join(process.cwd(), dbPath),
      ];

      let resolvedPath = '';
      for (const p of potentialPaths) {
        if (fs.existsSync(p)) {
          resolvedPath = p;
          break;
        }
      }

      if (!resolvedPath) {
        // Fallback to prisma/dev.db if we can't find it, assuming standard setup
        resolvedPath = path.join(process.cwd(), 'prisma', 'dev.db');
      }

      console.log(`ℹ️ Resolved DB Path: ${resolvedPath}`);

      try {
        // SQL to update if value is DJ LARIAN
        const sql = `UPDATE "SiteConfig" SET value = 'LARIAN' WHERE section = 'homepage' AND key = 'heroTitle' AND value = 'DJ LARIAN';`;
        // Execute sqlite3 <db> <sql>
        execSync(`sqlite3 "${resolvedPath}" "${sql}"`, { stdio: 'inherit' });
        console.log('✅ Checked/Updated heroTitle via sqlite3 CLI.');
      } catch (err) {
        // Table might not exist, which is OK - this is non-critical
        console.warn('⚠️ Failed to execute sqlite3 CLI. This is non-critical for the build.');
        // Don't log the error to avoid cluttering output
      }
      return;
    }

    // Strategy 2: Production PostgreSQL (postgres://)
    // Use Prisma with PG adapter
    if (dbUrl.startsWith('postgres://') || dbUrl.startsWith('postgresql://')) {
      console.log('ℹ️ Postgres detected. Using Prisma with pg adapter...');
      const { Pool } = await import('pg');
      const { PrismaPg } = await import('@prisma/adapter-pg');

      const pool = new Pool({ connectionString: dbUrl });
      const adapter = new PrismaPg(pool);
      const prisma = new PrismaClient({ adapter });

      try {
        const result = await prisma.siteConfig.updateMany({
          where: {
            section: 'homepage',
            key: 'heroTitle',
            value: 'DJ LARIAN',
          },
          data: {
            value: 'LARIAN',
          },
        });
        if (result.count > 0) {
          console.log(`✅ Updated heroTitle to LARIAN (modified ${result.count} rows).`);
        } else {
          console.log('✅ heroTitle is already correct or not found.');
        }
      } finally {
        await prisma.$disconnect();
      }
    }
  } catch (error) {
    console.warn('⚠️ Warning: Failed to update heroTitle. This is non-critical for the build.');
    console.warn('Error details:', error);
  }
}

main().catch((e) => {
  console.error('Unexpected error in update script:', e);
  // Still exit cleanly to not break build
  process.exit(0);
});
