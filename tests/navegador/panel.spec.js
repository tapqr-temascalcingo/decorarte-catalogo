// Panel de administración corriendo en local: Codigo.gs real sobre el simulador de Google.
import { test, expect } from '@playwright/test';
import { fotoDePrueba, servirFotosSimuladas } from './ayudantes.js';

test.describe('reducción de fotos', () => {
  test.beforeEach(async ({ page }) => { await page.goto('/panel-local/'); });

  test('calcularTamano mantiene proporción y nunca agranda', async ({ page }) => {
    const r = await page.evaluate(() => [
      calcularTamano(4000, 3000), calcularTamano(3000, 4000),
      calcularTamano(800, 600), calcularTamano(1080, 1080), calcularTamano(5000, 100), calcularTamano(4000, 3000, 1200),
    ]);
    expect(r).toEqual([
      { ancho: 1080, alto: 810 }, { ancho: 810, alto: 1080 },
      { ancho: 800, alto: 600 }, { ancho: 1080, alto: 1080 }, { ancho: 1080, alto: 22 }, { ancho: 1200, alto: 900 },
    ]);
    await expect(page.evaluate(() => calcularTamano(0, 10))).rejects.toThrow();
  });

  for (const [desc, w, h, tipo] of [
    ['foto horizontal de 12 MP', 4000, 3000, 'image/jpeg'],
    ['foto vertical', 3024, 4032, 'image/jpeg'],
    ['PNG con transparencia', 1600, 1600, 'image/png'],
    ['foto pequeña', 640, 480, 'image/jpeg'],
  ]) {
    test(`reduce ${desc} a JPEG liviano`, async ({ page }) => {
      const original = await fotoDePrueba(page, w, h, tipo);
      const r = await page.evaluate(async ([b64, t]) => {
        const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
        const archivo = new File([bytes], 'foto', { type: t });
        const res = await reducirImagen(archivo);
        const img = await createImageBitmap(res.blob);
        return { ancho: res.ancho, alto: res.alto, bytes: res.bytes, tipo: res.tipo, real: [img.width, img.height], base64ok: atob(res.base64).length === res.bytes };
      }, [original.toString('base64'), tipo]);
      expect(r.tipo).toBe('image/jpeg');
      expect(Math.max(r.ancho, r.alto)).toBeLessThanOrEqual(Math.min(1080, Math.max(w, h)));
      expect(Math.max(r.ancho, r.alto)).toBeGreaterThanOrEqual(Math.min(700, Math.max(w, h)));
      expect(r.real).toEqual([r.ancho, r.alto]);
      expect(Math.abs(r.ancho / r.alto - w / h)).toBeLessThan(0.01);
      expect(r.bytes).toBeLessThanOrEqual(250 * 1024);
      expect(r.base64ok).toBe(true);
      if (w * h > 2e6) expect(r.bytes).toBeLessThan(original.length / 4);
    });
  }

  test('rechaza archivos que no son fotos', async ({ page }) => {
    const msg = await page.evaluate(() => reducirImagen(new File(['hola'], 'a.txt', { type: 'text/plain' })).catch((e) => e.message));
    expect(msg).toMatch(/no es una foto/);
  });
});

