// Pruebas de apps-script/Codigo.gs con un simulador de la hoja, Drive (drive.file) y caché.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { cargarCodigo, conEjemplos, DEMO, IMPLEMENTACION_REAL } from '../simulador/cargar.js';
import { normalizarDatos, filtrarProductos, productosTemporada } from '../../js/logica.js';

const plano = (x) => JSON.parse(JSON.stringify(x)); // objetos del otro contexto de vm -> objetos normales
const ids = (lista) => plano(lista.map((p) => p.id));
const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]).toString('base64');
const FUNCIONES_PANEL = [
  ['panelCargar'], ['panelGuardarProducto', { nombre: 'X', categoria: 'regalos', tipoPrecio: 'consultar' }],
  ['panelSubirFotoProducto', 'p1', jpeg, 'image/jpeg', 'x'], ['panelCambiarProducto', 'p1', 'disponible', false],
  ['panelMoverProducto', 'p1', 1], ['panelEliminarProducto', 'p1'], ['panelGuardarPaquete', {}],
  ['panelCambiarPaquete', 'k1', 'disponible', false], ['panelMoverPaquete', 'k1', 1], ['panelEliminarPaquete', 'k1'],
  ['panelGuardarConfig', { whatsapp: '7120000000' }],
];

describe('instalación', () => {
  test('crea pestañas, encabezados, configuración y carpeta de fotos', () => {
    const gs = cargarCodigo();
    gs.enEditor((g) => g.instalar());
    const libro = gs.__simulador.libro;
    assert.deepEqual(plano(libro.getSheets().map((h) => h.getName())), ['Productos', 'Paquetes', 'Configuración']);
    assert.equal(libro.getSheetByName('Productos').getRange(1, 1, 1, 3).getValues()[0].join(','), 'ID,Nombre,Descripción');
    const config = gs.leerConfigCruda_();
    assert.equal(config.whatsapp, '527122319080');
    assert.equal(config.autorizados, 'duena@gmail.com');
    const carpeta = gs.__simulador.archivos[config.carpetaFotos];
    assert.equal(carpeta.tipo, 'application/vnd.google-apps.folder');
    assert.equal(carpeta.compartido, false, 'la carpeta no se comparte; solo cada foto');
    assert.match(gs.__simulador.estado.ultimoAviso, /Listo/, 'avisa con toast, sin alertas que bloqueen');
  });

  test('repetirla no duplica pestañas, renglones, carpetas ni ejemplos', () => {
    const gs = conEjemplos();
    const libro = gs.__simulador.libro;
    const antes = plano({
      config: libro.getSheetByName('Configuración')._filas, productos: libro.getSheetByName('Productos').getLastRow(),
      paquetes: libro.getSheetByName('Paquetes').getLastRow(), archivos: Object.keys(gs.__simulador.archivos).length,
    });
    gs.enEditor((g) => { g.instalar(); g.instalar(); g.cargarEjemplos(); });
    assert.equal(libro.getSheets().length, 3);
    assert.deepEqual(plano(libro.getSheetByName('Configuración')._filas), antes.config);
    assert.equal(libro.getSheetByName('Productos').getLastRow(), antes.productos);
    assert.equal(libro.getSheetByName('Paquetes').getLastRow(), antes.paquetes);
    assert.equal(Object.keys(gs.__simulador.archivos).length, antes.archivos);
    assert.match(gs.__simulador.estado.ultimoAviso, /ya estaban cargados/);
  });

  test('si se corta a medias, volver a ejecutarla continúa donde se quedó', () => {
    const gs = cargarCodigo();
    const { estado, libro, archivos } = gs.__simulador;
    estado.fallas.crearCarpeta = 1; // se corta justo al crear la carpeta
    assert.throws(() => gs.enEditor((g) => g.instalar()), /Falla simulada/);
    assert.ok(libro.getSheetByName('Configuración'), 'lo anterior al corte ya quedó');
    gs.enEditor((g) => g.instalar());
    const carpetas = Object.values(archivos).filter((a) => a.tipo === 'application/vnd.google-apps.folder');
    assert.equal(carpetas.length, 1);
    assert.equal(gs.leerConfigCruda_().carpetaFotos, carpetas[0].id);
    assert.equal(libro.getSheetByName('Configuración').getLastRow(), 1 + 16);
  });

  test('si la carpeta se creó pero no se anotó, la encuentra en vez de crear otra', () => {
    const gs = cargarCodigo();
    gs.enEditor((g) => g.instalar());
    const primera = gs.leerConfigCruda_().carpetaFotos;
    gs.guardarClavesConfig_({ carpetaFotos: '' });
    gs.__simulador.propiedadesUsuario['duena@gmail.com'] = {};
    gs.enEditor((g) => g.instalar());
    assert.equal(gs.leerConfigCruda_().carpetaFotos, primera);
  });

  test('cargarEjemplos cortado entre productos y paquetes: al repetir agrega solo lo que falta', () => {
    const gs = cargarCodigo();
    gs.enEditor((g) => g.instalar());
    gs.escribirFilas_('Productos', DEMO.productos.slice(0, 4)); // quedó a medias
    gs.enEditor((g) => g.cargarEjemplos());
    assert.equal(gs.panelCargar().productos.length, 9);
    assert.equal(gs.panelCargar().paquetes.length, 3);
  });

  test('los ejemplos de Ejemplos.gs son los mismos de datos/demo.json', () => {
    const gs = cargarCodigo();
    const ejemplos = plano(gs.evaluar('EJEMPLOS'));
    assert.deepEqual(ejemplos.productos, DEMO.productos);
    assert.deepEqual(ejemplos.paquetes, DEMO.paquetes);
  });

  test('instalar, cargarEjemplos y publicarCambios: solo la dueña', () => {
    const gs = conEjemplos();
    for (const fn of ['instalar', 'cargarEjemplos', 'publicarCambios']) {
      gs.comoUsuario('ayudante@gmail.com');
      assert.throws(() => gs[fn](), /Solo la dueña/, `${fn} con otra cuenta`);
      gs.comoUsuario('');
      assert.throws(() => gs[fn](), /Solo la dueña/, `${fn} sin sesión`);
    }
    // Aunque la ayudante esté autorizada para el panel, no puede ejecutarlas
    gs.comoUsuario('duena@gmail.com');
    gs.panelGuardarConfig({ autorizados: ['ayudante@gmail.com'] });
    gs.comoUsuario('ayudante@gmail.com');
    assert.doesNotThrow(() => gs.panelCargar());
    assert.throws(() => gs.publicarCambios(), /Solo la dueña/);
    // Ni desde la implementación API con la sesión de alguien más
    assert.throws(() => gs.enApi((api) => api.instalar(), { sesion: 'otra@gmail.com' }), /Solo la dueña/);
  });
});

