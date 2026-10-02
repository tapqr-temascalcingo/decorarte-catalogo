import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  normalizarTexto, crearId, formatearPrecio, textoPrecio, telefonoWhatsApp, enlaceWhatsApp,
  mensajeProducto, mensajeCotizacion, numeroPara, urlFoto, normalizarDatos, filtrarProductos,
  productosTemporada, paquetesDeServicio, ocasionesConProductos,
} from '../../js/logica.js';

const demo = JSON.parse(await readFile(new URL('../../datos/demo.json', import.meta.url), 'utf8'));
const datos = normalizarDatos(demo);
const ids = (lista) => lista.map((p) => p.id);

test('normaliza textos e ids sin acentos', () => {
  assert.equal(normalizarTexto('  San VALENTÍN '), 'san valentin');
  assert.equal(crearId('Día del Padre'), 'dia-del-padre');
  assert.equal(crearId('10 de Mayo!'), '10-de-mayo');
});

test('formatea precios', () => {
  assert.equal(formatearPrecio(450), '$450');
  assert.equal(formatearPrecio(4800), '$4,800');
  assert.equal(formatearPrecio('1,200'), '$1,200');
  assert.equal(formatearPrecio(99.5), '$99.50');
  assert.equal(formatearPrecio(''), '');
  assert.equal(formatearPrecio(null), '');
});

test('texto de precio: fijo, desde y pregunta por precio', () => {
  assert.equal(textoPrecio({ tipoPrecio: 'fijo', precio: 650 }), '$650');
  assert.equal(textoPrecio({ tipoPrecio: 'desde', precio: 450 }), 'Desde $450');
  assert.equal(textoPrecio({ tipoPrecio: 'consultar', precio: 450 }), 'Pregunta por precio');
  assert.equal(textoPrecio({ tipoPrecio: 'fijo', precio: null }), 'Pregunta por precio');
});

test('teléfono de WhatsApp en formato internacional', () => {
  assert.equal(telefonoWhatsApp('712 231 9080'), '527122319080');
  assert.equal(telefonoWhatsApp('+52 1 712 231 9080'), '527122319080');
  assert.equal(telefonoWhatsApp('527122319080'), '527122319080');
  assert.equal(telefonoWhatsApp(''), '');
});

test('mensaje de "Lo quiero" con nombre y precio, codificado en el enlace', () => {
  const p = datos.productos.find((x) => x.id === 'p2');
  const msg = mensajeProducto(p, datos.config);
  assert.equal(msg, '¡Hola Decorarte! Lo quiero: *Desayuno sorpresa* (Desde $450). ¿Está disponible? Lo vi en su catálogo.');
  const url = new URL(enlaceWhatsApp(datos.config.whatsapp, msg));
  assert.equal(url.origin, 'https://api.whatsapp.com');
  assert.equal(url.searchParams.get('phone'), '527122319080');
  assert.equal(url.searchParams.get('text'), msg); // acentos, signos y $ sobreviven ida y vuelta
});

test('mensaje sin precio cuando es "Pregunta por precio"', () => {
  const p = datos.productos.find((x) => x.id === 'p8');
  assert.equal(mensajeProducto(p, datos.config),
    '¡Hola Decorarte! Lo quiero: *Marco con foto personalizado*. ¿Está disponible? Lo vi en su catálogo.');
});

test('mensaje de cotización con y sin paquete', () => {
  const s = datos.productos.find((x) => x.id === 's1');
  const k = datos.paquetes.find((x) => x.id === 'k3');
  assert.match(mensajeCotizacion(s, k, datos.config), /\*Mesa de charcutería\*, paquete \*Gran evento\* \(Desde \$4,800\)/);
  assert.match(mensajeCotizacion(s, null, datos.config), /cotizar \*Mesa de charcutería\*\. Mi evento/);
});

test('número de cotizaciones: usa el de servicios solo si existe', () => {
  assert.equal(numeroPara('servicios', { whatsapp: '1', whatsappServicios: '' }), '1');
  assert.equal(numeroPara('servicios', { whatsapp: '1', whatsappServicios: '7121112233' }), '7121112233');
  assert.equal(numeroPara('productos', { whatsapp: '1', whatsappServicios: '7121112233' }), '1');
});

test('url de foto: ruta local, URL, ID de Drive o vacío', () => {
  assert.equal(urlFoto('img/demo/oso.svg'), 'img/demo/oso.svg');
  assert.equal(urlFoto('https://x.com/a.jpg'), 'https://x.com/a.jpg');
  assert.equal(urlFoto('1AbCdEfGhIjKlMnOpQrStUvWxYz012345', 400),
    'https://lh3.googleusercontent.com/d/1AbCdEfGhIjKlMnOpQrStUvWxYz012345=w400');
  assert.equal(urlFoto(''), '');
  assert.equal(urlFoto('basura'), '');
});

