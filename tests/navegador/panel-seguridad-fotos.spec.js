// Fotos en segundo plano, nota de ocasiones vacías y funciones del panel en la implementación API.
import { test, expect } from '@playwright/test';
import { fotoDePrueba, servirFotosSimuladas } from './ayudantes.js';

const productoPublico = async (page, id) => (await page.evaluate(() => __gs.api())).productos.find((p) => p.id === id);

test.describe('fotos en segundo plano', () => {
  test.beforeEach(async ({ page }) => {
    await servirFotosSimuladas(page);
    await page.goto('/panel-local/');
    await expect(page.locator('.item')).toHaveCount(9);
  });

  async function cambiarFoto(page, nombre) {
    await page.locator('.item', { hasText: nombre }).locator('.item-principal').click();
    await page.setInputFiles('#foto-galeria', { name: 'IMG.jpg', mimeType: 'image/jpeg', buffer: await fotoDePrueba(page, 3000, 3000) });
    await expect(page.locator('.foto-estado').first()).toContainText('Foto lista');
    await page.click('[data-accion="guardar-producto"]');
    await expect(page.locator('#aviso')).toContainText('Subiendo la foto');
  }

  test('si la subida falla, avisa y se puede reintentar', async ({ page }) => {
    await page.evaluate(() => { window.__falloSubida = 1; });
    await cambiarFoto(page, 'Kit para papá');
    const item = page.locator('.item', { hasText: 'Kit para papá' });
    await expect(item.locator('.item-subida.error')).toContainText('No se subió la foto');
    await expect(page.locator('#aviso.error')).toContainText('Reintentar');
    expect((await productoPublico(page, 'p6')).foto).toBe('img/demo/papa.svg');
    await item.getByRole('button', { name: 'Reintentar' }).click();
    await expect(item.locator('.item-subida')).toBeHidden({ timeout: 8000 });
    expect((await productoPublico(page, 'p6')).foto).toMatch(/^1Simulado/);
  });

  test('mientras sube se puede seguir trabajando, y el formulario muestra el estado', async ({ page }) => {
    await page.evaluate(() => { window.__demoraSubida = 2500; });
    await cambiarFoto(page, 'Oso con chocolates');
    const globos = page.locator('.item', { hasText: 'Arreglo de globos' });
    await globos.locator('[data-accion="destacar"]').click();
    await expect(globos.locator('.etiqueta.destacada')).toBeVisible();
    await page.locator('.item', { hasText: 'Oso con chocolates' }).locator('.item-principal').click();
    await expect(page.locator('#foto-estado-subida')).toContainText('Subiendo foto');
    await page.fill('#f-nombre', 'Oso grande con chocolates');
    await expect(page.locator('#foto-estado-subida')).toBeHidden({ timeout: 8000 });
    await expect(page.locator('#f-nombre')).toHaveValue('Oso grande con chocolates'); // no se borró lo escrito
    await page.click('[data-accion="guardar-producto"]');
    await expect(page.locator('#aviso')).toContainText('Cambios guardados');
    const p3 = await productoPublico(page, 'p3');
    expect(p3.nombre).toBe('Oso grande con chocolates');
    expect(p3.foto).toMatch(/^1Simulado/); // guardar el formulario no pisó la foto nueva
  });

  test('una foto pendiente se reanuda al volver a abrir el panel', async ({ page }) => {
    // Simula que el panel se cerró a media subida: la foto quedó guardada en el teléfono.
    const foto = (await fotoDePrueba(page, 800, 800)).toString('base64');
    await page.evaluate((b64) => almacen.guardar({ productoId: 'p7', base64: b64, tipo: 'image/jpeg', nombre: 'Caja de graduación', creado: Date.now() }), foto);
    await page.reload();
    await expect(page.locator('.item')).toHaveCount(9);
    await expect.poll(async () => (await productoPublico(page, 'p7')).foto, { timeout: 8000 }).toMatch(/^1Simulado/);
    expect(await page.evaluate(() => almacen.todas().then((t) => t.length))).toBe(0);
  });

  test('"Quitar la foto" la quita del catálogo', async ({ page }) => {
    await page.locator('.item', { hasText: 'Pastel de pañales' }).locator('.item-principal').click();
    await page.click('[data-accion="foto-quitar"]');
    await expect(page.locator('.foto-estado').first()).toContainText('Sin foto');
    await page.click('[data-accion="guardar-producto"]');
    await expect(page.locator('#aviso')).toContainText('Cambios guardados');
    expect((await productoPublico(page, 'p5')).foto).toBe('');
  });
});

test('ajustes: una ocasión sin productos avisa que aún no aparece en el catálogo', async ({ page }) => {
  await page.goto('/panel-local/');
  await page.click('[data-ir="ajustes"]');
  await expect(page.locator('.nota-fila')).toHaveCount(0);
  await page.click('[data-accion="agregar-fila"][data-lista="ocasiones"]');
  await page.locator('[data-lista="ocasiones"][data-prop="nombre"]').last().fill('Navidad');
  await page.locator('[data-accion="guardar-listas"]').first().click();
  await expect(page.locator('#aviso')).toContainText('guardado');
  await expect(page.locator('.nota-fila')).toHaveCount(1);
  await expect(page.locator('.nota-fila')).toContainText('aparecerá en el catálogo cuando tenga al menos uno');
  expect((await page.evaluate(() => __gs.api())).config.ocasiones.at(-1).id).toBe('navidad');
});

test.describe('funciones del panel llamadas en la implementación API', () => {
  for (const [desc, usuario] of [['con la sesión de la dueña', 'duena@gmail.com'], ['sin sesión', '']]) {
    test(`se niegan ${desc}`, async ({ page }) => {
      await page.goto(`/panel-local/?implementacion=api&usuario=${encodeURIComponent(usuario)}`);
      await expect(page.locator('.vacio')).toContainText('No se pudo cargar el panel');
      await expect(page.locator('.vacio')).toContainText('no está disponible');
      const resultados = await page.evaluate(() => Promise.all([
        ['panelCargar'], ['panelEliminarProducto', 'p1'], ['panelCambiarProducto', 'p1', 'disponible', false],
        ['panelGuardarConfig', { whatsapp: '7120000000' }], ['panelSubirFotoProducto', 'p1', '/9j/4AAQ', 'image/jpeg', 'x'],
      ].map(([fn, ...args]) => llamar(fn, ...args).then(() => 'permitida', (e) => e.message))));
      for (const r of resultados) expect(r).toMatch(/no está disponible/);
      // instalar, cargarEjemplos y publicarCambios: solo la dueña
      const otras = await page.evaluate(() => Promise.all(['instalar', 'publicarCambios'].map((fn) => llamar(fn).then(() => 'permitida', (e) => e.message))));
      if (usuario) expect(otras).toEqual(['permitida', 'permitida']); // la dueña sí puede (no cambian datos)
      else for (const r of otras) expect(r).toMatch(/Solo la dueña/);
      const publico = await page.evaluate(() => __gs.api());
      expect(publico.productos.map((p) => p.id)).toContain('p1');
      expect(publico.config.whatsapp).toBe('527122319080');
      // y doGet en modo API nunca devuelve una página
      const salida = await page.evaluate(() => { const r = __gs.doGet({ parameter: {} }); return { html: !!r.esHtml, tipo: r.tipo }; });
      expect(salida).toEqual({ html: false, tipo: 'application/json' });
    });
  }
});
