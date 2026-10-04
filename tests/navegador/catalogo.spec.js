import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const DEMO = JSON.parse(readFileSync(new URL('../../datos/demo.json', import.meta.url), 'utf8'));
const ENDPOINT = 'https://script.google.com/macros/s/PRUEBA/exec';

const tarjetas = (page) => page.locator('#lista .tarjeta');

// Las pruebas no dependen de js/config.js real: por defecto, sin endpoint (modo demostración).
// Las que prueban la conexión con Apps Script registran su propia configuración después, y esa gana.
test.beforeEach(async ({ page }) => {
  await page.route('**/js/config.js', (r) => r.fulfill({
    contentType: 'text/javascript',
    body: "export const CONFIG = { endpoint: '', panel: '', whatsappRespaldo: '527122319080' };",
  }));
});

function leerWhatsApp(href) {
  const url = new URL(href);
  return { telefono: url.searchParams.get('phone'), texto: url.searchParams.get('text') };
}

test.describe('modo demostración', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('./');
    await expect(tarjetas(page)).toHaveCount(8);
  });

  test('portada: aviso de demo, categorías, ocasiones y temporada', async ({ page }) => {
    await expect(page.locator('#aviso-demo')).toBeVisible();
    await expect(page.locator('.pestana')).toHaveText(['Regalos', 'Servicios']);
    await expect(page.locator('.pestana[aria-selected="true"]')).toHaveText('Regalos');
    await expect(page.locator('.chip')).toHaveCount(7); // Todas + 6 ocasiones
    await expect(page.locator('#temporada-titulo')).toHaveText('Especial de San Valentín');
    await expect(page.locator('#temporada-lista .tarjeta')).toHaveCount(3);
    await expect(page.locator('.tarjeta .precio').filter({ hasText: 'Pregunta por precio' })).toHaveCount(1);
    await expect(page.locator('.tarjeta .precio').filter({ hasText: 'Desde $450' }).first()).toBeVisible();
  });

  test('filtrar por ocasión: un producto aparece en varias', async ({ page }) => {
    await page.locator('.chip', { hasText: 'Baby shower' }).click();
    await expect(tarjetas(page)).toHaveCount(2);
    await expect(page.locator('#temporada')).toBeHidden();
    await expect(page).toHaveURL(/ocasion=baby-shower/);
    await page.locator('.chip', { hasText: 'Día del Padre' }).click();
    await expect(tarjetas(page).locator('.tarjeta-nombre')).toHaveText(['Desayuno sorpresa', 'Kit para papá']);
    await page.locator('.chip', { hasText: 'Todas' }).click();
    await expect(tarjetas(page)).toHaveCount(8);
  });

  test('"Lo quiero" abre WhatsApp con el mensaje listo', async ({ page }) => {
    const href = await tarjetas(page).first().locator('.boton-wa').getAttribute('href');
    const wa = leerWhatsApp(href);
    expect(wa.telefono).toBe('527122319080');
    expect(wa.texto).toBe('¡Hola Decorarte! Lo quiero: *Caja de rosas eternas* ($650). ¿Está disponible? Lo vi en su catálogo.');
    await expect(tarjetas(page).first().locator('.boton-wa')).toHaveAttribute('target', '_blank');
  });

  test('servicios con paquetes y botón Cotizar', async ({ page }) => {
    await page.locator('.pestana', { hasText: 'Servicios' }).click();
    await expect(page.locator('.servicio')).toHaveCount(1);
    await expect(page.locator('.paquete')).toHaveCount(3);
    await expect(page.locator('.paquete-nombre')).toHaveText(['Mini', 'Fiesta', 'Gran evento']);
    await expect(page.locator('.paquete .precio')).toHaveText(['$1,200', '$2,600', 'Desde $4,800']);
    const wa = leerWhatsApp(await page.locator('.paquete', { hasText: 'Fiesta' }).locator('a').getAttribute('href'));
    expect(wa.texto).toContain('*Mesa de charcutería*, paquete *Fiesta* ($2,600)');
    await expect(page).toHaveURL(/cat=servicios/);
  });

  test('buscador sin acentos y mensaje cuando no hay resultados', async ({ page }) => {
    await page.fill('#buscar', 'panales');
    await expect(tarjetas(page)).toHaveCount(1);
    await expect(page.locator('#titulo-lista')).toContainText('Resultados');
    await page.fill('#buscar', 'personas');
    await expect(page.locator('.servicio')).toHaveCount(1); // busca también en servicios y paquetes
    await page.fill('#buscar', 'unicornio');
    await expect(page.locator('#vacio')).toBeVisible();
    const wa = leerWhatsApp(await page.locator('#vacio-wa').getAttribute('href'));
    expect(wa.texto).toContain('Estoy buscando: unicornio');
    await page.click('#limpiar-busqueda');
    await expect(tarjetas(page)).toHaveCount(8);
  });

  test('producto sin foto muestra el logo', async ({ page }) => {
    const img = tarjetas(page).filter({ hasText: 'Marco con foto' }).locator('img');
    await expect(img).toHaveClass(/sin-foto/);
    await expect(img).toHaveAttribute('src', /logo/);
  });

  test('detalle del producto y botón atrás', async ({ page }) => {
    await tarjetas(page).nth(2).locator('.tarjeta-foto').click();
    const dialogo = page.locator('#detalle');
    await expect(dialogo).toBeVisible();
    await expect(dialogo.locator('h2')).toHaveText('Oso con chocolates');
    await expect(dialogo.locator('.etiquetas li')).toHaveCount(2);
    await expect(page).toHaveURL(/#p3$/);
    await page.goBack();
    await expect(dialogo).toBeHidden();
  });

  test('pie con redes y ubicación', async ({ page }) => {
    await expect(page.locator('.pie .red')).toHaveText(['WhatsApp', 'Instagram', 'Facebook', 'Déjanos tu reseña']);
    await expect(page.locator('#pie-direccion')).toHaveText('Temascalcingo, Estado de México');
    await expect(page.locator('#wa-flotante')).toHaveAttribute('href', /phone=527122319080/);
  });
});

