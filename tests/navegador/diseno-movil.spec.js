// Ajustes de diseño para celular: barra fija de una fila, botones al alcance del pulgar,
// textos legibles, botón flotante que no tapa productos, y en el panel: acciones rápidas sin espera
// (seguras ante fallos y en orden), "Agregar" en la barra de abajo y teclado sin estorbos.
import { test, expect } from '@playwright/test';

const alto = async (loc) => (await loc.boundingBox()).height;

test.describe('catálogo en celular', () => {
  test.use({ viewport: { width: 390, height: 664 }, hasTouch: true });
  test.beforeEach(async ({ page }) => {
    await page.route('**/js/config.js', (r) => r.fulfill({
      contentType: 'text/javascript', body: "export const CONFIG = { endpoint: '', panel: '', whatsappRespaldo: '527122319080' };",
    }));
    await page.goto('./');
    await expect(page.locator('#lista .tarjeta')).toHaveCount(8);
  });

  test('al desplazarse solo queda fija una fila: los filtros de ocasión', async ({ page }) => {
    await page.evaluate(() => scrollTo(0, 1400));
    await page.waitForTimeout(300);
    const fijos = await page.evaluate(() => [...document.querySelectorAll('body *')]
      .filter((e) => getComputedStyle(e).position === 'sticky' && e.getBoundingClientRect().top <= 0.5 && e.offsetHeight)
      .map((e) => ({ id: e.id, alto: e.offsetHeight })));
    expect(fijos).toEqual([{ id: 'barra-ocasiones', alto: expect.any(Number) }]);
    expect(fijos[0].alto).toBeLessThanOrEqual(66);
    await expect(page.locator('#barra-ocasiones')).toHaveClass(/pegada/);
    // Las pestañas y el buscador se fueron con la página
    expect((await page.locator('#pestanas').boundingBox()).y).toBeLessThan(0);
  });

  test('tocar una ocasión con la página abajo deja los productos justo debajo de la fila fija', async ({ page }) => {
    await page.evaluate(() => scrollTo(0, 1600));
    await page.locator('.chip', { hasText: 'Baby shower' }).click();
    await expect(page.locator('#lista .tarjeta')).toHaveCount(2);
    await page.waitForTimeout(700);
    const fila = await page.locator('#barra-ocasiones').boundingBox();
    const titulo = await page.locator('#titulo-lista').boundingBox();
    expect(titulo.y).toBeGreaterThanOrEqual(fila.y + fila.height - 2);
    expect(titulo.y).toBeLessThan(fila.y + fila.height + 60);
  });

  test('"Lo quiero" y los filtros miden al menos 44 px', async ({ page }) => {
    for (const b of await page.locator('#lista .boton-wa').all()) expect(await alto(b)).toBeGreaterThanOrEqual(44);
    for (const c of await page.locator('.chip').all()) expect(await alto(c)).toBeGreaterThanOrEqual(44);
  });

  test('la fila de ocasiones avisa que se desliza, y deja de avisar al llegar al final', async ({ page }) => {
    await expect(page.locator('#ocasiones')).toHaveClass(/hay-mas/);
    await page.locator('#ocasiones').evaluate((e) => { e.scrollLeft = e.scrollWidth; });
    await expect(page.locator('#ocasiones')).not.toHaveClass(/hay-mas/);
  });

  test('textos legibles: nada por debajo de 12.5 px y contraste AA en precios, insignias y ubicación', async ({ page }) => {
    const medidas = await page.evaluate(() => {
      const lum = (c) => { const [r, g, b] = c.match(/[\d.]+/g).slice(0, 3).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
      const fondo = (el) => { for (let e = el; e; e = e.parentElement) { const bg = getComputedStyle(e).backgroundColor; if (!/rgba\(0, 0, 0, 0\)/.test(bg)) return bg; } return 'rgb(255,250,249)'; };
      const de = (sel) => { const el = document.querySelector(sel); const cs = getComputedStyle(el); const a = lum(cs.color), b = lum(fondo(el)); return { px: parseFloat(cs.fontSize), contraste: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) }; };
      return { lugar: de('#lugar'), insignia: de('.insignia'), consultar: de('.precio.consultar'), desc: de('.tarjeta-desc'), lo: de('.tarjeta .boton-wa') };
    });
    for (const [k, m] of Object.entries(medidas)) {
      expect(m.px, k).toBeGreaterThanOrEqual(12.5);
      expect(m.contraste, k).toBeGreaterThanOrEqual(4.5);
    }
    expect(medidas.desc.px).toBeGreaterThanOrEqual(14);
    expect(medidas.lo.px).toBeGreaterThanOrEqual(15);
  });

  test('el botón flotante de WhatsApp se aparta mientras hay productos debajo y vuelve en el pie', async ({ page }) => {
    const boton = page.locator('#wa-flotante');
    await page.evaluate(() => scrollTo(0, 900));
    await expect(boton).toHaveClass(/apartado/);
    expect(await boton.evaluate((e) => getComputedStyle(e).pointerEvents)).toBe('none'); // no se toca por error
    await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
    await expect(boton).not.toHaveClass(/apartado/, { timeout: 8000 });
  });

  test('las primeras fotos cargan con prioridad y las demás al acercarse', async ({ page }) => {
    await expect(page.locator('#temporada-lista img').first()).toHaveAttribute('fetchpriority', 'high');
    await expect(page.locator('#lista img').last()).toHaveAttribute('loading', 'lazy');
  });

  test('cerrar la vista ampliada: sin recuadro al tocar, con indicador al usar teclado', async ({ page }) => {
    await page.locator('#lista .tarjeta-foto').first().click();
    const cerrar = page.locator('#detalle-cerrar');
    await expect(cerrar).toBeVisible();
    await cerrar.evaluate((e) => e.focus());
    expect(await cerrar.evaluate((e) => (e.matches(':focus-visible') ? 'teclado' : getComputedStyle(e).outlineStyle))).toMatch(/none|teclado/);
    await page.keyboard.press('Escape');
    await page.locator('#lista .tarjeta-foto').first().focus();
    await page.keyboard.press('Enter');
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Tab');
    const conTeclado = await page.evaluate(() => { const e = document.activeElement; return { id: e.id, outline: getComputedStyle(e).outlineStyle }; });
    expect(conTeclado).toEqual({ id: 'detalle-cerrar', outline: 'solid' });
  });

  test('las letras de la marca no detienen la página', async ({ page }) => {
    // Empieza como "preload" (no detiene la página) y se aplica sola al llegar
    await expect.poll(() => page.evaluate(() => [...document.querySelectorAll('head link[href*="fonts.googleapis.com/css2"]')].map((l) => l.rel)), { timeout: 10000 })
      .toContain('stylesheet');
    expect(await page.evaluate(() => getComputedStyle(document.getElementById('lema')).fontFamily)).toContain('Caveat');
  });
});

