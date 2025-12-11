import { test, expect } from '@playwright/test';
import { config } from 'dotenv';
import { resolve } from 'path';
import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import betterSqlite3 from 'better-sqlite3';
import { hash } from '@/lib/bcrypt-edge';

// Charger les variables d'environnement depuis .env.local
config({ path: resolve(process.cwd(), '.env.local') });

// Créer un Prisma Client pour les tests E2E
const databaseUrl = process.env.DATABASE_URL || 'file:./prisma/dev.db';
const sqliteDb = betterSqlite3(databaseUrl.replace('file:', ''));
const adapter = new PrismaBetterSqlite3({ url: databaseUrl });
const prisma = new PrismaClient({ adapter });

// Variables globales pour le test
let testUserEmail: string;
let testUserPassword: string;
let testUserId: string;

/**
 * Smoke Test E2E pour le Login
 *
 * Ce test suit le pattern "Setup/Teardown" :
 * 1. BeforeAll : Crée un utilisateur de test dans la DB avec mot de passe hashé
 * 2. Test : Teste la connexion via l'API /api/auth/signin-credentials
 * 3. AfterAll : Supprime l'utilisateur de test pour laisser la base propre
 */
test.describe('Smoke Test - Authentication', () => {
  test.beforeAll(async () => {
    // Utiliser le Prisma Client configuré depuis @/lib/prisma
    // S'assurer que la base de données est accessible
    try {
      await prisma.$connect();
      console.log('✅ Connexion Prisma établie');
    } catch (error) {
      console.error('❌ Erreur de connexion Prisma:', error);
      throw error;
    }

    // Générer un email unique pour éviter les conflits
    const timestamp = Date.now();
    testUserEmail = `smoke-test-${timestamp}@test.com`;
    testUserPassword = 'TestPassword123!';

    try {
      // Hasher le mot de passe avec bcrypt (même méthode que l'application)
      const hashedPassword = await hash(testUserPassword, 10);

      // Créer l'utilisateur de test dans la base de données
      const user = await prisma.user.create({
        data: {
          email: testUserEmail,
          name: 'Smoke Test User',
          hashedPassword: hashedPassword,
          role: 'USER',
          emailVerified: null,
        },
      });

      testUserId = user.id;
      console.log(`✅ Utilisateur de test créé: ${testUserEmail} (ID: ${testUserId})`);
    } catch (error) {
      console.error("❌ Erreur lors de la création de l'utilisateur de test:", error);
      throw error;
    }
  });

  test.afterAll(async () => {
    // Nettoyer : Supprimer l'utilisateur de test
    try {
      if (testUserId) {
        await prisma.user.delete({
          where: { id: testUserId },
        });
        console.log(`✅ Utilisateur de test supprimé: ${testUserEmail}`);
      }
    } catch (error) {
      console.error("❌ Erreur lors de la suppression de l'utilisateur de test:", error);
      // Ne pas throw pour ne pas masquer d'autres erreurs
    } finally {
      // Fermer la connexion Prisma
      await prisma.$disconnect();
    }
  });

  test('should successfully login with valid credentials', async ({ request, baseURL }) => {
    // Test de l'API de connexion
    const url = `${baseURL}/api/auth/signin-credentials`;
    const response = await request.post(url, {
      data: {
        email: testUserEmail,
        password: testUserPassword,
      },
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Vérifier que la réponse est OK
    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);

    // Vérifier le contenu de la réponse
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.user).toBeDefined();
    expect(data.user.email).toBe(testUserEmail);
    expect(data.user.name).toBe('Smoke Test User');

    // Vérifier que le cookie de session est présent
    const setCookieHeader = response.headers()['set-cookie'];
    expect(setCookieHeader).toBeDefined();
    if (Array.isArray(setCookieHeader)) {
      expect(
        setCookieHeader.some((cookie) => cookie.includes('authjs.session-token'))
      ).toBeTruthy();
    } else if (typeof setCookieHeader === 'string') {
      expect(setCookieHeader).toContain('authjs.session-token');
    }
  });

  test('should reject invalid password', async ({ request, baseURL }) => {
    // Test avec un mot de passe incorrect
    const url = `${baseURL}/api/auth/signin-credentials`;
    const response = await request.post(url, {
      data: {
        email: testUserEmail,
        password: 'WrongPassword123!',
      },
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Vérifier que la réponse est une erreur 401
    expect(response.status()).toBe(401);

    const data = await response.json();
    expect(data.error).toBe('CredentialsSignin');
  });

  test('should reject invalid email', async ({ request, baseURL }) => {
    // Test avec un email inexistant
    const url = `${baseURL}/api/auth/signin-credentials`;
    const response = await request.post(url, {
      data: {
        email: 'nonexistent@test.com',
        password: testUserPassword,
      },
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Vérifier que la réponse est une erreur 401
    expect(response.status()).toBe(401);

    const data = await response.json();
    expect(data.error).toBe('CredentialsSignin');
  });
});
