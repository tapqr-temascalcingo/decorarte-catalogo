// Personas con acceso: compartir y quitar la hoja desde el panel, y lo que ve cada cuenta.
import { test, expect } from '@playwright/test';

const ROSA = 'tienda.rosa@gmail.com';

test('quien administra agrega a una persona: se le comparte la hoja y lo ve en pantalla', async ({ page }) => {
  await page.goto('/panel-local/');
  await page.click('[data-ir="ajustes"]');
  await page.fill('#a-contactoAdmin', 'Jesús, de Agencia Digital Temas, WhatsApp 712 334 4128');
  await page.click('[data-accion="agregar-fila"][data-lista="autorizados"]');
  await page.locator('input[data-lista="autorizados"]').last().fill(ROSA);
  await page.click('[data-accion="guardar-personas"]');
  await expect(page.locator('.resultado-accesos')).toContainText(`Se le compartió la hoja a ${ROSA}. Google le mandó un correo de aviso.`);
  expect(await page.evaluate((c) => __simulador.estado.editores.has(c), ROSA)).toBe(true);
  // y al quitarla
  await page.locator('input[data-lista="autorizados"]').last().evaluate((e) => e.closest('.fila-editable').querySelector('[data-accion="quitar-fila"]').click());
  await page.click('[data-accion="guardar-personas"]');
  await expect(page.locator('.resultado-accesos')).toContainText(`Se le quitó el acceso a ${ROSA}`);
  expect(await page.evaluate((c) => __simulador.estado.editores.has(c), ROSA)).toBe(false);
});

test('si no se puede compartir, lo dice en ese momento y no la deja en la lista', async ({ page }) => {
  await page.goto('/panel-local/');
  await page.click('[data-ir="ajustes"]');
  await page.click('[data-accion="agregar-fila"][data-lista="autorizados"]');
  await page.locator('input[data-lista="autorizados"]').last().fill('alguien@no-es-google.test');
  await page.click('[data-accion="guardar-personas"]');
  await expect(page.locator('#aviso.error')).toContainText('No se pudo compartir la hoja con alguien@no-es-google.test');
  await expect(page.locator('.resultado-accesos .mal')).toContainText('no parece ser una cuenta de Google');
  await expect(page.locator('input[data-lista="autorizados"]')).toHaveCount(1);
});

test('la dueña (no administra) ve la lista pero no la puede cambiar', async ({ page }) => {
  await page.goto(`/panel-local/?invitar=${ROSA}&usuario=${ROSA}`);
  await expect(page.locator('.item')).toHaveCount(9); // entra y trabaja normal
  await page.click('[data-ir="ajustes"]');
  await expect(page.locator('.lista-correos li')).toHaveText(['duena@gmail.com', ROSA]);
  await expect(page.locator('.aviso-fijo')).toContainText('Solo quien administra el catálogo puede agregar personas.');
  await expect(page.locator('.aviso-fijo')).toContainText('Jesús, de Agencia Digital Temas, WhatsApp 712 334 4128');
  await expect(page.locator('input[data-lista="autorizados"]')).toHaveCount(0);
  await expect(page.locator('[data-accion="guardar-personas"]')).toHaveCount(0);
  // Puede guardar sus ocasiones sin problema
  await page.locator('[data-accion="guardar-listas"]').first().click();
  await expect(page.locator('#aviso')).toContainText('guardado');
});

test('autorizada pero sin la hoja: mensaje sencillo con a quién avisar, sin error técnico', async ({ page }) => {
  await page.goto(`/panel-local/?invitar=${ROSA}&sinHoja=${ROSA}&usuario=${ROSA}`);
  await expect(page.locator('.vacio')).toContainText('Tu cuenta no tiene permiso para ver la hoja del catálogo. Avísale a Jesús, de Agencia Digital Temas, WhatsApp 712 334 4128.');
  const html = await page.evaluate(() => __gs.doGet({ parameter: {} }).getContent());
  expect(html).toContain('Ya casi puedes entrar');
  expect(html).toContain('Jesús, de Agencia Digital Temas, WhatsApp 712 334 4128');
  expect(html).not.toMatch(/Exception|línea \d+/);
});
