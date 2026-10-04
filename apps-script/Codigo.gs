/**
 * Decorarte · Panel de administración y datos del catálogo.
 * Google Apps Script ligado a la hoja de cálculo de la dueña.
 *
 * El mismo proyecto se publica dos veces (ver INSTALACION.md). Cada implementación queda fijada
 * a una versión del código donde Implementacion.gs dice qué es:
 *  - "API catálogo" (IMPLEMENTACION = 'api'): Ejecutar como YO · Acceso: Cualquier persona.
 *     Siempre responde el JSON público del catálogo. Nunca muestra páginas ni acepta cambios.
 *  - "Panel" (IMPLEMENTACION = 'panel'): Ejecutar como USUARIO QUE ACCEDE · Acceso: Cualquier
 *     usuario con cuenta de Google. Solo entran los correos de "autorizados" en Configuración.
 *
 * Permisos (appsscript.json): hojas de cálculo, drive.file (solo los archivos que crea esta app,
 * mediante el servicio avanzado de Drive) y el correo de quien entra.
 */

const HOJA_PRODUCTOS = 'Productos';
const HOJA_PAQUETES = 'Paquetes';
const HOJA_CONFIG = 'Configuración';
const URL_CATALOGO = 'https://tapqr-temascalcingo.github.io/decorarte-catalogo/';
const URL_LOGO = URL_CATALOGO + 'img/logo-192.png';
const NOMBRE_CARPETA = 'Decorarte Catálogo – Fotos';
const TIPO_CARPETA = 'application/vnd.google-apps.folder';
const CLAVE_CACHE = 'catalogo-v2';
const DURACION_CACHE = 21600; // 6 h, el máximo. Cada cambio guardado usa una clave nueva.
const TIPOS_PRECIO = ['fijo', 'desde', 'consultar'];

// Columnas de cada pestaña: clave interna -> encabezado que se ve en la hoja.
const COLUMNAS = {
  [HOJA_PRODUCTOS]: [
    ['id', 'ID'], ['nombre', 'Nombre'], ['descripcion', 'Descripción'], ['categoria', 'Categoría'],
    ['ocasiones', 'Ocasiones'], ['tipoPrecio', 'Tipo de precio'], ['precio', 'Precio'], ['foto', 'Foto'],
    ['disponible', 'Disponible'], ['destacado', 'Destacado'], ['orden', 'Orden'], ['actualizado', 'Actualizado'],
  ],
  [HOJA_PAQUETES]: [
    ['id', 'ID'], ['servicioId', 'Servicio (ID)'], ['nombre', 'Nombre'], ['descripcion', 'Descripción'],
    ['incluye', 'Incluye'], ['tipoPrecio', 'Tipo de precio'], ['precio', 'Precio'],
    ['disponible', 'Disponible'], ['orden', 'Orden'], ['actualizado', 'Actualizado'],
  ],
};

// Claves de Configuración que se publican en el catálogo. Las demás (autorizados, carpeta) son privadas.
const CONFIG_PUBLICA = [
  'negocio', 'lema', 'whatsapp', 'whatsappServicios', 'instagram', 'facebook', 'resenas',
  'direccion', 'mapsUrl', 'horario', 'categorias', 'ocasiones', 'temporada', 'temporadaTitulo',
];

const CONFIG_INICIAL = [
  ['negocio', 'Decorarte', 'Nombre del negocio'],
  ['lema', 'Regalos, decoración y eventos con amor', 'Frase bajo el logo'],
  ['whatsapp', '527122319080', 'Número para pedidos (52 + 10 dígitos)'],
  ['whatsappServicios', '', 'Opcional: otro número solo para cotizar servicios'],
  ['instagram', 'https://www.instagram.com/decorartetemas', ''],
  ['facebook', 'https://www.facebook.com/profile.php?id=100064143365816', ''],
  ['resenas', 'https://search.google.com/local/writereview?placeid=ChIJVQZ5CMX70oURISEiY5jII1g', 'Enlace para dejar reseña en Google'],
  ['direccion', 'Temascalcingo, Estado de México', ''],
  ['mapsUrl', '', 'Enlace de Google Maps (opcional)'],
  ['horario', '', 'Opcional, p. ej. "Lunes a sábado de 10 a 8"'],
  ['categorias', 'regalos | Regalos | productos\nservicios | Servicios | servicios', 'Una por renglón: id | nombre | tipo (productos o servicios)'],
  ['ocasiones', [
    'baby-shower | 🍼 | Baby shower', 'aniversario | 💍 | Aniversario', 'san-valentin | 💘 | San Valentín',
    '10-de-mayo | 🌷 | 10 de mayo', 'dia-del-padre | 👔 | Día del Padre', 'graduaciones | 🎓 | Graduaciones',
  ].join('\n'), 'Una por renglón: id | emoji | nombre'],
  ['temporada', '', 'ID de la ocasión destacada en el catálogo (vacío = sin sección de temporada)'],
  ['temporadaTitulo', '', 'Título de la sección de temporada (opcional)'],
  ['autorizados', '', 'Correos que pueden entrar al panel, uno por renglón'],
  ['carpetaFotos', '', 'ID de la carpeta de Drive con las fotos (no modificar)'],
];

/* =====================================================================
 *  Implementación: 'api' o 'panel'
 * ===================================================================== */

/** true solo si Implementacion.gs dice exactamente 'panel'. Si falta o dice otra cosa: modo API. */
function esPanel_() {
  try {
    return IMPLEMENTACION === 'panel'; // eslint-disable-line no-undef
  } catch (e) {
    return false;
  }
}