test.describe('panel', () => {
  test.beforeEach(async ({ page }) => {
    await servirFotosSimuladas(page);
    await page.goto('/panel-local/');
    await expect(page.locator('.item')).toHaveCount(9);
  });

  test('lista con fotos, buscador y filtros', async ({ page }) => {
    await expect(page.locator('h2.grupo-titulo')).toHaveText([/Regalos/, /Servicios/]);
    await page.fill('#buscar', 'pañales');
    await expect(page.locator('.item')).toHaveCount(1);
    await page.fill('#buscar', '');
    await page.locator('[data-filtro="servicios"]').click();
    await expect(page.locator('.item')).toHaveCount(1);
    await page.locator('[data-filtro="ocultos"]').click();
    await expect(page.locator('.vacio')).toContainText('No hay resultados');
  });

  test('agregar producto con foto, varias ocasiones y precio "desde"', async ({ page }) => {
    await page.click('[data-accion="nuevo-producto"]');
    await expect(page.locator('h1')).toHaveText('Nuevo producto');

    const foto = await fotoDePrueba(page, 4000, 3000);
    await page.setInputFiles('#foto-galeria', { name: 'IMG_0001.jpg', mimeType: 'image/jpeg', buffer: foto });
    await expect(page.locator('.foto-estado').first()).toContainText('1080×810');

    await page.fill('#f-nombre', 'Taza mágica');
    await page.fill('#f-descripcion', 'Cambia de color con el café caliente.');
    await page.click('[data-ocasion="10-de-mayo"]');
    await page.click('[data-ocasion="dia-del-padre"]');
    await page.click('[data-tipo-precio="desde"]');
    await page.fill('#f-precio', '180');
    await expect(page.locator('#previa-precio')).toHaveText('Desde $180');
    await page.evaluate(() => { window.__demoraSubida = 1500; }); // señal lenta
    await page.click('[data-accion="guardar-producto"]');

    // Se guarda al momento y la foto sigue subiendo en segundo plano
    await expect(page.locator('#aviso')).toContainText('agregado');
    await expect(page.locator('#ocupado')).toBeHidden();
    await expect(page.locator('.item')).toHaveCount(10);
    const item = page.locator('.item', { hasText: 'Taza mágica' });
    await expect(item.locator('.item-subida')).toContainText('Subiendo foto');
    await expect(item.locator('.item-foto')).toHaveAttribute('src', /^blob:/);
    expect((await page.evaluate(() => __gs.api())).productos.find((x) => x.nombre === 'Taza mágica').foto).toBe('');
    await expect(item.locator('.item-subida')).toBeHidden({ timeout: 8000 });
    await expect(item.locator('.item-precio')).toHaveText('Desde $180');

    const publico = await page.evaluate(() => __gs.api());
    const p = publico.productos.find((x) => x.nombre === 'Taza mágica');
    expect(p.ocasiones).toEqual(['10-de-mayo', 'dia-del-padre']);
    expect(p.tipoPrecio).toBe('desde');
    const archivo = await page.evaluate((id) => {
      const a = __simulador.archivos[id];
      return { compartido: a.compartido, bytes: a.bytes.length, nombre: a.nombre };
    }, p.foto);
    expect(archivo.compartido).toBe(true);
    expect(archivo.bytes).toBeLessThan(250 * 1024);
    expect(archivo.nombre).toMatch(/^taza-magica-/);
  });

  test('pide nombre y precio antes de guardar', async ({ page }) => {
    await page.click('[data-accion="nuevo-producto"]');
    await page.click('[data-accion="guardar-producto"]');
    await expect(page.locator('#aviso')).toContainText('nombre');
    await page.fill('#f-nombre', 'Algo');
    await page.click('[data-accion="guardar-producto"]');
    await expect(page.locator('#aviso')).toContainText('precio');
    await page.click('[data-tipo-precio="consultar"]');
    await expect(page.locator('#campo-precio')).toBeHidden();
    await page.click('[data-accion="guardar-producto"]');
    await expect(page.locator('.item', { hasText: 'Algo' }).locator('.item-precio')).toHaveText('Pregunta por precio');
  });

  test('ocultar, destacar y reordenar desde la tarjeta', async ({ page }) => {
    const oso = page.locator('.item', { hasText: 'Oso con chocolates' });
    await oso.locator('[data-accion="ocultar"]').click();
    await expect(oso).toHaveClass(/oculto/);
    await expect(oso.locator('.etiqueta.oculta')).toBeVisible();

    const globos = page.locator('.item', { hasText: 'Arreglo de globos' });
    await globos.locator('[data-accion="destacar"]').click();
    await expect(globos.locator('.etiqueta.destacada')).toBeVisible();

    await globos.locator('[data-accion="subir"]').click();
    await expect(page.locator('.lista').first().locator('.item-nombre').nth(2)).toHaveText('Arreglo de globos personalizado');

    const publico = await page.evaluate(() => __gs.api());
    expect(publico.productos.map((p) => p.id)).not.toContain('p3');
  });

  test('editar, avisar si sales sin guardar y eliminar con confirmación', async ({ page }) => {
    await page.locator('.item', { hasText: 'Kit para papá' }).locator('.item-principal').click();
    await page.fill('#f-nombre', 'Kit para papá deluxe');
    await page.click('[data-accion="volver"]');
    await expect(page.locator('#confirmar')).toBeVisible();
    await expect(page.locator('#confirmar-titulo')).toHaveText('¿Salir sin guardar?');
    await page.click('#confirmar-no');
    await page.click('[data-accion="guardar-producto"]');
    await expect(page.locator('.item', { hasText: 'Kit para papá deluxe' })).toHaveCount(1);

    await page.locator('.item', { hasText: 'Kit para papá deluxe' }).locator('.item-principal').click();
    await page.click('[data-accion="eliminar-producto"]');
    await expect(page.locator('#confirmar-titulo')).toContainText('¿Eliminar');
    await page.click('#confirmar-no');
    await expect(page.locator('#f-nombre')).toBeVisible();
    await page.click('[data-accion="eliminar-producto"]');
    await page.click('#confirmar-si');
    await expect(page.locator('#aviso')).toContainText('eliminado');
    await expect(page.locator('.item')).toHaveCount(8);
  });

  test('paquetes de servicios', async ({ page }) => {
    await page.click('[data-ir="paquetes"]');
    await expect(page.locator('.item')).toHaveCount(3);
    await page.click('[data-accion="nuevo-paquete"]');
    await page.fill('#f-nombre', 'Boda');
    await page.fill('#f-incluye', '100 personas\nMeseros');
    await page.fill('#f-precio', '9500');
    await page.click('[data-accion="guardar-paquete"]');
    await expect(page.locator('.item')).toHaveCount(4);
    await expect(page.locator('.item', { hasText: 'Boda' }).locator('.item-precio')).toHaveText('$9,500');
    await page.locator('.item', { hasText: 'Mini' }).locator('[data-accion="ocultar-paquete"]').click();
    await expect(page.locator('.item', { hasText: 'Mini' })).toHaveClass(/oculto/);
  });

  test('ajustes: WhatsApp, temporada, ocasiones y accesos', async ({ page }) => {
    await page.click('[data-ir="ajustes"]');
    await expect(page.locator('#a-whatsapp')).toHaveValue('712 231 9080');
    await page.fill('#a-whatsappServicios', '712 999 8877');
    await page.fill('#a-direccion', 'Av. Juárez 10, Centro, Temascalcingo');
    await page.click('[data-accion="guardar-contacto"]');
    await expect(page.locator('#aviso')).toContainText('Contacto guardado');

    await page.selectOption('#a-temporada', '10-de-mayo');
    await page.click('[data-accion="guardar-temporada"]');
    await expect(page.locator('#aviso')).toContainText('Temporada guardada');

    await page.click('[data-accion="agregar-fila"][data-lista="ocasiones"]');
    await page.locator('[data-lista="ocasiones"][data-prop="nombre"]').last().fill('XV años');
    await page.click('[data-accion="agregar-fila"][data-lista="autorizados"]');
    await page.locator('input[data-lista="autorizados"]').last().fill('ayudante@gmail.com');
    await page.locator('[data-accion="guardar-listas"]').first().click();
    await expect(page.locator('#aviso')).toContainText('guardado');

    const c = await page.evaluate(() => __gs.api().config);
    expect(c.whatsappServicios).toBe('527129998877');
    expect(c.direccion).toBe('Av. Juárez 10, Centro, Temascalcingo');
    expect(c.temporada).toBe('10-de-mayo');
    expect(c.ocasiones.at(-1)).toEqual({ id: 'xv-anos', emoji: '', nombre: 'XV años' });
    expect(c.autorizados).toBeUndefined();
  });

  test('números de WhatsApp incorrectos se rechazan con mensaje claro', async ({ page }) => {
    await page.click('[data-ir="ajustes"]');
    await page.fill('#a-whatsapp', '12345');
    await page.click('[data-accion="guardar-contacto"]');
    await expect(page.locator('#aviso.error')).toContainText('10 dígitos');
  });
});

test('correo no autorizado no puede usar el panel', async ({ page }) => {
  await page.goto('/panel-local/?usuario=intruso@gmail.com');
  await expect(page.locator('.vacio')).toContainText('No tienes permiso');
});
