// Pruebas de apps-script/Codigo.gs con un simulador de la hoja, Drive y caché.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cargarCodigo, conEjemplos, DEMO } from '../simulador/cargar.js';
import { normalizarDatos, filtrarProductos, productosTemporada } from '../../js/logica.js';

const plano = (x) => JSON.parse(JSON.stringify(x)); // objetos del otro contexto de vm -> objetos normales
const ids = (lista) => plano(lista.map((p) => p.id));

test('instalar crea pestañas, encabezados, configuración y carpeta de fotos', () => {
  const gs = cargarCodigo();
  gs.instalar();
  const libro = gs.__simulador.libro;
  assert.deepEqual(plano(libro.getSheets().map((h) => h.getName())), ['Productos', 'Paquetes', 'Configuración']);
  assert.equal(libro.getSheetByName('Productos').getRange(1, 1, 1, 3).getValues()[0].join(','), 'ID,Nombre,Descripción');
  const config = gs.leerConfigCruda_();
  assert.equal(config.whatsapp, '527122319080');
  assert.equal(config.autorizados, 'duena@gmail.com');
  assert.ok(gs.__simulador.carpetas[config.carpetaFotos], 'creó la carpeta de fotos');
  // Ejecutarlo otra vez no duplica nada
  gs.instalar();
  assert.equal(libro.getSheetByName('Configuración').getLastRow(), 1 + 16);
});

test('la API publica los datos con el mismo formato que la demo', () => {
  const gs = conEjemplos();
  const datos = normalizarDatos(gs.api());
  assert.equal(filtrarProductos(datos, { categoria: 'regalos' }).length, 8);
  assert.deepEqual(ids(filtrarProductos(datos, { categoria: 'servicios' })), ['s1']);
  assert.equal(datos.paquetes.length, 3);
  assert.deepEqual(ids(productosTemporada(datos)), ['p1', 'p2', 'p3']);
  assert.deepEqual(datos.productos.find((p) => p.id === 'p2').ocasiones, DEMO.productos[1].ocasiones);
  assert.deepEqual(datos.paquetes[0].incluye, DEMO.paquetes[0].incluye);
  assert.equal(datos.config.ocasiones.find((o) => o.id === 'san-valentin').nombre, 'San Valentín');
});

test('la API no publica datos privados ni productos ocultos', () => {
  const gs = conEjemplos();
  gs.panelCambiarProducto('p3', 'disponible', false);
  gs.panelCambiarProducto('s1', 'disponible', false);
  const json = gs.api();
  assert.ok(!('autorizados' in json.config));
  assert.ok(!('carpetaFotos' in json.config));
  assert.ok(!JSON.stringify(json).includes('duena@gmail.com'));
  assert.ok(!ids(json.productos).includes('p3'));
  assert.ok(!ids(json.productos).includes('s1'));
  assert.equal(json.paquetes.length, 0, 'paquetes de un servicio oculto tampoco se publican');
});

test('la API usa caché y se actualiza en cuanto se guarda un cambio', () => {
  const gs = conEjemplos();
  assert.equal(gs.api().productos.find((p) => p.id === 'p1').precio, 650);
  assert.ok(gs.__simulador.memoriaCache['catalogo-v1:n'], 'guardó en caché');
  // Un cambio por fuera (sin invalidar) no se ve: confirma que sí se sirve desde la caché
  const hoja = gs.__simulador.libro.getSheetByName('Productos');
  hoja._filas[1][1] = 'Cambiado a mano';
  assert.equal(gs.api().productos[0].nombre, 'Caja de rosas eternas');
  gs.onEdit(); // editar la hoja a mano borra la caché
  assert.equal(gs.api().productos[0].nombre, 'Cambiado a mano');
  // Guardar desde el panel también
  const p = plano(gs.panelCargar().productos.find((x) => x.id === 'p1'));
  gs.panelGuardarProducto({ ...p, precio: 700 });
  assert.equal(gs.api().productos.find((x) => x.id === 'p1').precio, 700);
});