/* =====================================================================
 *  Entradas web
 * ===================================================================== */

function doGet() {
  // Implementación "API catálogo": siempre JSON, con o sin ?api, con o sin sesión. Nunca HTML.
  if (!esPanel_()) return respuestaApi_();

  const correo = correoActual_();
  if (!estaAutorizado_(correo)) return paginaSinAcceso_(correo);

  const plantilla = HtmlService.createTemplateFromFile('Panel');
  plantilla.correo = correo;
  plantilla.urlCatalogo = URL_CATALOGO;
  plantilla.urlLogo = URL_LOGO;
  return plantilla.evaluate()
    .setTitle('Decorarte · Panel')
    .setFaviconUrl(URL_LOGO)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover');
}

/** Para insertar archivos HTML dentro de otros: <?!= incluir_('PanelEstilos') ?> */
function incluir_(nombre) {
  return HtmlService.createHtmlOutputFromFile(nombre).getContent();
}

function respuestaApi_() {
  let texto;
  try {
    texto = jsonPublicoConCache_();
  } catch (err) {
    texto = JSON.stringify({ error: 'No se pudo leer el catálogo: ' + err.message });
  }
  return ContentService.createTextOutput(texto).setMimeType(ContentService.MimeType.JSON);
}

function paginaSinAcceso_(correo) {
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8">
    <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600&family=Poppins:wght@400;500&display=swap" rel="stylesheet">
    <style>body{font-family:Poppins,sans-serif;background:linear-gradient(160deg,#fffaf9,#faeaee);color:#4a3a40;
    display:grid;place-items:center;min-height:100vh;margin:0;padding:24px;text-align:center}
    img{width:120px;border-radius:50%}h1{font-family:'Playfair Display',serif;font-size:24px}
    p{font-size:17px;line-height:1.5;max-width:420px}.correo{overflow-wrap:anywhere}a{color:#c8457f;font-weight:500}</style></head><body><div>
    <img src="${URL_LOGO}" alt="Decorarte"><h1>Este panel es privado</h1>
    ${correo
      ? `<p>Entraste como <b class="correo">${escaparHtml_(correo)}</b>, y ese correo no está autorizado.</p>
         <p>Pide a la dueña que lo agregue en <b>Ajustes → Personas con acceso</b>, o cambia de cuenta de Google.</p>`
      : '<p>Entra con tu cuenta de Google autorizada para administrar el catálogo.</p>'}
    <p><a href="${URL_CATALOGO}">Ver el catálogo</a></p></div></body></html>`;
  return HtmlService.createHtmlOutput(html).setTitle('Decorarte · Panel')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/* =====================================================================
 *  Menú en la hoja e instalación
 * ===================================================================== */

function onOpen() {
  try {
    SpreadsheetApp.getUi().createMenu('Decorarte')
      .addItem('Preparar hoja (instalar)', 'instalar')
      .addItem('Cargar productos de ejemplo', 'cargarEjemplos')
      .addItem('Publicar cambios hechos a mano en la hoja', 'publicarCambios')
      .addToUi();
  } catch (e) { /* sin interfaz disponible: el menú es solo una comodidad */ }
}

/** Si alguien edita la hoja a mano, el catálogo se actualiza al momento. */
function onEdit(e) {
  // Solo para ediciones reales en la hoja: un objeto armado desde fuera no trae funciones.
  if (!e || !e.range || typeof e.range.getSheet !== 'function') return;
  nuevaVersionDatos_();
}

function publicarCambios() {
  verificarDuena_();
  refrescarCache_();
  avisar_('Listo: el catálogo ya muestra la información actual de la hoja.');
}

/**
 * Crea las pestañas, encabezados, configuración inicial y la carpeta de fotos.
 * Cada paso revisa lo que ya existe, así que si se corta a medias basta con ejecutarla otra vez:
 * continúa donde se quedó sin duplicar pestañas, renglones ni carpetas.
 */
function instalar() {
  verificarDuena_();
  const props = PropertiesService.getScriptProperties();
  const libro = libro_();
  if (!props.getProperty('propietario')) props.setProperty('propietario', correoActual_());
  props.setProperty('idHoja', libro.getId());
  registrar_('1/4 Pestañas');
  prepararPestanas_(libro);
  registrar_('2/4 Configuración');
  prepararConfig_(libro);
  registrar_('3/4 Carpeta de fotos');
  carpetaFotos_();
  registrar_('4/4 Publicar');
  const sobrante = libro.getSheetByName('Hoja 1') || libro.getSheetByName('Sheet1');
  if (sobrante && libro.getSheets().length > 1 && sobrante.getLastRow() === 0) libro.deleteSheet(sobrante);
  refrescarCache_();
  avisar_('Listo. La hoja está preparada. Sigue con el paso "Publicar" de la guía de instalación.');
}

function prepararPestanas_(libro) {
  [HOJA_PRODUCTOS, HOJA_PAQUETES].forEach((nombre) => {
    const hoja = libro.getSheetByName(nombre) || libro.insertSheet(nombre);
    const columnas = COLUMNAS[nombre];
    const ancho = Math.max(hoja.getLastColumn(), 1);
    const actuales = hoja.getRange(1, 1, 1, ancho).getValues()[0].map((t) => String(t).trim()).filter(Boolean);
    const faltan = columnas.filter((c) => actuales.indexOf(c[1]) < 0 && actuales.indexOf(c[0]) < 0).map((c) => c[1]);
    if (faltan.length) hoja.getRange(1, actuales.length + 1, 1, faltan.length).setValues([faltan]);
    hoja.setFrozenRows(1);
    hoja.getRange(1, 1, 1, actuales.length + faltan.length).setFontWeight('bold').setBackground('#f8d7e2');
    // Texto plano para que Sheets no convierta IDs ni listas en números o fechas.
    const claves = clavesDeHoja_(nombre);
    ['id', 'servicioId', 'ocasiones', 'foto', 'incluye', 'categoria'].forEach((clave) => {
      const i = claves.indexOf(clave);
      if (i >= 0) hoja.getRange(2, i + 1, hoja.getMaxRows() - 1, 1).setNumberFormat('@');
    });
  });
}

function prepararConfig_(libro) {
  const hoja = libro.getSheetByName(HOJA_CONFIG) || libro.insertSheet(HOJA_CONFIG);
  if (hoja.getLastRow() === 0) {
    hoja.getRange(1, 1, 1, 3).setValues([['Clave', 'Valor', 'Nota']]).setFontWeight('bold').setBackground('#f8d7e2');
    hoja.setFrozenRows(1);
  }
  hoja.getRange('B:B').setNumberFormat('@').setWrap(true);
  const existente = leerConfigCruda_();
  const faltantes = CONFIG_INICIAL.filter((fila) => !(fila[0] in existente));
  if (faltantes.length) hoja.getRange(hoja.getLastRow() + 1, 1, faltantes.length, 3).setValues(faltantes);
  if (!lineas_(leerConfigCruda_().autorizados).length) {
    guardarClavesConfig_({ autorizados: PropertiesService.getScriptProperties().getProperty('propietario') });
  }
}

/**
 * Agrega los productos y paquetes de ejemplo (Ejemplos.gs) que falten, comparando por ID.
 * Repetirla no duplica nada.
 */
function cargarEjemplos() {
  verificarDuena_();
  const ahora = new Date().toISOString();
  const conFecha = (o) => Object.assign({}, o, { actualizado: ahora });
  const idsProductos = leerTabla_(HOJA_PRODUCTOS).map((p) => p.id);
  const productos = EJEMPLOS.productos.filter((p) => idsProductos.indexOf(p.id) < 0); // eslint-disable-line no-undef
  escribirFilas_(HOJA_PRODUCTOS, productos.map(conFecha));
  const idsPaquetes = leerTabla_(HOJA_PAQUETES).map((k) => k.id);
  const paquetes = EJEMPLOS.paquetes.filter((k) => idsPaquetes.indexOf(k.id) < 0); // eslint-disable-line no-undef
  escribirFilas_(HOJA_PAQUETES, paquetes.map(conFecha));
  if (!leerConfigCruda_().temporada) {
    guardarClavesConfig_({ temporada: EJEMPLOS.temporada, temporadaTitulo: EJEMPLOS.temporadaTitulo }); // eslint-disable-line no-undef
  }
  refrescarCache_();
  avisar_(productos.length || paquetes.length
    ? `Se agregaron ${productos.length} productos y ${paquetes.length} paquetes de ejemplo.`
    : 'Los ejemplos ya estaban cargados; no se agregó nada.');
}

/** Aviso que no detiene la ejecución (una alerta esperaría a que alguien toque "Aceptar"). */
function avisar_(mensaje) {
  Logger.log(mensaje);
  try { SpreadsheetApp.getActiveSpreadsheet().toast(mensaje, 'Decorarte', 10); } catch (e) { /* sin hoja abierta */ }
}

function registrar_(paso) {
  Logger.log('Instalando: ' + paso);
}

/* =====================================================================
 *  Acceso
 * ===================================================================== */

function correoActual_() {
  return (Session.getActiveUser().getEmail() || '').trim().toLowerCase();
}

function propietario_() {
  return PropertiesService.getScriptProperties().getProperty('propietario') || '';
}

function estaAutorizado_(correo) {
  if (!correo) return false;
  const lista = lineas_(leerConfigCruda_().autorizados).map((c) => c.toLowerCase());
  if (!lista.length) return correo === propietario_();
  return lista.indexOf(correo) >= 0;
}

/** Funciones del panel: solo en la implementación "Panel" y solo para correos autorizados. */
function verificarAcceso_() {
  if (!esPanel_()) throw new Error('Esta función no está disponible aquí.');
  if (!estaAutorizado_(correoActual_())) throw new Error('No tienes permiso para hacer cambios.');
}

/**
 * instalar, cargarEjemplos y publicarCambios: solo la dueña (la cuenta que instaló).
 * La primera vez, antes de que exista "propietario", solo quien ejecuta el script con su propia cuenta.
 */
function verificarDuena_() {
  const correo = correoActual_();
  const duena = propietario_();
  const efectivo = (Session.getEffectiveUser().getEmail() || '').trim().toLowerCase();
  if (!correo || (duena ? correo !== duena : correo !== efectivo)) {
    throw new Error('Solo la dueña del catálogo puede ejecutar esta función.');
  }
}

/* =====================================================================
 *  Lectura de la hoja
 * ===================================================================== */

function libro_() {
  const activo = SpreadsheetApp.getActiveSpreadsheet();
  if (activo) return activo;
  const id = PropertiesService.getScriptProperties().getProperty('idHoja');
  if (!id) throw new Error('Falta ejecutar "instalar" desde el editor de Apps Script.');
  return SpreadsheetApp.openById(id);
}

function hoja_(nombre) {
  const h = libro_().getSheetByName(nombre);
  if (!h) throw new Error(`Falta la pestaña "${nombre}". Ejecuta "instalar".`);
  return h;
}

function lineas_(texto) {
  return String(texto == null ? '' : texto).split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
}

function crearId_(texto) {
  return String(texto == null ? '' : texto).normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

/** "id | emoji | nombre" por renglón -> [{id, emoji, nombre}] */
function parsearLista_(texto, campos) {
  return lineas_(texto).map((linea) => {
    const partes = linea.split('|').map((x) => x.trim());
    const obj = {};
    campos.forEach((campo, i) => { obj[campo] = partes[i] || ''; });
    if (partes.length === 1) { obj.id = ''; obj.nombre = partes[0]; }
    if (!obj.id) obj.id = crearId_(obj.nombre);
    return obj;
  }).filter((o) => o.id && o.nombre);
}

function listaATexto_(lista, campos) {
  return lista.map((o) => campos.map((c) => String(o[c] || '').replace(/[|\n]/g, ' ').trim()).join(' | ')).join('\n');
}

function leerConfigCruda_() {
  const h = libro_().getSheetByName(HOJA_CONFIG);
  const config = {};
  if (!h || h.getLastRow() < 2) return config;
  h.getRange(2, 1, h.getLastRow() - 1, 2).getValues().forEach((fila) => {
    const clave = String(fila[0]).trim();
    if (clave) config[clave] = String(fila[1] == null ? '' : fila[1]);
  });
  return config;
}

/** Configuración con las listas ya convertidas. */
function leerConfig_() {
  const c = leerConfigCruda_();
  return Object.assign({}, c, {
    categorias: parsearLista_(c.categorias, ['id', 'nombre', 'tipo']).map((cat) => ({
      id: cat.id, nombre: cat.nombre, tipo: cat.tipo === 'servicios' ? 'servicios' : 'productos',
    })),
    ocasiones: parsearLista_(c.ocasiones, ['id', 'emoji', 'nombre']),
    autorizados: lineas_(c.autorizados).map((x) => x.toLowerCase()),
  });
}

function configPublica_(config) {
  const pub = {};
  CONFIG_PUBLICA.forEach((clave) => { if (clave in config) pub[clave] = config[clave]; });
  return pub;
}

function aBooleano_(v, porDefecto) {
  if (v === '' || v == null) return porDefecto;
  if (typeof v === 'boolean') return v;
  return ['true', 'verdadero', 'si', 'sí', '1', 'x'].indexOf(String(v).trim().toLowerCase()) >= 0;
}

function aNumero_(v) {
  if (v === '' || v == null) return null;
  const n = typeof v === 'number' ? v : Number(String(v).replace(/[$,\s]/g, ''));
  return isFinite(n) ? n : null;
}

/** Convierte una fila de la hoja en objeto, según los encabezados. */
function filaAObjeto_(fila, claves) {
  const o = {};
  claves.forEach((clave, i) => { if (clave) o[clave] = fila[i]; });
  const r = {
    id: String(o.id == null ? '' : o.id).trim(),
    nombre: String(o.nombre == null ? '' : o.nombre).trim(),
    descripcion: String(o.descripcion == null ? '' : o.descripcion).trim(),
    tipoPrecio: TIPOS_PRECIO.indexOf(o.tipoPrecio) >= 0 ? o.tipoPrecio : 'fijo',
    precio: aNumero_(o.precio),
    disponible: aBooleano_(o.disponible, true),
    orden: aNumero_(o.orden),
    actualizado: o.actualizado instanceof Date ? o.actualizado.toISOString() : String(o.actualizado || ''),
  };
  if ('categoria' in o) {
    r.categoria = String(o.categoria || '').trim();
    r.ocasiones = String(o.ocasiones || '').split(',').map((x) => x.trim()).filter(Boolean);
    r.foto = String(o.foto || '').trim();
    r.destacado = aBooleano_(o.destacado, false);
  }
  if ('servicioId' in o) {
    r.servicioId = String(o.servicioId || '').trim();
    r.incluye = lineas_(o.incluye);
  }
  if (r.precio === null && r.tipoPrecio !== 'consultar') r.tipoPrecio = 'consultar';
  return r;
}

/** Convierte un objeto en fila, en el orden de los encabezados de la hoja. */
function objetoAFila_(obj, claves) {
  return claves.map((clave) => {
    const v = obj[clave];
    if (v == null) return '';
    if (clave === 'ocasiones') return [].concat(v).join(', ');
    if (clave === 'incluye') return [].concat(v).join('\n');
    return v;
  });
}

/** Claves internas en el orden de las columnas de la hoja (acepta columnas movidas). */
function clavesDeHoja_(nombre) {
  const h = hoja_(nombre);
  const columnas = COLUMNAS[nombre];
  const encabezados = h.getRange(1, 1, 1, Math.max(h.getLastColumn(), 1)).getValues()[0];
  return encabezados.map((t) => {
    const texto = String(t).trim();
    const col = columnas.find((c) => c[1] === texto || c[0] === texto);
    return col ? col[0] : '';
  });
}

/** Lee una pestaña: [{...objeto, _fila}] */
function leerTabla_(nombre) {
  const h = hoja_(nombre);
  const claves = clavesDeHoja_(nombre);
  if (h.getLastRow() < 2) return [];
  return h.getRange(2, 1, h.getLastRow() - 1, claves.length).getValues()
    .map((fila, i) => Object.assign(filaAObjeto_(fila, claves), { _fila: i + 2 }))
    .filter((o) => o.id);
}

function ordenar_(a, b) {
  const oa = a.orden == null ? Infinity : a.orden;
  const ob = b.orden == null ? Infinity : b.orden;
  return oa - ob || a.nombre.localeCompare(b.nombre, 'es');
}

function sinFila_(o) {
  const copia = Object.assign({}, o);
  delete copia._fila;
  return copia;
}

function leerTodo_() {
  return {
    config: leerConfig_(),
    productos: leerTabla_(HOJA_PRODUCTOS).sort(ordenar_).map(sinFila_),
    paquetes: leerTabla_(HOJA_PAQUETES).sort(ordenar_).map(sinFila_),
  };
}

/* =====================================================================
 *  Datos públicos (API del catálogo) con caché
 *
 *  La caché se guarda bajo una clave con la "versión de datos". Cada cambio guardado sube la
 *  versión y deja lista la caché nueva, así el siguiente cliente recibe los datos al momento.
 *  Una lectura que empezó antes de un cambio no puede sobrescribir la caché nueva.
 * ===================================================================== */

function construirPublico_() {
  const d = leerTodo_();
  const visibles = d.productos.filter((p) => p.disponible);
  const idsVisibles = {};
  visibles.forEach((p) => { idsVisibles[p.id] = true; });
  const limpiar = (o) => { const c = Object.assign({}, o); delete c.actualizado; return c; };
  return {
    version: 1,
    actualizado: new Date().toISOString(),
    config: configPublica_(d.config),
    productos: visibles.map(limpiar),
    paquetes: d.paquetes.filter((k) => k.disponible && idsVisibles[k.servicioId]).map(limpiar),
  };
}

function versionDatos_() {
  return PropertiesService.getScriptProperties().getProperty('versionDatos') || '0';
}

function nuevaVersionDatos_() {
  // Siempre mayor que la anterior, aunque dos cambios caigan en el mismo milisegundo.
  const v = String(Math.max(Date.now(), Number(versionDatos_()) + 1));
  PropertiesService.getScriptProperties().setProperty('versionDatos', v);
  return v;
}

function leerCacheJson_(version) {
  const cache = CacheService.getScriptCache();
  const base = CLAVE_CACHE + ':' + version;
  const partes = Number(cache.get(base + ':n') || 0);
  if (!partes) return null;
  const claves = [];
  for (let i = 0; i < partes; i++) claves.push(base + ':' + i);
  const valores = cache.getAll(claves);
  return claves.every((k) => k in valores) ? claves.map((k) => valores[k]).join('') : null;
}

function guardarCacheJson_(version, texto) {
  // Cada valor de CacheService admite ~100 KB: se guarda en pedazos.
  const base = CLAVE_CACHE + ':' + version;
  const TAM = 90000;
  const trozos = {};
  let n = 0;
  for (let i = 0; i < texto.length; i += TAM) trozos[base + ':' + n++] = texto.slice(i, i + TAM);
  trozos[base + ':n'] = String(n);
  try { CacheService.getScriptCache().putAll(trozos, DURACION_CACHE); } catch (e) { /* si no cabe, se sirve sin caché */ }
}

function jsonPublicoConCache_() {
  const version = versionDatos_();
  const guardado = leerCacheJson_(version);
  if (guardado) return guardado;
  const texto = JSON.stringify(construirPublico_());
  // Solo se guarda si nadie cambió los datos mientras se leían.
  if (versionDatos_() === version) guardarCacheJson_(version, texto);
  return texto;
}

/** Después de guardar: versión nueva y caché ya lista con los datos actuales. */
function refrescarCache_() {
  const version = nuevaVersionDatos_();
  guardarCacheJson_(version, JSON.stringify(construirPublico_()));
}

/* =====================================================================
 *  Escritura
 * ===================================================================== */

function conBloqueo_(fn) {
  const candado = LockService.getScriptLock();
  candado.waitLock(20000);
  try {
    const r = fn();
    SpreadsheetApp.flush();
    refrescarCache_();
    return r;
  } finally {
    candado.releaseLock();
  }
}

function escribirFilas_(nombre, objetos) {
  if (!objetos.length) return;
  const h = hoja_(nombre);
  const claves = clavesDeHoja_(nombre);
  h.getRange(h.getLastRow() + 1, 1, objetos.length, claves.length)
    .setValues(objetos.map((o) => objetoAFila_(o, claves)));
}

function actualizarFila_(nombre, fila, obj) {
  const claves = clavesDeHoja_(nombre);
  hoja_(nombre).getRange(fila, 1, 1, claves.length).setValues([objetoAFila_(obj, claves)]);
}

function escribirOrden_(nombre, lista) {
  const h = hoja_(nombre);
  const col = clavesDeHoja_(nombre).indexOf('orden') + 1;
  lista.forEach((o) => h.getRange(o._fila, col).setValue(o.orden));
}

function guardarClavesConfig_(valores) {
  const h = hoja_(HOJA_CONFIG);
  const filas = h.getLastRow() >= 2 ? h.getRange(2, 1, h.getLastRow() - 1, 1).getValues() : [];
  Object.keys(valores).forEach((clave) => {
    const i = filas.findIndex((f) => String(f[0]).trim() === clave);
    if (i >= 0) {
      h.getRange(i + 2, 2).setValue(valores[clave]);
    } else {
      h.appendRow([clave, valores[clave], '']);
      filas.push([clave]);
    }
  });
}

function nuevoId_(prefijo, existentes) {
  let id;
  do {
    id = prefijo + Utilities.getUuid().replace(/-/g, '').slice(0, 8);
  } while (existentes.some((o) => o.id === id));
  return id;
}

/**
 * Mueve un elemento a una posición (0 = primero) dentro de su grupo y renumera 1..n.
 * Devuelve solo los elementos cuyo orden cambió.
 */
function reordenar_(grupo, id, posicion) {
  const lista = grupo.slice().sort(ordenar_);
  const desde = lista.findIndex((o) => o.id === id);
  if (desde < 0) return [];
  const [item] = lista.splice(desde, 1);
  const hasta = Math.max(0, Math.min(lista.length, posicion));
  lista.splice(hasta, 0, item);
  const cambiados = [];
  lista.forEach((o, i) => {
    if (o.orden !== i + 1) { o.orden = i + 1; cambiados.push(o); }
  });
  return cambiados;
}

function validarItem_(item, config, esPaquete) {
  const errores = [];
  if (!String(item.nombre || '').trim()) errores.push('Escribe el nombre.');
  if (TIPOS_PRECIO.indexOf(item.tipoPrecio) < 0) errores.push('Elige el tipo de precio.');
  const precio = aNumero_(item.precio);
  if (item.tipoPrecio !== 'consultar' && (precio === null || precio < 0)) errores.push('Escribe un precio válido.');
  if (!esPaquete && !config.categorias.some((c) => c.id === item.categoria)) errores.push('Elige una categoría.');
  if (errores.length) throw new Error(errores.join(' '));
}

/* =====================================================================
 *  Fotos en Drive (servicio avanzado de Drive, permiso drive.file)
 *
 *  Con drive.file la app solo ve los archivos que ella misma creó con la cuenta de quien la usa.
 *  Por eso cada cuenta guarda sus fotos en su propia carpeta: la de la dueña queda registrada en
 *  Configuración; si otra cuenta autorizada sube fotos, van a una carpeta en el Drive de esa persona.
 * ===================================================================== */

function esIdDeDrive_(foto) {
  return /^[\w-]{20,}$/.test(String(foto || ''));
}

/** El archivo si esta cuenta puede verlo y no está en la papelera; si no, null. */
function archivoDrive_(id) {
  if (!esIdDeDrive_(id)) return null;
  try {
    const f = Drive.Files.get(id, { fields: 'id,trashed' });
    return f && !f.trashed ? f : null;
  } catch (e) {
    return null;
  }
}

function buscarCarpetaDeLaApp_() {
  const r = Drive.Files.list({
    q: `mimeType='${TIPO_CARPETA}' and trashed=false and 'me' in owners and appProperties has { key='decorarte' and value='fotos' }`,
    fields: 'files(id)',
    pageSize: 1,
  });
  return r.files && r.files.length ? r.files[0].id : '';
}

/** ID de la carpeta de fotos de quien está usando el panel. La busca antes de crear una nueva. */
function carpetaFotos_() {
  const registrada = leerConfigCruda_().carpetaFotos;
  if (archivoDrive_(registrada)) return registrada;

  const usuario = PropertiesService.getUserProperties();
  let id = usuario.getProperty('carpetaFotos');
  if (!archivoDrive_(id)) {
    id = buscarCarpetaDeLaApp_();
    if (!id) {
      id = Drive.Files.create({ name: NOMBRE_CARPETA, mimeType: TIPO_CARPETA, appProperties: { decorarte: 'fotos' } }).id;
    }
    usuario.setProperty('carpetaFotos', id);
  }
  if (correoActual_() === propietario_()) guardarClavesConfig_({ carpetaFotos: id });
  return id;
}

/** Guarda la foto en Drive, visible para cualquiera con el enlace (para que el catálogo la muestre). */
function subirFotoADrive_(base64, tipo, nombre) {
  if (!/^image\/(jpeg|png|webp)$/.test(tipo)) throw new Error('El archivo no es una imagen compatible.');
  const bytes = Utilities.base64Decode(base64);
  if (bytes.length > 3 * 1024 * 1024) throw new Error('La foto es demasiado grande.');
  const extension = tipo === 'image/png' ? 'png' : tipo === 'image/webp' ? 'webp' : 'jpg';
  const nombreArchivo = (crearId_(nombre) || 'foto') + '-' +
    Utilities.formatDate(new Date(), 'America/Mexico_City', 'yyyyMMdd-HHmmss') + '.' + extension;
  const archivo = Drive.Files.create(
    { name: nombreArchivo, parents: [carpetaFotos_()], appProperties: { decorarte: 'foto' } },
    Utilities.newBlob(bytes, tipo, nombreArchivo),
  );
  Drive.Permissions.create({ role: 'reader', type: 'anyone' }, archivo.id);
  return archivo.id;
}

function mandarFotoAPapelera_(foto) {
  if (!esIdDeDrive_(foto)) return;
  try { Drive.Files.update({ trashed: true }, foto); } catch (e) { /* no es de esta cuenta o ya no existe */ }
}

/* =====================================================================
 *  Funciones que llama el panel (google.script.run)
 * ===================================================================== */

/** Todo lo que el panel necesita, incluidos los ocultos. */
function panelCargar() {
  verificarAcceso_();
  return panelCargarSinVerificar_();
}

function panelCargarSinVerificar_() {
  const d = leerTodo_();
  return { config: d.config, productos: d.productos, paquetes: d.paquetes, correo: correoActual_(), urlCatalogo: URL_CATALOGO };
}

/**
 * Guarda los datos del producto. La foto NO viaja aquí: se sube aparte con panelSubirFotoProducto,
 * así guardar es inmediato. Solo con cambiarFoto: true se cambia o se quita la foto.
 */
function panelGuardarProducto(datos) {
  verificarAcceso_();
  return conBloqueo_(() => {
    const config = leerConfig_();
    const todos = leerTabla_(HOJA_PRODUCTOS);
    validarItem_(datos, config, false);
    const anterior = datos.id ? todos.find((p) => p.id === datos.id) : null;
    if (datos.id && !anterior) throw new Error('Ese producto ya no existe. Recarga el panel.');
    const ocasionesValidas = config.ocasiones.map((o) => o.id);
    const producto = {
      id: datos.id || nuevoId_('p', todos),
      nombre: String(datos.nombre).trim(),
      descripcion: String(datos.descripcion || '').trim(),
      categoria: datos.categoria,
      ocasiones: [].concat(datos.ocasiones || []).filter((o) => ocasionesValidas.indexOf(o) >= 0),
      tipoPrecio: datos.tipoPrecio,
      precio: aNumero_(datos.precio),
      foto: datos.cambiarFoto ? String(datos.foto || '').trim() : (anterior ? anterior.foto : ''),
      disponible: datos.disponible !== false,
      destacado: !!datos.destacado,
      actualizado: new Date().toISOString(),
    };

    const grupo = todos.filter((p) => p.categoria === producto.categoria && p.id !== producto.id);
    if (anterior) {
      producto.orden = anterior.categoria === producto.categoria ? anterior.orden : grupo.length + 1;
      actualizarFila_(HOJA_PRODUCTOS, anterior._fila, producto);
      if (anterior.foto && anterior.foto !== producto.foto && !todos.some((p) => p.id !== producto.id && p.foto === anterior.foto)) {
        mandarFotoAPapelera_(anterior.foto);
      }
    } else {
      producto.orden = grupo.length + 1;
      escribirFilas_(HOJA_PRODUCTOS, [producto]);
    }

    const posicion = aNumero_(datos.posicion);
    if (posicion !== null) {
      const actualizados = leerTabla_(HOJA_PRODUCTOS).filter((p) => p.categoria === producto.categoria);
      escribirOrden_(HOJA_PRODUCTOS, reordenar_(actualizados, producto.id, posicion - 1));
    }
    return Object.assign(panelCargarSinVerificar_(), { guardadoId: producto.id });
  });
}

/**
 * Sube la foto (ya reducida en el celular) y se la asigna al producto en una sola llamada.
 * La subida va fuera del candado para no detener otros cambios mientras tanto.
 */
function panelSubirFotoProducto(id, base64, tipo, nombre) {
  verificarAcceso_();
  const fotoId = subirFotoADrive_(base64, tipo, nombre);
  return conBloqueo_(() => {
    const todos = leerTabla_(HOJA_PRODUCTOS);
    const p = todos.find((x) => x.id === id);
    if (!p) {
      mandarFotoAPapelera_(fotoId);
      throw new Error('Ese producto ya no existe; la foto no se guardó.');
    }
    const anterior = p.foto;
    p.foto = fotoId;
    p.actualizado = new Date().toISOString();
    actualizarFila_(HOJA_PRODUCTOS, p._fila, p);
    if (anterior && anterior !== fotoId && !todos.some((x) => x.id !== id && x.foto === anterior)) mandarFotoAPapelera_(anterior);
    return Object.assign(panelCargarSinVerificar_(), { fotoId: fotoId });
  });
}

function panelCambiarProducto(id, campo, valor) {
  verificarAcceso_();
  if (['disponible', 'destacado'].indexOf(campo) < 0) throw new Error('Campo no permitido.');
  return conBloqueo_(() => {
    const p = leerTabla_(HOJA_PRODUCTOS).find((x) => x.id === id);
    if (!p) throw new Error('Ese producto ya no existe. Recarga el panel.');
    p[campo] = !!valor;
    p.actualizado = new Date().toISOString();
    actualizarFila_(HOJA_PRODUCTOS, p._fila, p);
    return panelCargarSinVerificar_();
  });
}

function panelMoverProducto(id, direccion) {
  verificarAcceso_();
  return conBloqueo_(() => {
    const todos = leerTabla_(HOJA_PRODUCTOS);
    const p = todos.find((x) => x.id === id);
    if (!p) throw new Error('Ese producto ya no existe. Recarga el panel.');
    const grupo = todos.filter((x) => x.categoria === p.categoria).sort(ordenar_);
    const actual = grupo.findIndex((x) => x.id === id);
    escribirOrden_(HOJA_PRODUCTOS, reordenar_(grupo, id, actual + (direccion < 0 ? -1 : 1)));
    return panelCargarSinVerificar_();
  });
}

function panelEliminarProducto(id) {
  verificarAcceso_();
  return conBloqueo_(() => {
    const todos = leerTabla_(HOJA_PRODUCTOS);
    const p = todos.find((x) => x.id === id);
    if (!p) return panelCargarSinVerificar_();
    // Si es un servicio, también se borran sus paquetes (de abajo hacia arriba para no mover filas).
    leerTabla_(HOJA_PAQUETES).filter((k) => k.servicioId === id)
      .sort((a, b) => b._fila - a._fila)
      .forEach((k) => hoja_(HOJA_PAQUETES).deleteRow(k._fila));
    hoja_(HOJA_PRODUCTOS).deleteRow(p._fila);
    if (p.foto && !todos.some((x) => x.id !== id && x.foto === p.foto)) mandarFotoAPapelera_(p.foto);
    return panelCargarSinVerificar_();
  });
}

function panelGuardarPaquete(datos) {
  verificarAcceso_();
  return conBloqueo_(() => {
    const config = leerConfig_();
    validarItem_(datos, config, true);
    const servicio = leerTabla_(HOJA_PRODUCTOS).find((p) => p.id === datos.servicioId);
    if (!servicio) throw new Error('Elige el servicio al que pertenece el paquete.');
    const todos = leerTabla_(HOJA_PAQUETES);
    const anterior = datos.id ? todos.find((k) => k.id === datos.id) : null;
    if (datos.id && !anterior) throw new Error('Ese paquete ya no existe. Recarga el panel.');
    const paquete = {
      id: datos.id || nuevoId_('k', todos),
      servicioId: datos.servicioId,
      nombre: String(datos.nombre).trim(),
      descripcion: String(datos.descripcion || '').trim(),
      incluye: lineas_([].concat(datos.incluye || []).join('\n')),
      tipoPrecio: datos.tipoPrecio,
      precio: aNumero_(datos.precio),
      disponible: datos.disponible !== false,
      actualizado: new Date().toISOString(),
    };
    const grupo = todos.filter((k) => k.servicioId === paquete.servicioId && k.id !== paquete.id);
    if (anterior) {
      paquete.orden = anterior.servicioId === paquete.servicioId ? anterior.orden : grupo.length + 1;
      actualizarFila_(HOJA_PAQUETES, anterior._fila, paquete);
    } else {
      paquete.orden = grupo.length + 1;
      escribirFilas_(HOJA_PAQUETES, [paquete]);
    }
    return Object.assign(panelCargarSinVerificar_(), { guardadoId: paquete.id });
  });
}

function panelCambiarPaquete(id, campo, valor) {
  verificarAcceso_();
  if (campo !== 'disponible') throw new Error('Campo no permitido.');
  return conBloqueo_(() => {
    const k = leerTabla_(HOJA_PAQUETES).find((x) => x.id === id);
    if (!k) throw new Error('Ese paquete ya no existe. Recarga el panel.');
    k.disponible = !!valor;
    k.actualizado = new Date().toISOString();
    actualizarFila_(HOJA_PAQUETES, k._fila, k);
    return panelCargarSinVerificar_();
  });
}

function panelMoverPaquete(id, direccion) {
  verificarAcceso_();
  return conBloqueo_(() => {
    const todos = leerTabla_(HOJA_PAQUETES);
    const k = todos.find((x) => x.id === id);
    if (!k) throw new Error('Ese paquete ya no existe. Recarga el panel.');
    const grupo = todos.filter((x) => x.servicioId === k.servicioId).sort(ordenar_);
    const actual = grupo.findIndex((x) => x.id === id);
    escribirOrden_(HOJA_PAQUETES, reordenar_(grupo, id, actual + (direccion < 0 ? -1 : 1)));
    return panelCargarSinVerificar_();
  });
}

function panelEliminarPaquete(id) {
  verificarAcceso_();
  return conBloqueo_(() => {
    const k = leerTabla_(HOJA_PAQUETES).find((x) => x.id === id);
    if (k) hoja_(HOJA_PAQUETES).deleteRow(k._fila);
    return panelCargarSinVerificar_();
  });
}

/** Guarda los ajustes. Las listas llegan como arreglos de objetos. */
function panelGuardarConfig(datos) {
  verificarAcceso_();
  return conBloqueo_(() => {
    const valores = {};
    ['negocio', 'lema', 'whatsapp', 'whatsappServicios', 'instagram', 'facebook', 'resenas',
      'direccion', 'mapsUrl', 'horario', 'temporada', 'temporadaTitulo'].forEach((clave) => {
      if (clave in datos) valores[clave] = String(datos[clave] == null ? '' : datos[clave]).trim();
    });
    ['whatsapp', 'whatsappServicios'].forEach((clave) => {
      if (!(clave in valores)) return;
      let d = valores[clave].replace(/\D/g, '');
      if (d.length === 10) d = '52' + d;
      if (d && d.length !== 12) throw new Error('El número de WhatsApp debe tener 10 dígitos.');
      valores[clave] = d;
    });
    if ('whatsapp' in valores && !valores.whatsapp) throw new Error('El WhatsApp principal no puede quedar vacío.');

    if (Array.isArray(datos.categorias)) {
      const cats = datos.categorias
        .map((c) => ({ id: c.id || crearId_(c.nombre), nombre: String(c.nombre || '').trim(), tipo: c.tipo === 'servicios' ? 'servicios' : 'productos' }))
        .filter((c) => c.id && c.nombre);
      if (!cats.length) throw new Error('Debe haber al menos una categoría.');
      valores.categorias = listaATexto_(cats, ['id', 'nombre', 'tipo']);
    }
    if (Array.isArray(datos.ocasiones)) {
      const ocs = datos.ocasiones
        .map((o) => ({ id: o.id || crearId_(o.nombre), emoji: String(o.emoji || '').trim(), nombre: String(o.nombre || '').trim() }))
        .filter((o) => o.id && o.nombre);
      valores.ocasiones = listaATexto_(ocs, ['id', 'emoji', 'nombre']);
      const temporada = 'temporada' in valores ? valores.temporada : leerConfigCruda_().temporada;
      if (temporada && !ocs.some((o) => o.id === temporada)) valores.temporada = '';
    }
    if (Array.isArray(datos.autorizados)) {
      const correos = datos.autorizados.map((c) => String(c).trim().toLowerCase()).filter(Boolean);
      const invalido = correos.find((c) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c));
      if (invalido) throw new Error(`"${invalido}" no parece un correo.`);
      const yo = correoActual_();
      if (yo && correos.indexOf(yo) < 0) correos.unshift(yo); // nadie se puede dejar fuera a sí mismo
      valores.autorizados = correos.filter((c, i) => correos.indexOf(c) === i).join('\n');
    }
    guardarClavesConfig_(valores);
    return panelCargarSinVerificar_();
  });
}

function escaparHtml_(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
