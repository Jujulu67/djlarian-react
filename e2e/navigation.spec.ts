import { expect, test } from '@playwright/test';

/** Pages publiques : elles s'affichent sans erreur JavaScript. */
const PUBLIC_PAGES = ['/', '/music', '/events', '/gallery', '/contact', '/shop', '/games'];

for (const path of PUBLIC_PAGES) {
  test(`${path} s'affiche sans erreur JavaScript`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const response = await page.goto(path);
    expect(response?.status()).toBeLessThan(400);
    await expect(page.locator('main')).toBeVisible();
    expect(errors).toEqual([]);
  });
}

test('Échap ferme la carte du casino', async ({ page }) => {
  await page.goto('/casino');
  await expect(page.getByRole('dialog', { name: 'Carte du casino' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page).toHaveURL(/\/$/, { timeout: 10000 });
});

test('fermer la carte du casino renvoie un visiteur à l’accueil', async ({ page }) => {
  await page.goto('/casino');
  await page.getByRole('button', { name: 'Fermer la carte' }).click();
  await expect(page).toHaveURL(/\/$/, { timeout: 10000 });
});
