// Genera las capturas de docs/capturas/ que usa MANUAL.md:  npm run capturas
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const DIR = 'docs/capturas/';
const guardar = (objetivo, nombre, extra = {}) =>
  objetivo.screenshot({ path: DIR + nombre + '.jpg', type: 'jpeg', quality: 78, ...extra });

test.describe.configure({ mode: 'serial' });

/** Convierte una ilustración de la demo en una "foto" PNG, como si viniera de la galería. */
async function fotoBonita(page, svg) {
  const texto = readFileSync(new URL(`../../img/demo/${svg}`, import.meta.url), 'utf8');
  const b64 = await page.evaluate(async (s) => {
    const img = new Image();
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s);
    await img.decode();
    const c = document.createElement('canvas');
    c.width = 2400; c.height = 2400;
    c.getContext('2d').drawImage(img, 0, 0, 2400, 2400);
    return c.toDataURL('image/png').split(',')[1];
  }, texto);
  return Buffer.from(b64, 'base64');
}

async function sinConfeti(page) {
  await page.addStyleTag({ content: '.confeti{display:none!important}' });
}

test('catálogo', async ({ page }) => {
  await page.goto('./');
  await sinConfeti(page);
  await expect(page.locator('#lista .tarjeta')).toHaveCount(8);
  await page.waitForTimeout(700);
  await guardar(page, '01-catalogo-portada');

  await page.locator('#lista').scrollIntoViewIfNeeded();
  await page.evaluate(() => window.scrollTo(0, document.getElementById('titulo-lista').offsetTop - 205));
  await page.waitForTimeout(400);
  await guardar(page, '02-catalogo-tarjetas');

  await page.locator('#lista .tarjeta-foto').first().click();
  await page.waitForTimeout(500);
  await guardar(page, '03-catalogo-detalle');
  await page.goBack();

  await page.locator('.pestana', { hasText: 'Servicios' }).click();
  await page.evaluate(() => window.scrollTo(0, document.querySelector('.servicio-nombre').offsetTop - 120));
  await page.waitForTimeout(400);
  await guardar(page, '04-catalogo-servicios');
});

test('panel', async ({ page }) => {
  // Las fotos subidas al Drive simulado se sirven desde la memoria del simulador
  await page.route('https://lh3.googleusercontent.com/d/**', async (route) => {
    const id = route.request().url().split('/d/')[1].split('=')[0];
    const b64 = await page.evaluate((i) => {
      const a = __simulador.archivos[i];
      if (!a) return null;
      let s = '';
      for (let j = 0; j < a.bytes.length; j += 0x8000) s += String.fromCharCode.apply(null, a.bytes.slice(j, j + 0x8000));
      return btoa(s);
    }, id).catch(() => null);
    return b64 ? route.fulfill({ contentType: 'image/jpeg', body: Buffer.from(b64, 'base64') }) : route.fulfill({ status: 404 });
  });

  await page.goto('/panel-local/?demora=0');
  await expect(page.locator('.item')).toHaveCount(9);
  await page.waitForTimeout(500);
  await guardar(page, '10-panel-productos');
  await guardar(page.locator('.item').nth(3), '11-panel-tarjeta');

  // Nuevo producto con foto
  await page.click('[data-accion="nuevo-producto"]');
  await page.setInputFiles('#foto-galeria', { name: 'IMG_2041.png', mimeType: 'image/png', buffer: await fotoBonita(page, 'rosas.svg') });
  await expect(page.locator('.foto-estado')).toContainText('1200×1200');
  await page.fill('#f-nombre', 'Caja de rosas rojas');
  await page.fill('#f-descripcion', 'Doce rosas naturales en caja redonda con moño dorado.');
  await page.evaluate(() => window.scrollTo(0, 0));
  await guardar(page, '12-panel-nuevo-foto');

  await page.click('[data-ocasion="san-valentin"]');
  await page.click('[data-ocasion="aniversario"]');
  await page.click('[data-tipo-precio="fijo"]');
  await page.fill('#f-precio', '890');
  await page.locator('#f-descripcion').blur();
  await page.evaluate(() => window.scrollTo(0, document.querySelector('.chips').getBoundingClientRect().top + scrollY - 120));
  await page.waitForTimeout(300);
  await guardar(page, '13-panel-ocasiones-precio');

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(300);
  await guardar(page, '14-panel-visible-destacado');

  await page.click('[data-accion="guardar-producto"]');
  await expect(page.locator('#aviso')).toBeVisible();
  await page.waitForTimeout(300);
  await guardar(page, '15-panel-guardado');

  // Confirmación al eliminar
  await page.waitForTimeout(2800);
  await page.locator('.item', { hasText: 'Kit para papá' }).locator('.item-principal').click();
  await page.click('[data-accion="eliminar-producto"]');
  await guardar(page, '16-panel-eliminar');
  await page.click('#confirmar-no');
  await page.click('[data-accion="volver"]');

  await page.click('[data-ir="paquetes"]');
  await page.waitForTimeout(300);
  await guardar(page, '17-panel-paquetes');
  await page.locator('[data-accion="editar-paquete"]').nth(1).click();
  await page.waitForTimeout(300);
  await guardar(page, '18-panel-paquete-editar');
  await page.click('[data-accion="volver"]');

  await page.click('[data-ir="ajustes"]');
  await page.waitForTimeout(300);
  await guardar(page, '19-panel-ajustes-contacto');
  await page.evaluate(() => window.scrollTo(0, document.getElementById('a-temporada').getBoundingClientRect().top + scrollY - 200));
  await page.waitForTimeout(300);
  await guardar(page, '20-panel-ajustes-temporada');
  await page.evaluate(() => {
    const h = [...document.querySelectorAll('h2')].find((x) => x.textContent.includes('Ocasiones'));
    window.scrollTo(0, h.getBoundingClientRect().top + scrollY - 80);
  });
  await page.waitForTimeout(300);
  await guardar(page, '21-panel-ajustes-ocasiones');
});

test('acceso directo y página de sin acceso', async ({ page }) => {
  await page.route('**/js/config.js', (r) => r.fulfill({
    contentType: 'text/javascript',
    body: "export const CONFIG = { endpoint: '', panel: 'https://script.google.com/macros/s/EJEMPLO/exec', whatsappRespaldo: '' };",
  }));
  await page.goto('/panel/');
  await expect(page.locator('#instalar')).toBeVisible();
  await page.waitForTimeout(400);
  await guardar(page, '22-acceso-directo');

  await page.goto('/panel-local/?usuario=otra.persona@gmail.com');
  const html = await page.evaluate(() => doGet({ parameter: {} }).getContent());
  await page.setContent(html.replace(/https:\/\/tapqr-temascalcingo\.github\.io\/decorarte-catalogo\//g, 'http://localhost:8090/'));
  await page.waitForTimeout(600);
  await guardar(page, '23-sin-acceso');
});