test('si una foto no carga, se ve el logo', async ({ page }) => {
  await page.route('**/img/demo/oso.svg', (r) => r.fulfill({ status: 404 }));
  await page.goto('./');
  const img = tarjetas(page).filter({ hasText: 'Oso con chocolates' }).locator('img');
  await expect(img).toHaveClass(/sin-foto/);
  await expect(img).toHaveAttribute('src', /logo/);
});

test('?demo muestra la demostración aunque haya endpoint', async ({ page }) => {
  await page.route('**/js/config.js', (r) => r.fulfill({ contentType: 'text/javascript', body: `export const CONFIG = { endpoint: '${ENDPOINT}', whatsappRespaldo: '527122319080' };` }));
  await page.goto('./?demo');
  await expect(tarjetas(page)).toHaveCount(8);
  await expect(page.locator('#aviso-demo')).toBeVisible();
});

test.describe('conectado a Apps Script', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/js/config.js', (r) => r.fulfill({
      contentType: 'text/javascript',
      body: `export const CONFIG = { endpoint: '${ENDPOINT}', whatsappRespaldo: '527122319080' };`,
    }));
  });

  test('pide ?api, usa los datos reales y servicios con su propio WhatsApp', async ({ page }) => {
    const reales = structuredClone(DEMO);
    delete reales.demo;
    reales.config.whatsappServicios = '527129998877';
    reales.config.temporada = 'dia-del-padre';
    reales.config.temporadaTitulo = '';
    reales.productos[0].disponible = false; // la API ya filtra, pero el catálogo también se protege
    let pedido = '';
    await page.route(`${ENDPOINT}**`, (r) => { pedido = r.request().url(); r.fulfill({ json: reales }); });
    await page.goto('./');
    await expect(tarjetas(page)).toHaveCount(7);
    expect(pedido).toBe(`${ENDPOINT}?api`);
    await expect(page.locator('#aviso-demo')).toBeHidden();
    await expect(page.locator('#temporada-titulo')).toHaveText('Temporada: Día del Padre');
    await page.locator('.pestana', { hasText: 'Servicios' }).click();
    const wa = leerWhatsApp(await page.locator('.paquete a').first().getAttribute('href'));
    expect(wa.telefono).toBe('527129998877');
  });

  test('si falla la conexión, muestra lo último que vio; si nunca cargó, ofrece WhatsApp', async ({ page }) => {
    await page.route(`${ENDPOINT}**`, (r) => r.fulfill({ status: 500, body: 'error' }));
    await page.goto('./');
    await expect(page.locator('#vacio')).toContainText('No pudimos cargar el catálogo');
    await expect(page.locator('#vacio-wa')).toHaveAttribute('href', /phone=527122319080/);

    await page.unroute(`${ENDPOINT}**`);
    const reales = { ...structuredClone(DEMO), demo: false };
    await page.route(`${ENDPOINT}**`, (r) => r.fulfill({ json: reales }));
    await page.reload();
    await expect(tarjetas(page)).toHaveCount(8);

    await page.unroute(`${ENDPOINT}**`);
    await page.route(`${ENDPOINT}**`, (r) => r.abort());
    await page.reload();
    await expect(tarjetas(page)).toHaveCount(8); // desde la copia guardada en el teléfono
  });

  test('fotos de Drive: si falla la primera dirección prueba la miniatura y al final el logo', async ({ page }) => {
    const reales = { ...structuredClone(DEMO), demo: false };
    reales.productos[0].foto = '1FotoQueSiCargaEnMiniatura0000000';
    reales.productos[1].foto = '1FotoQueNoExisteEnNingunLado00000';
    await page.route(`${ENDPOINT}**`, (r) => r.fulfill({ json: reales }));
    await page.route('https://lh3.googleusercontent.com/**', (r) => r.fulfill({ status: 403 }));
    const svg = readFileSync(new URL('../../img/demo/rosas.svg', import.meta.url));
    await page.route('https://drive.google.com/thumbnail**', (r) => (
      r.request().url().includes('SiCarga') ? r.fulfill({ contentType: 'image/svg+xml', body: svg }) : r.fulfill({ status: 404 })
    ));
    await page.goto('./');
    const primera = tarjetas(page).nth(0).locator('img');
    await expect(primera).toHaveAttribute('src', /drive\.google\.com\/thumbnail\?id=1FotoQueSiCarga.*&sz=w400/);
    await expect(primera).not.toHaveClass(/sin-foto/);
    await expect(tarjetas(page).nth(1).locator('img')).toHaveClass(/sin-foto/);
  });

  test('al volver a la pestaña (iPhone la guarda en memoria) vuelve a pedir los datos y muestra el cambio', async ({ page }) => {
    let datos = { ...structuredClone(DEMO), demo: false };
    let pedidos = 0;
    await page.route(`${ENDPOINT}**`, (r) => { pedidos += 1; r.fulfill({ json: datos }); });
    await page.goto('./');
    await expect(tarjetas(page)).toHaveCount(8);
    expect(pedidos).toBe(1);

    datos = structuredClone(datos);
    datos.config.ocasiones.push({ id: 'navidad', nombre: 'Navidad', emoji: '🎄' });
    datos.productos[0].ocasiones.push('navidad');
    datos.productos[0].nombre = 'Caja de rosas navideña';
    await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })));
    await expect(tarjetas(page).first().locator('.tarjeta-nombre')).toHaveText('Caja de rosas navideña');
    await expect(page.locator('.chip', { hasText: 'Navidad' })).toBeVisible();
    expect(pedidos).toBe(2);
  });

  test('una ocasión sin productos no aparece en los filtros', async ({ page }) => {
    const datos = { ...structuredClone(DEMO), demo: false };
    datos.config.ocasiones.push({ id: 'navidad', nombre: 'Navidad', emoji: '🎄' });
    await page.route(`${ENDPOINT}**`, (r) => r.fulfill({ json: datos }));
    await page.goto('./');
    await expect(tarjetas(page)).toHaveCount(8);
    await expect(page.locator('.chip', { hasText: 'Navidad' })).toHaveCount(0);
  });

  test('la API responde con error -> mensaje amable', async ({ page }) => {
    await page.route(`${ENDPOINT}**`, (r) => r.fulfill({ json: { error: 'No se pudo leer el catálogo' } }));
    await page.goto('./');
    await expect(page.locator('#vacio')).toContainText('No pudimos cargar');
  });
});

test('sin desbordes horizontales en celular', async ({ page }) => {
  await page.goto('./');
  await expect(tarjetas(page)).toHaveCount(8);
  for (const cat of ['Regalos', 'Servicios']) {
    await page.locator('.pestana', { hasText: cat }).click();
    const ancho = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(ancho).toBeLessThanOrEqual(0);
  }
});