test('datos de demostración: 8 regalos y 1 servicio con 3 paquetes', () => {
  const regalos = datos.productos.filter((p) => p.categoria === 'regalos');
  const servicios = datos.productos.filter((p) => p.categoria === 'servicios');
  assert.equal(regalos.length, 8);
  assert.equal(servicios.length, 1);
  assert.equal(paquetesDeServicio(datos, servicios[0].id).length, 3);
  const ocasionesValidas = new Set(datos.config.ocasiones.map((o) => o.id));
  for (const p of datos.productos) {
    for (const o of p.ocasiones) assert.ok(ocasionesValidas.has(o), `${p.id}: ocasión desconocida ${o}`);
    assert.ok(datos.config.categorias.some((c) => c.id === p.categoria), `${p.id}: categoría desconocida`);
  }
  assert.ok(new Set(regalos.flatMap((p) => p.ocasiones)).size >= 5, 'la demo cubre varias ocasiones');
});

test('normaliza datos como llegan de la hoja (texto, sí/no, listas con comas)', () => {
  const d = normalizarDatos({
    config: { categorias: 'Regalos, Servicios', ocasiones: 'Baby shower, Día del Padre' },
    productos: [
      { id: 'a', nombre: 'Uno', categoria: 'regalos', ocasiones: 'baby-shower, dia-del-padre', precio: '$1,500', tipoPrecio: 'desde', disponible: 'sí', destacado: 'TRUE', orden: '2' },
      { id: 'b', nombre: 'Oculto', categoria: 'regalos', disponible: 'no' },
      { id: 'c', nombre: 'Sin precio', categoria: 'regalos', orden: 1 },
      { id: '', nombre: 'Sin id' },
    ],
  });
  assert.deepEqual(d.config.categorias.map((c) => c.id), ['regalos', 'servicios']);
  assert.deepEqual(d.config.ocasiones.map((o) => o.id), ['baby-shower', 'dia-del-padre']);
  assert.deepEqual(ids(d.productos), ['c', 'a']); // ordenados y sin ocultos
  assert.deepEqual(d.productos[1].ocasiones, ['baby-shower', 'dia-del-padre']);
  assert.equal(d.productos[1].precio, 1500);
  assert.equal(d.productos[1].destacado, true);
  assert.equal(d.productos[0].tipoPrecio, 'consultar');
});

test('filtra por categoría', () => {
  assert.equal(filtrarProductos(datos, { categoria: 'regalos' }).length, 8);
  assert.deepEqual(ids(filtrarProductos(datos, { categoria: 'servicios' })), ['s1']);
});

test('un producto aparece en todas sus ocasiones', () => {
  for (const o of ['10-de-mayo', 'aniversario', 'dia-del-padre', 'san-valentin']) {
    assert.ok(ids(filtrarProductos(datos, { categoria: 'regalos', ocasion: o })).includes('p2'), o);
  }
  assert.deepEqual(ids(filtrarProductos(datos, { categoria: 'regalos', ocasion: 'baby-shower' })), ['p4', 'p5']);
  assert.deepEqual(ids(filtrarProductos(datos, { categoria: 'regalos', ocasion: 'dia-del-padre' })), ['p2', 'p6']);
});

test('búsqueda sin acentos, por varias palabras, por ocasión y por paquetes', () => {
  assert.deepEqual(ids(filtrarProductos(datos, { categoria: 'regalos', busqueda: 'PAÑALES' })), ['p5']);
  assert.deepEqual(ids(filtrarProductos(datos, { busqueda: 'panales' })), ['p5']);
  assert.deepEqual(ids(filtrarProductos(datos, { busqueda: 'caja graduacion' })), ['p7']);
  assert.ok(ids(filtrarProductos(datos, { busqueda: 'dia del padre' })).includes('p6'));
  // busca en todas las categorías aunque estés en "Regalos", e incluye el texto de los paquetes
  assert.deepEqual(ids(filtrarProductos(datos, { categoria: 'regalos', busqueda: '25 personas' })), ['s1']);
  assert.deepEqual(filtrarProductos(datos, { busqueda: 'zzz' }), []);
});

test('temporada: destacados de la ocasión configurada', () => {
  assert.deepEqual(ids(productosTemporada(datos)), ['p1', 'p2', 'p3']);
  const sinTemporada = { ...datos, config: { ...datos.config, temporada: '' } };
  assert.deepEqual(productosTemporada(sinTemporada), []);
  const papa = { ...datos, config: { ...datos.config, temporada: 'dia-del-padre' } };
  assert.deepEqual(ids(productosTemporada(papa)), ['p2']);
});

test('solo muestra filtros de ocasiones que tienen productos', () => {
  const d = { ...datos, config: { ...datos.config, ocasiones: [...datos.config.ocasiones, { id: 'xv', nombre: 'XV años' }] } };
  const lista = ocasionesConProductos(d, 'regalos').map((o) => o.id);
  assert.ok(!lista.includes('xv'));
  assert.equal(lista.length, 6);
});
