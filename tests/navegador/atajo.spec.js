// Página del ícono del panel (/panel/) y su ayuda para iPhone con varias cuentas de Google.
import { test, expect } from '@playwright/test';

const PANEL = 'https://script.google.com/macros/s/AKfyEJEMPLO/exec';
const IPHONE_SAFARI = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';

test.beforeEach(async ({ page }) => {
  await page.route('**/js/config.js', (r) => r.fulfill({
    contentType: 'text/javascript',
    body: `export const CONFIG = { endpoint: '', panel: '${PANEL}', whatsappRespaldo: '' };`,
  }));
  await page.route('https://script.google.com/**', (r) => r.fulfill({ contentType: 'text/html', body: '<h1>Panel de Google</h1>' }));
});

test('en el navegador: instrucciones para instalar y ayuda plegada', async ({ page }) => {
  await page.goto('/panel/');
  await expect(page.locator('#instalar')).toBeVisible();
  await expect(page.locator('#ayuda')).toBeVisible();
  expect(await page.locator('#ayuda').evaluate((d) => d.open)).toBe(false);
  await expect(page.locator('#abrir')).toHaveAttribute('href', PANEL);
  await expect(page.locator('[data-cuenta]')).toHaveText(['Cuenta 1', 'Cuenta 2', 'Cuenta 3']);
  await expect(page.locator('[data-cuenta="1"]')).toHaveAttribute('href', 'https://script.google.com/macros/u/1/s/AKfyEJEMPLO/exec');
});

test('la ayuda recomienda primero un navegador solo con la cuenta del negocio', async ({ page }) => {
  await page.goto('/panel/?ayuda');
  expect(await page.locator('#ayuda').evaluate((d) => d.open)).toBe(true);
  const titulos = await page.locator('#ayuda h2').allTextContents();
  expect(titulos).toEqual(['Lo que mejor funciona', 'Otra cosa que puedes probar']);
  await expect(page.locator('#ayuda')).toContainText('solo para el catálogo');
  await expect(page.locator('#ayuda')).toContainText('A veces funcionan y a veces no');
});

test.describe('iPhone con Safari', () => {
  test.use({ userAgent: IPHONE_SAFARI });
  test('ofrece abrir la página en Chrome', async ({ page }) => {
    await page.goto('/panel/?ayuda');
    await expect(page.locator('#abrir-chrome')).toBeVisible();
    await expect(page.locator('#abrir-chrome')).toHaveAttribute('href', /^googlechromes:\/\/localhost:\d+\/panel\/$/);
  });
});

test('abierto desde el ícono entra directo, y si vuelve pronto muestra la ayuda en vez de reintentar', async ({ page }) => {
  await page.addInitScript(() => {
    const original = window.matchMedia.bind(window);
    window.matchMedia = (q) => (q.includes('standalone') ? { matches: true, media: q, addEventListener() {} } : original(q));
  });
  await page.goto('/panel/');
  await expect(page).toHaveURL(PANEL);
  await page.goto('/panel/'); // volvió en menos de 3 minutos: probablemente no pudo entrar
  await expect(page.locator('#estado')).toHaveText('¿No pudiste entrar? Revisa los pasos de abajo.');
  expect(await page.locator('#ayuda').evaluate((d) => d.open)).toBe(true);
  await expect(page).toHaveURL(/\/panel\/$/);
});
