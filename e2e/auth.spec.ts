import { expect, test, type Page } from '@playwright/test';

import { createTestUser, deleteTestUser, prisma, type TestUser } from './helpers/db';

/**
 * Parcours de connexion réels (navigateur), sur une base locale.
 * Ils couvrent des bugs passés : croix de la modale qui revenait à la page précédente,
 * renvoi à l'accueil après connexion, préférences effacées à la déconnexion.
 */

const openLoginModal = async (page: Page) => {
  await page.getByRole('button', { name: 'Connexion' }).first().click();
  await expect(page.getByRole('dialog')).toBeVisible();
};

const login = async (page: Page, user: TestUser) => {
  await openLoginModal(page);
  const dialog = page.getByRole('dialog');
  await dialog.locator('input[type="email"]').fill(user.email);
  await dialog.locator('input[type="password"]').fill(user.password);
  await dialog.locator('button[type="submit"]').click();
  await expect(page.getByRole('button', { name: 'Menu utilisateur' })).toBeVisible({
    timeout: 30000,
  });
};

test.describe('Visiteur', () => {
  test('la croix ferme la modale de connexion sans changer de page', async ({ page }) => {
    await page.goto('/');
    await page.goto('/music');
    await openLoginModal(page);
    await page.getByRole('button', { name: 'Fermer la modale' }).click();
    await expect(page.getByRole('dialog')).toBeHidden();
    await expect(page).toHaveURL(/\/music$/);
  });

  test('le bouton « Se connecter » du profil ouvre la modale du site', async ({ page }) => {
    await page.goto('/profile');
    await page.getByRole('button', { name: 'Se connecter' }).click();
    await expect(page.getByRole('dialog').locator('input[type="email"]')).toBeVisible();
    await expect(page).toHaveURL(/\/profile$/);
  });

  test('connexion refusée avec un mauvais mot de passe', async ({ request }) => {
    const response = await request.post('/api/auth/signin-credentials', {
      data: { email: 'personne@test.local', password: 'faux' },
    });
    expect(response.status()).toBe(401);
  });
});

test.describe('Compte connecté', () => {
  let user: TestUser | undefined;

  test.beforeEach(async () => {
    user = await createTestUser();
  });

  test.afterEach(async () => {
    await deleteTestUser(user);
  });

  test.afterAll(async () => {
    await prisma.$disconnect();
  });

  test('après connexion, on reste sur la page courante', async ({ page }) => {
    await page.goto('/music');
    await login(page, user!);
    await expect(page).toHaveURL(/\/music$/);
  });

  test('la déconnexion garde la préférence d’interface', async ({ page, context }) => {
    await page.goto('/music');
    await login(page, user!);
    const uiBefore = (await context.cookies()).find((c) => c.name === 'ui')?.value;

    await page.getByRole('button', { name: 'Menu utilisateur' }).click();
    await page.getByRole('button', { name: 'Déconnexion' }).click();

    // La déconnexion recharge l'accueil une fois les cookies supprimés
    await page.waitForURL((url) => url.pathname === '/', { timeout: 15000 });
    await expect(page.getByRole('button', { name: 'Connexion' }).first()).toBeVisible();
    const cookies = await context.cookies();
    expect(cookies.some((c) => c.name.includes('authjs.session-token'))).toBe(false);
    expect(cookies.find((c) => c.name === 'ui')?.value).toBe(uiBefore);
  });
});
