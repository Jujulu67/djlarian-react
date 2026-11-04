import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

/** Les tests créent et suppriment des comptes : jamais ailleurs que sur une base locale. */
function localDatabaseUrl(): string {
  const url = process.env.DATABASE_URL ?? '';
  const host = (() => {
    try {
      return new URL(url).hostname;
    } catch {
      return '';
    }
  })();
  if (!['localhost', '127.0.0.1', '::1'].includes(host)) {
    throw new Error('Tests e2e : DATABASE_URL doit pointer vers une base PostgreSQL locale');
  }
  return url;
}

export const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: localDatabaseUrl() }),
});

export type TestUser = { id: string; email: string; password: string; name: string };

export async function createTestUser(): Promise<TestUser> {
  const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.local`;
  const password = 'E2eTestPassword123!';
  const name = 'E2E User';
  const user = await prisma.user.create({
    data: { email, name, role: 'USER', hashedPassword: await bcrypt.hash(password, 10) },
  });
  return { id: user.id, email, password, name };
}

export async function deleteTestUser(user: TestUser | undefined): Promise<void> {
  if (user) await prisma.user.delete({ where: { id: user.id } }).catch(() => {});
}