test('solo entran los correos autorizados', () => {
  const gs = conEjemplos();
  gs.comoUsuario('intruso@gmail.com');
  assert.throws(() => gs.panelCargar(), /permiso/);
  assert.throws(() => gs.panelEliminarProducto('p1'), /permiso/);
  assert.throws(() => gs.panelSubirFoto('AAAA', 'image/jpeg', 'x'), /permiso/);
  assert.match(gs.doGet({ parameter: {} }).getContent(), /no está autorizado/);
  gs.comoUsuario('');
  assert.match(gs.doGet({ parameter: {} }).getContent(), /Entra con tu cuenta/);
  assert.ok(gs.api().productos.length > 0, 'la API pública sí responde sin sesión');
  gs.comoUsuario('DUENA@gmail.com'.toLowerCase());
  assert.equal(gs.panelCargar().productos.length, 9);
  assert.equal(gs.doGet({ parameter: {} }).getContent(), '[plantilla Panel]');
});

test('agregar y editar producto con varias ocasiones', () => {
  const gs = conEjemplos();
  const r = plano(gs.panelGuardarProducto({
    nombre: '  Taza mágica ', descripcion: 'Cambia de color', categoria: 'regalos',
    ocasiones: ['10-de-mayo', 'dia-del-padre', 'no-existe'], tipoPrecio: 'fijo', precio: '180', disponible: true, destacado: false,
  }));
  const nuevo = r.productos.find((p) => p.id === r.guardadoId);
  assert.equal(nuevo.nombre, 'Taza mágica');
  assert.deepEqual(nuevo.ocasiones, ['10-de-mayo', 'dia-del-padre']);
  assert.equal(nuevo.precio, 180);
  assert.equal(nuevo.orden, 9, 'queda al final de su categoría');

  gs.panelGuardarProducto({ ...nuevo, tipoPrecio: 'desde', precio: 150, destacado: true, posicion: 1 });
  const regalos = gs.panelCargar().productos.filter((p) => p.categoria === 'regalos');
  assert.equal(regalos[0].id, nuevo.id, 'se movió al primer lugar');
  assert.deepEqual(plano(regalos.map((p) => p.orden)), [1, 2, 3, 4, 5, 6, 7, 8, 9]);
  assert.equal(regalos[0].tipoPrecio, 'desde');
});

test('valida nombre, precio y categoría', () => {
  const gs = conEjemplos();
  const base = { nombre: 'X', categoria: 'regalos', ocasiones: [], tipoPrecio: 'fijo', precio: 100 };
  assert.throws(() => gs.panelGuardarProducto({ ...base, nombre: '  ' }), /nombre/);
  assert.throws(() => gs.panelGuardarProducto({ ...base, precio: '' }), /precio/);
  assert.throws(() => gs.panelGuardarProducto({ ...base, categoria: 'otra' }), /categoría/);
  assert.doesNotThrow(() => gs.panelGuardarProducto({ ...base, tipoPrecio: 'consultar', precio: '' }));
});

test('ocultar, destacar y reordenar', () => {
  const gs = conEjemplos();
  gs.panelCambiarProducto('p4', 'destacado', true);
  gs.panelCambiarProducto('p5', 'disponible', false);
  let d = plano(gs.panelCargar());
  assert.equal(d.productos.find((p) => p.id === 'p4').destacado, true);
  assert.equal(d.productos.find((p) => p.id === 'p5').disponible, false);
  assert.throws(() => gs.panelCambiarProducto('p4', 'nombre', 'x'), /no permitido/);

  gs.panelMoverProducto('p3', -1);
  d = plano(gs.panelCargar());
  assert.deepEqual(ids(d.productos.filter((p) => p.categoria === 'regalos')).slice(0, 3), ['p1', 'p3', 'p2']);
  gs.panelMoverProducto('p1', -1); // ya es el primero: no cambia
  assert.equal(gs.panelCargar().productos[0].id, 'p1');
});

test('eliminar un servicio borra también sus paquetes', () => {
  const gs = conEjemplos();
  gs.panelEliminarProducto('s1');
  const d = gs.panelCargar();
  assert.equal(d.productos.length, 8);
  assert.equal(d.paquetes.length, 0);
});