test.describe('panel en celular', () => {
  test.use({ viewport: { width: 390, height: 740 }, hasTouch: true, isMobile: true });
  test.beforeEach(async ({ page }) => {
    await page.goto('/panel-local/');
    await expect(page.locator('.item')).toHaveCount(9);
  });

  const publico = (page, id) => page.evaluate((i) => __gs.api().productos.find((p) => p.id === i), id);

  test('destacar y ocultar se ven al momento, sin bloquear la pantalla', async ({ page }) => {
    await page.evaluate(() => { window.__demoraRapida = 1500; });
    const globos = page.locator('.item', { hasText: 'Arreglo de globos' });
    await globos.locator('[data-accion="destacar"]').click();
    await expect(globos.locator('.etiqueta.destacada')).toBeVisible({ timeout: 300 });
    await expect(page.locator('#ocupado')).toBeHidden();
    await expect(globos.locator('.item-guardando')).toContainText('Guardando');
    expect((await publico(page, 'p4')).destacado).toBe(false); // aún no confirmado
    await expect(globos.locator('.item-guardando')).toHaveCount(0, { timeout: 4000 });
    expect((await publico(page, 'p4')).destacado).toBe(true);
  });

  test('si falla, la tarjeta vuelve a su estado real y se avisa', async ({ page }) => {
    await page.evaluate(() => { window.__fallar = { panelCambiarProducto: 1 }; window.__demoraRapida = 400; });
    const oso = page.locator('.item', { hasText: 'Oso con chocolates' });
    await oso.locator('[data-accion="ocultar"]').click();
    await expect(oso).toHaveClass(/oculto/);
    await expect(page.locator('#aviso.error')).toContainText('No se guardó: ocultar «Oso con chocolates»');
    await expect(oso).not.toHaveClass(/oculto/);
    await expect(oso.locator('.item-guardando')).toHaveCount(0);
    expect((await publico(page, 'p3')).disponible).toBe(true);
  });

  test('si falla una, las que seguían para ese mismo producto se descartan; las de otros siguen', async ({ page }) => {
    await page.evaluate(() => { window.__fallar = { panelCambiarProducto: 1 }; window.__demoraRapida = 300; });
    const oso = page.locator('.item', { hasText: 'Oso con chocolates' });
    const kit = page.locator('.item', { hasText: 'Kit para papá' });
    await oso.locator('[data-accion="destacar"]').click();   // falla (quitar estrella)
    await oso.locator('[data-accion="ocultar"]').click();    // se descarta: se pensó sobre algo que no se guardó
    await kit.locator('[data-accion="destacar"]').click();   // otro producto: sí se guarda
    await expect(page.locator('#aviso.error')).toBeVisible();
    await expect(page.locator('.item-guardando')).toHaveCount(0, { timeout: 4000 });
    const p3 = await publico(page, 'p3');
    expect([p3.destacado, p3.disponible]).toEqual([true, true]);
    expect((await publico(page, 'p6')).destacado).toBe(true);
    await expect(oso).not.toHaveClass(/oculto/);
    await expect(oso.locator('.etiqueta.destacada')).toBeVisible();
  });

  test('varias acciones seguidas se aplican en orden y la lista coincide con lo guardado', async ({ page }) => {
    await page.evaluate(() => { window.__demoraRapida = 250; });
    const kit = page.locator('.item', { hasText: 'Kit para papá' });
    for (let i = 0; i < 3; i++) await kit.locator('[data-accion="subir"]').click();
    await kit.locator('[data-accion="ocultar"]').click();
    await kit.locator('[data-accion="ocultar"]').click();
    await kit.locator('[data-accion="destacar"]').click();
    const enPantalla = await page.locator('.lista').first().locator('.item-nombre').allTextContents();
    await expect(page.locator('.item-guardando')).toHaveCount(0, { timeout: 6000 });
    const guardado = await page.evaluate(() => __gs.api().productos.filter((p) => p.categoria === 'regalos').map((p) => p.nombre));
    expect(enPantalla).toEqual(guardado);
    expect(guardado.indexOf('Kit para papá')).toBe(2);
    const p6 = await publico(page, 'p6');
    expect([p6.disponible, p6.destacado]).toEqual([true, true]);
    expect(await page.locator('.lista').first().locator('.item-nombre').allTextContents()).toEqual(guardado);
  });

  test('guardar un formulario espera a que terminen las acciones rápidas', async ({ page }) => {
    await page.evaluate(() => { window.__demoraRapida = 800; });
    await page.locator('.item', { hasText: 'Pastel de pañales' }).locator('[data-accion="destacar"]').click();
    await page.locator('.item', { hasText: 'Pastel de pañales' }).locator('.item-principal').click();
    await page.fill('#f-precio', '800');
    await page.click('[data-accion="guardar-producto"]');
    await expect(page.locator('#f-nombre')).toHaveCount(0, { timeout: 5000 });
    const p5 = await publico(page, 'p5');
    expect([p5.destacado, p5.precio]).toEqual([true, 800]);
  });

  test('"Agregar" está en la barra de abajo y nunca tapa una tarjeta', async ({ page }) => {
    await expect(page.locator('.agregar')).toHaveCount(0);
    const boton = page.locator('#nav-agregar');
    await expect(boton).toBeVisible();
    expect(await alto(boton)).toBeGreaterThanOrEqual(56);
    await boton.click();
    await expect(page.locator('h1')).toHaveText('Nuevo producto');
    await expect(boton).toBeHidden();
    await page.click('[data-accion="volver"]');
    await page.click('[data-ir="paquetes"]');
    await page.locator('#nav-agregar').click();
    await expect(page.locator('h1')).toHaveText('Nuevo paquete');
  });

  test('con el teclado abierto se esconden la barra de abajo y el "Guardar" flotante', async ({ page }) => {
    await page.locator('.item-principal').first().click();
    await expect(page.locator('#navegacion')).toBeVisible();
    await page.focus('#f-nombre');
    await expect(page.locator('#navegacion')).toBeHidden();
    expect(await page.locator('.guardar-fijo').evaluate((e) => getComputedStyle(e).position)).toBe('static');
    await page.focus('#f-descripcion'); // de un campo a otro no parpadea
    await expect(page.locator('#navegacion')).toBeHidden();
    await page.locator('#f-descripcion').blur();
    await expect(page.locator('#navegacion')).toBeVisible();
    expect(await page.locator('.guardar-fijo').evaluate((e) => getComputedStyle(e).position)).toBe('sticky');
  });

  test('"Quitar la foto" queda separado de Galería', async ({ page }) => {
    await page.locator('.item-principal').first().click();
    const galeria = await page.locator('[data-accion="foto-galeria"]').boundingBox();
    const quitar = await page.locator('[data-accion="foto-quitar"]').boundingBox();
    expect(quitar.y - (galeria.y + galeria.height)).toBeGreaterThanOrEqual(30);
    expect(quitar.height).toBeGreaterThanOrEqual(48);
  });

  test('textos del panel de al menos 13.5 px', async ({ page }) => {
    const px = await page.evaluate(() => ['.etiqueta', '.item-acciones button', '.cabecera-texto small', '.boton-chico']
      .map((s) => parseFloat(getComputedStyle(document.querySelector(s)).fontSize)));
    for (const v of px) expect(v).toBeGreaterThanOrEqual(13.5);
  });
});