describe('implementación API: solo JSON', () => {
  test('el valor por defecto de Implementacion.gs es el más cerrado (api)', () => {
    assert.match(IMPLEMENTACION_REAL, /^const IMPLEMENTACION = 'api';$/m);
  });

  for (const [desc, impl] of [['api', 'api'], ['el archivo real', 'real'], ['falta la constante', null],
    ['"Panel" con mayúscula', 'Panel'], ['"panel " con espacio', 'panel '], ['vacía', '']]) {
    test(`con ${desc}: doGet siempre responde JSON, con o sin ?api y con o sin sesión`, () => {
      const gs = cargarCodigo({ implementacion: impl, ejecutaComo: 'propietario' });
      gs.enEditor(() => gs.apiGs.instalar());
      for (const sesion of ['', 'duena@gmail.com', 'otra@gmail.com']) {
        gs.comoUsuario(sesion);
        for (const parametros of [{}, { api: '' }, { panel: '' }]) {
          const r = gs.doGet({ parameter: parametros });
          assert.equal(r.esHtml, false, `sesión "${sesion}", ${JSON.stringify(parametros)}`);
          assert.equal(r.tipo, 'application/json');
          assert.ok(Array.isArray(JSON.parse(r.getContent()).productos));
        }
      }
    });
  }

  test('las funciones del panel se niegan en la API, con sesión de la dueña y sin sesión', () => {
    const gs = conEjemplos();
    const antes = JSON.stringify(gs.api());
    for (const sesion of ['', 'duena@gmail.com']) {
      for (const [fn, ...args] of FUNCIONES_PANEL) {
        assert.throws(() => gs.enApi((api) => api[fn](...args), { sesion }), /no está disponible/, `${fn} (sesión "${sesion}")`);
      }
    }
    assert.equal(JSON.stringify(gs.api()), antes, 'nada cambió');
    assert.equal(Object.values(gs.__simulador.archivos).filter((a) => a.tipo === 'image/jpeg').length, 0, 'no se subió ninguna foto');
  });

  test('onEdit no se puede disparar desde fuera con un objeto inventado', () => {
    const gs = conEjemplos();
    const version = gs.versionDatos_();
    gs.enApi((api) => api.onEdit({ range: { getSheet: 'no es función' } }));
    gs.enApi((api) => api.onEdit());
    assert.equal(gs.versionDatos_(), version);
    gs.onEdit({ range: { getSheet() {} } }); // una edición real sí cuenta
    assert.notEqual(gs.versionDatos_(), version);
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
  });

  test('la API no publica datos privados ni productos ocultos', () => {
    const gs = conEjemplos();
    gs.panelGuardarConfig({ autorizados: ['ayudante@gmail.com'] });
    gs.panelCambiarProducto('p3', 'disponible', false);
    gs.panelCambiarProducto('s1', 'disponible', false);
    const json = gs.api();
    assert.deepEqual(Object.keys(json).sort(), ['actualizado', 'config', 'paquetes', 'productos', 'version']);
    assert.ok(!('autorizados' in json.config));
    assert.ok(!('carpetaFotos' in json.config));
    assert.ok(!/@gmail\.com/.test(JSON.stringify(json)), 'ningún correo');
    assert.ok(!ids(json.productos).includes('p3'));
    assert.ok(!ids(json.productos).includes('s1'));
    assert.equal(json.paquetes.length, 0, 'paquetes de un servicio oculto tampoco se publican');
    for (const p of json.productos) assert.ok(!('actualizado' in p));
  });
});