test('paquetes: agregar, ocultar, mover y eliminar', () => {
  const gs = conEjemplos();
  const r = plano(gs.panelGuardarPaquete({
    servicioId: 's1', nombre: 'Boda', descripcion: '', incluye: ['100 personas', '', 'Meseros '], tipoPrecio: 'consultar', precio: null,
  }));
  const k = r.paquetes.find((x) => x.id === r.guardadoId);
  assert.deepEqual(k.incluye, ['100 personas', 'Meseros']);
  assert.equal(k.orden, 4);
  gs.panelMoverPaquete(k.id, -1);
  assert.deepEqual(ids(gs.panelCargar().paquetes), ['k1', 'k2', k.id, 'k3']);
  gs.panelCambiarPaquete('k1', 'disponible', false);
  assert.ok(!ids(gs.api().paquetes).includes('k1'));
  gs.panelEliminarPaquete('k2');
  assert.deepEqual(ids(gs.panelCargar().paquetes), ['k1', k.id, 'k3']);
  assert.throws(() => gs.panelGuardarPaquete({ servicioId: 'nada', nombre: 'X', tipoPrecio: 'fijo', precio: 1 }), /servicio/);
});

test('fotos: se guardan en la carpeta, compartidas, y la anterior va a la papelera', () => {
  const gs = conEjemplos();
  const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]).toString('base64');
  const id1 = gs.panelSubirFoto(jpeg, 'image/jpeg', 'Caja de rosas');
  const archivo = gs.__simulador.archivos[id1];
  assert.ok(archivo.compartido, 'visible con el enlace para que el catálogo la muestre');
  assert.equal(archivo.carpeta, gs.leerConfigCruda_().carpetaFotos);
  assert.match(archivo.nombre, /^caja-de-rosas-.*\.jpg$/);
  assert.throws(() => gs.panelSubirFoto(jpeg, 'application/pdf', 'x'), /imagen/);

  const p = plano(gs.panelCargar().productos.find((x) => x.id === 'p1'));
  gs.panelGuardarProducto({ ...p, foto: id1 });
  assert.equal(gs.api().productos.find((x) => x.id === 'p1').foto, id1);

  const id2 = gs.panelSubirFoto(jpeg, 'image/jpeg', 'Caja de rosas');
  gs.panelGuardarProducto({ ...p, foto: id2 });
  assert.equal(gs.__simulador.archivos[id1].enPapelera, true, 'la foto reemplazada se manda a la papelera');

  gs.panelEliminarProducto('p1');
  assert.equal(gs.__simulador.archivos[id2].enPapelera, true);

  const sinUsar = gs.panelSubirFoto(jpeg, 'image/jpeg', 'x');
  gs.panelDescartarFoto(sinUsar);
  assert.equal(gs.__simulador.archivos[sinUsar].enPapelera, true);
});

test('ajustes: WhatsApp, listas, temporada y accesos', () => {
  const gs = conEjemplos();
  gs.panelGuardarConfig({ whatsapp: '712 111 2233', whatsappServicios: '' });
  let c = gs.leerConfigCruda_();
  assert.equal(c.whatsapp, '527121112233');
  assert.equal(c.whatsappServicios, '');
  assert.throws(() => gs.panelGuardarConfig({ whatsapp: '123' }), /10 dígitos/);
  assert.throws(() => gs.panelGuardarConfig({ whatsapp: '' }), /vacío/);

  gs.panelGuardarConfig({
    ocasiones: [{ id: 'baby-shower', emoji: '🍼', nombre: 'Baby shower' }, { emoji: '👑', nombre: 'XV años' }],
    temporada: 'san-valentin',
  });
  c = plano(gs.panelCargar().config);
  assert.deepEqual(c.ocasiones.map((o) => o.id), ['baby-shower', 'xv-anos']);
  assert.equal(c.temporada, '', 'si la ocasión de temporada ya no existe, se quita');

  gs.panelGuardarConfig({ autorizados: ['Ayudante@Gmail.com'] });
  assert.deepEqual(plano(gs.panelCargar().config.autorizados), ['duena@gmail.com', 'ayudante@gmail.com'], 'nadie se deja fuera a sí mismo');
  assert.throws(() => gs.panelGuardarConfig({ autorizados: ['no-es-correo'] }), /correo/);
  gs.comoUsuario('ayudante@gmail.com');
  assert.doesNotThrow(() => gs.panelCargar());

  assert.throws(() => gs.panelGuardarConfig({ categorias: [] }), /al menos una/);
});
