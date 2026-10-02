// Panel de administración corriendo en local: Codigo.gs real sobre el simulador de Google.
import { test, expect } from '@playwright/test';

/** Genera una foto JPEG de prueba en el navegador (como las de la cámara del celular). */
async function fotoDePrueba(page, ancho, alto, tipo = 'image/jpeg') {
  const base64 = await page.evaluate(async ([w, h, t]) => {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    // Degradado con ruido para que el JPEG pese como una foto real
    const grad = g.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, '#f06292'); grad.addColorStop(1, '#ffd54f');
    g.fillStyle = grad; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 4000; i++) {
      g.fillStyle = `hsl(${Math.random() * 360},70%,${30 + Math.random() * 50}%)`;
      g.fillRect(Math.random() * w, Math.random() * h, 3 + Math.random() * 40, 3 + Math.random() * 40);
    }
    const blob = await new Promise((r) => c.toBlob(r, t, 0.95));
    const buf = new Uint8Array(await blob.arrayBuffer());
    let s = ''; for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
    return btoa(s);
  }, [ancho, alto, tipo]);
  return Buffer.from(base64, 'base64');
}

test.describe('reducción de fotos', () => {
  test.beforeEach(async ({ page }) => { await page.goto('/panel-local/'); });

  test('calcularTamano mantiene proporción y nunca agranda', async ({ page }) => {
    const r = await page.evaluate(() => [
      calcularTamano(4000, 3000, 1200), calcularTamano(3000, 4000, 1200),
      calcularTamano(800, 600, 1200), calcularTamano(1200, 1200, 1200), calcularTamano(5000, 100, 1200),
    ]);
    expect(r).toEqual([
      { ancho: 1200, alto: 900 }, { ancho: 900, alto: 1200 },
      { ancho: 800, alto: 600 }, { ancho: 1200, alto: 1200 }, { ancho: 1200, alto: 24 },
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
      expect(Math.max(r.ancho, r.alto)).toBe(Math.min(1200, Math.max(w, h)));
      expect(r.real).toEqual([r.ancho, r.alto]);
      expect(Math.abs(r.ancho / r.alto - w / h)).toBeLessThan(0.01);
      expect(r.bytes).toBeLessThanOrEqual(450 * 1024);
      expect(r.base64ok).toBe(true);
      if (w * h > 2e6) expect(r.bytes).toBeLessThan(original.length / 2);
    });
  }

  test('rechaza archivos que no son fotos', async ({ page }) => {
    const msg = await page.evaluate(() => reducirImagen(new File(['hola'], 'a.txt', { type: 'text/plain' })).catch((e) => e.message));
    expect(msg).toMatch(/no es una foto/);
  });
});

test.describe('panel', () => {
  test.beforeEach(async ({ page }) => {
    // Fotos subidas al "Drive" simulado: se sirven desde la memoria del simulador.
    await page.route('https://lh3.googleusercontent.com/d/**', async (route) => {
      const id = route.request().url().split('/d/')[1].split('=')[0];
      const b64 = await page.evaluate((i) => {
        const a = window.__simulador && __simulador.archivos[i];
        if (!a) return null;
        let s = '';
        for (let j = 0; j < a.bytes.length; j += 0x8000) s += String.fromCharCode.apply(null, a.bytes.slice(j, j + 0x8000));
        return btoa(s);
      }, id).catch(() => null);
      if (!b64) return route.fulfill({ status: 404 });
      return route.fulfill({ contentType: 'image/jpeg', body: Buffer.from(b64, 'base64') });
    });
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
    await expect(page.locator('.foto-estado')).toContainText('1200×900');

    await page.fill('#f-nombre', 'Taza mágica');
    await page.fill('#f-descripcion', 'Cambia de color con el café caliente.');
    await page.click('[data-ocasion="10-de-mayo"]');
    await page.click('[data-ocasion="dia-del-padre"]');
    await page.click('[data-tipo-precio="desde"]');
    await page.fill('#f-precio', '180');
    await expect(page.locator('#previa-precio')).toHaveText('Desde $180');
    await page.click('[data-accion="guardar-producto"]');

    await expect(page.locator('#aviso')).toContainText('agregado');
    await expect(page.locator('.item')).toHaveCount(10);
    const item = page.locator('.item', { hasText: 'Taza mágica' });
    await expect(item.locator('.item-precio')).toHaveText('Desde $180');
    await expect(item.locator('.item-foto')).not.toHaveClass(/sin-foto/);

    const publico = await page.evaluate(() => JSON.parse(__gs.doGet({ parameter: { api: '' } }).getContent()));
    const p = publico.productos.find((x) => x.nombre === 'Taza mágica');
    expect(p.ocasiones).toEqual(['10-de-mayo', 'dia-del-padre']);
    expect(p.tipoPrecio).toBe('desde');
    const archivo = await page.evaluate((id) => {
      const a = __simulador.archivos[id];
      return { compartido: a.compartido, bytes: a.bytes.length, nombre: a.nombre };
    }, p.foto);
    expect(archivo.compartido).toBe(true);
    expect(archivo.bytes).toBeLessThan(450 * 1024);
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

    const publico = await page.evaluate(() => JSON.parse(__gs.doGet({ parameter: { api: '' } }).getContent()));
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

    const c = await page.evaluate(() => JSON.parse(__gs.doGet({ parameter: { api: '' } }).getContent()).config);
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