describe('implementación Panel', () => {
  test('solo entran los correos autorizados', () => {
    const gs = conEjemplos();
    gs.comoUsuario('intruso@gmail.com');
    for (const [fn, ...args] of FUNCIONES_PANEL) assert.throws(() => gs[fn](...args), /permiso/, fn);
    assert.match(gs.doGet({ parameter: {} }).getContent(), /no está autorizado/);
    gs.comoUsuario('');
    assert.match(gs.doGet({ parameter: {} }).getContent(), /Entra con tu cuenta/);
    gs.comoUsuario('duena@gmail.com');
    assert.equal(gs.panelCargar().productos.length, 9);
    assert.equal(gs.doGet({ parameter: {} }).getContent(), '[plantilla Panel]');
    assert.equal(gs.doGet({ parameter: { api: '' } }).getContent(), '[plantilla Panel]', 'el panel no sirve el JSON');
  });
});

describe('caché: los cambios se ven al momento', () => {
  test('cada cambio guardado deja lista la caché nueva', () => {
    const gs = conEjemplos();
    assert.equal(gs.api().productos.find((p) => p.id === 'p1').precio, 650);
    const p = plano(gs.panelCargar().productos.find((x) => x.id === 'p1'));
    gs.panelGuardarProducto({ ...p, precio: 700 });
    // La API responde desde caché, sin leer la hoja: lo comprobamos rompiendo la hoja
    const hoja = gs.__simulador.libro.getSheetByName('Productos');
    const respaldo = hoja._filas[1][1];
    hoja._filas[1][1] = 'Cambiado a mano sin avisar';
    assert.equal(gs.api().productos.find((x) => x.id === 'p1').precio, 700);
    assert.equal(gs.api().productos[0].nombre, respaldo, 'servido desde caché');
    gs.onEdit({ range: { getSheet() {} } }); // editar la hoja a mano invalida la caché
    assert.equal(gs.api().productos[0].nombre, 'Cambiado a mano sin avisar');
  });

  test('una ocasión nueva aparece en la API en cuanto se guarda', () => {
    const gs = conEjemplos();
    gs.api();
    const c = plano(gs.panelCargar().config);
    gs.panelGuardarConfig({ ocasiones: [...c.ocasiones, { emoji: '🎄', nombre: 'Navidad' }] });
    assert.equal(gs.api().config.ocasiones.at(-1).id, 'navidad');
  });

  test('una lectura que empezó antes de un cambio no deja datos viejos en caché', () => {
    const gs = conEjemplos();
    // La API empieza a construir con la versión vieja…
    const version = gs.apiGs.versionDatos_();
    const viejo = JSON.stringify(gs.enApi((api) => api.construirPublico_()));
    // …mientras tanto la dueña guarda un cambio…
    gs.panelCambiarProducto('p1', 'disponible', false);
    // …y la API, al terminar, solo guarda si la versión no cambió (así lo hace jsonPublicoConCache_)
    if (gs.apiGs.versionDatos_() === version) gs.apiGs.guardarCacheJson_(version, viejo);
    assert.ok(!ids(gs.api().productos).includes('p1'));
  });
});

describe('productos y paquetes', () => {
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
    gs.panelMoverProducto('p1', -1);
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

  test('ajustes: WhatsApp, listas, temporada y accesos', () => {
    const gs = conEjemplos();
    gs.panelGuardarConfig({ whatsapp: '712 111 2233', whatsappServicios: '' });
    const c0 = gs.leerConfigCruda_();
    assert.equal(c0.whatsapp, '527121112233');
    assert.throws(() => gs.panelGuardarConfig({ whatsapp: '123' }), /10 dígitos/);
    assert.throws(() => gs.panelGuardarConfig({ whatsapp: '' }), /vacío/);

    gs.panelGuardarConfig({ ocasiones: [{ id: 'baby-shower', emoji: '🍼', nombre: 'Baby shower' }, { emoji: '👑', nombre: 'XV años' }] });
    const c = plano(gs.panelCargar().config);
    assert.deepEqual(c.ocasiones.map((o) => o.id), ['baby-shower', 'xv-anos']);
    assert.equal(c.temporada, '', 'si la ocasión de temporada ya no existe, se quita');

    gs.panelGuardarConfig({ autorizados: ['Ayudante@Gmail.com'] });
    assert.deepEqual(plano(gs.panelCargar().config.autorizados), ['duena@gmail.com', 'ayudante@gmail.com']);
    assert.throws(() => gs.panelGuardarConfig({ autorizados: ['no-es-correo'] }), /correo/);
    assert.throws(() => gs.panelGuardarConfig({ categorias: [] }), /al menos una/);
  });
});

describe('fotos (drive.file)', () => {
  test('se suben a la carpeta de la dueña, compartidas, y se asignan en la misma llamada', () => {
    const gs = conEjemplos();
    const r = plano(gs.panelSubirFotoProducto('p1', jpeg, 'image/jpeg', 'Caja de rosas'));
    const archivo = gs.__simulador.archivos[r.fotoId];
    assert.ok(archivo.compartido, 'visible con el enlace para que el catálogo la muestre');
    assert.equal(archivo.carpeta, gs.leerConfigCruda_().carpetaFotos);
    assert.equal(archivo.dueno, 'duena@gmail.com');
    assert.match(archivo.nombre, /^caja-de-rosas-.*\.jpg$/);
    assert.equal(r.productos.find((p) => p.id === 'p1').foto, r.fotoId);
    assert.equal(gs.api().productos.find((x) => x.id === 'p1').foto, r.fotoId);
    assert.throws(() => gs.panelSubirFotoProducto('p1', jpeg, 'application/pdf', 'x'), /imagen/);
  });

  test('guardar el producto no toca la foto salvo que se pida', () => {
    const gs = conEjemplos();
    const { fotoId } = plano(gs.panelSubirFotoProducto('p1', jpeg, 'image/jpeg', 'x'));
    const p = plano(gs.panelCargar().productos.find((x) => x.id === 'p1'));
    // El formulario estaba abierto con la foto vieja mientras la nueva se subía
    gs.panelGuardarProducto({ ...p, foto: 'img/demo/rosas.svg', precio: 999 });
    assert.equal(gs.panelCargar().productos.find((x) => x.id === 'p1').foto, fotoId);
    gs.panelGuardarProducto({ ...p, cambiarFoto: true, foto: '' }); // "Quitar la foto"
    assert.equal(gs.panelCargar().productos.find((x) => x.id === 'p1').foto, '');
    assert.equal(gs.__simulador.archivos[fotoId].enPapelera, true);
  });

  test('la foto reemplazada va a la papelera; si el producto ya no existe, la nueva también', () => {
    const gs = conEjemplos();
    const { fotoId: f1 } = plano(gs.panelSubirFotoProducto('p2', jpeg, 'image/jpeg', 'x'));
    const { fotoId: f2 } = plano(gs.panelSubirFotoProducto('p2', jpeg, 'image/jpeg', 'x'));
    assert.equal(gs.__simulador.archivos[f1].enPapelera, true);
    gs.panelEliminarProducto('p2');
    assert.equal(gs.__simulador.archivos[f2].enPapelera, true);
    const antes = Object.keys(gs.__simulador.archivos);
    assert.throws(() => gs.panelSubirFotoProducto('p2', jpeg, 'image/jpeg', 'x'), /ya no existe/);
    const nuevo = Object.keys(gs.__simulador.archivos).find((k) => !antes.includes(k));
    assert.equal(gs.__simulador.archivos[nuevo].enPapelera, true);
  });

  test('otra cuenta autorizada sube sus fotos a una carpeta en SU Drive (drive.file)', () => {
    const gs = conEjemplos();
    gs.panelGuardarConfig({ autorizados: ['ayudante@gmail.com'] });
    gs.comoUsuario('ayudante@gmail.com');
    const { fotoId } = plano(gs.panelSubirFotoProducto('p1', jpeg, 'image/jpeg', 'x'));
    const archivo = gs.__simulador.archivos[fotoId];
    assert.equal(archivo.dueno, 'ayudante@gmail.com');
    assert.notEqual(archivo.carpeta, gs.leerConfigCruda_().carpetaFotos, 'no puede escribir en la carpeta de la dueña');
    assert.equal(gs.__simulador.archivos[archivo.carpeta].dueno, 'ayudante@gmail.com');
    assert.equal(gs.api().productos.find((x) => x.id === 'p1').foto, fotoId, 'el catálogo la muestra igual');
    gs.panelSubirFotoProducto('p3', jpeg, 'image/jpeg', 'x');
    const carpetasAyudante = Object.values(gs.__simulador.archivos)
      .filter((a) => a.dueno === 'ayudante@gmail.com' && a.tipo === 'application/vnd.google-apps.folder');
    assert.equal(carpetasAyudante.length, 1, 'reutiliza su carpeta');
  });
});
