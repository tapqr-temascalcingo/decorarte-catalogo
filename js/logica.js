// Lógica pura del catálogo: sin DOM, para poder probarla con Node.

export const TIPOS_PRECIO = ['fijo', 'desde', 'consultar'];

/** Minúsculas y sin acentos, para comparar textos al buscar. */
export function normalizarTexto(texto) {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

/** Convierte un nombre a id: "Día del Padre" -> "dia-del-padre". */
export function crearId(texto) {
  return normalizarTexto(texto).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function aBooleano(valor, porDefecto) {
  if (valor === undefined || valor === null || valor === '') return porDefecto;
  if (typeof valor === 'boolean') return valor;
  const t = normalizarTexto(valor);
  if (['true', 'si', 'sí', '1', 'x', 'verdadero'].includes(t)) return true;
  if (['false', 'no', '0', 'falso'].includes(t)) return false;
  return porDefecto;
}

function aNumero(valor) {
  if (valor === undefined || valor === null || valor === '') return null;
  const n = typeof valor === 'number' ? valor : Number(String(valor).replace(/[$,\s]/g, ''));
  return Number.isFinite(n) ? n : null;
}

function aLista(valor) {
  if (Array.isArray(valor)) return valor.map((v) => String(v).trim()).filter(Boolean);
  if (valor === undefined || valor === null) return [];
  return String(valor).split(/[,\n]/).map((v) => v.trim()).filter(Boolean);
}

/** "$1,200" — sin decimales salvo que el precio los tenga. */
export function formatearPrecio(precio) {
  const n = aNumero(precio);
  if (n === null) return '';
  const conDecimales = !Number.isInteger(n);
  return '$' + n.toLocaleString('en-US', {
    minimumFractionDigits: conDecimales ? 2 : 0,
    maximumFractionDigits: 2,
  });
}

/** Texto de precio para mostrar: "$450", "Desde $450" o "Pregunta por precio". */
export function textoPrecio(item) {
  const precio = formatearPrecio(item?.precio);
  if (!precio || item?.tipoPrecio === 'consultar') return 'Pregunta por precio';
  return item.tipoPrecio === 'desde' ? `Desde ${precio}` : precio;
}

/** Deja el teléfono listo para WhatsApp: solo dígitos y con 52 si es número mexicano de 10 dígitos. */
export function telefonoWhatsApp(numero) {
  let d = String(numero ?? '').replace(/\D/g, '');
  if (d.length === 10) d = '52' + d;
  if (d.length === 13 && d.startsWith('521')) d = '52' + d.slice(3);
  return d;
}

export function enlaceWhatsApp(numero, mensaje) {
  const tel = telefonoWhatsApp(numero);
  const texto = encodeURIComponent(mensaje ?? '');
  return `https://api.whatsapp.com/send?phone=${tel}&text=${texto}`;
}

export function mensajeProducto(producto, config = {}) {
  const negocio = config.negocio || 'Decorarte';
  const precio = textoPrecio(producto);
  const detalle = precio === 'Pregunta por precio' ? '' : ` (${precio})`;
  return `¡Hola ${negocio}! Lo quiero: *${producto.nombre}*${detalle}. ` +
    '¿Está disponible? Lo vi en su catálogo.';
}

export function mensajeCotizacion(servicio, paquete, config = {}) {
  const negocio = config.negocio || 'Decorarte';
  const que = paquete
    ? `*${servicio.nombre}*, paquete *${paquete.nombre}* (${textoPrecio(paquete)})`
    : `*${servicio.nombre}*`;
  return `¡Hola ${negocio}! Me gustaría cotizar ${que}. ` +
    'Mi evento es el día ___ para ___ personas.';
}

/** Número al que se manda: el de servicios si existe, si no el general. */
export function numeroPara(tipo, config = {}) {
  if (tipo === 'servicios' && telefonoWhatsApp(config.whatsappServicios)) {
    return config.whatsappServicios;
  }
  return config.whatsapp;
}

/**
 * URL de una foto. Acepta una URL completa, una ruta local (img/...) o un ID de archivo de Drive.
 * Devuelve '' si no hay foto.
 */
export function urlFoto(foto, ancho = 600) {
  const f = String(foto ?? '').trim();
  if (!f) return '';
  if (/^(https?:|data:|blob:)/.test(f) || f.includes('/') || /\.(svg|png|jpe?g|webp|gif)$/i.test(f)) return f;
  if (/^[\w-]{20,}$/.test(f)) return `https://lh3.googleusercontent.com/d/${f}=w${ancho}`;
  return '';
}

function ordenar(a, b) {
  const oa = a.orden ?? Infinity;
  const ob = b.orden ?? Infinity;
  if (oa !== ob) return oa - ob;
  return a.nombre.localeCompare(b.nombre, 'es');
}

function normalizarItem(p) {
  return {
    ...p,
    id: String(p.id ?? '').trim(),
    nombre: String(p.nombre ?? '').trim(),
    descripcion: String(p.descripcion ?? '').trim(),
    tipoPrecio: TIPOS_PRECIO.includes(p.tipoPrecio) ? p.tipoPrecio : (aNumero(p.precio) === null ? 'consultar' : 'fijo'),
    precio: aNumero(p.precio),
    foto: String(p.foto ?? '').trim(),
    disponible: aBooleano(p.disponible, true),
    orden: aNumero(p.orden),
  };
}

/**
 * Limpia los datos que llegan (de la demo o de la hoja): tipos correctos,
 * sin elementos ocultos y en orden.
 */
export function normalizarDatos(crudo = {}) {
  const c = crudo.config ?? {};
  const config = {
    ...c,
    negocio: c.negocio || 'Decorarte',
    categorias: (Array.isArray(c.categorias) ? c.categorias : aLista(c.categorias).map((n) => ({ nombre: n })))
      .map((cat) => ({
        id: cat.id || crearId(cat.nombre),
        nombre: cat.nombre,
        tipo: cat.tipo === 'servicios' ? 'servicios' : 'productos',
      }))
      .filter((cat) => cat.id && cat.nombre),
    ocasiones: (Array.isArray(c.ocasiones) ? c.ocasiones : aLista(c.ocasiones).map((n) => ({ nombre: n })))
      .map((o) => ({ id: o.id || crearId(o.nombre), nombre: o.nombre, emoji: o.emoji || '' }))
      .filter((o) => o.id && o.nombre),
    temporada: c.temporada || '',
  };

  const productos = (crudo.productos ?? [])
    .map((p) => ({
      ...normalizarItem(p),
      categoria: String(p.categoria ?? '').trim(),
      ocasiones: aLista(p.ocasiones),
      destacado: aBooleano(p.destacado, false),
    }))
    .filter((p) => p.id && p.nombre && p.disponible)
    .sort(ordenar);

  const paquetes = (crudo.paquetes ?? [])
    .map((k) => ({
      ...normalizarItem(k),
      servicioId: String(k.servicioId ?? '').trim(),
      incluye: aLista(k.incluye),
    }))
    .filter((k) => k.id && k.nombre && k.disponible)
    .sort(ordenar);

  return { ...crudo, config, productos, paquetes };
}

export function tipoDeCategoria(categoriaId, config) {
  return config.categorias.find((c) => c.id === categoriaId)?.tipo ?? 'productos';
}

/**
 * Filtra productos por categoría, ocasión y búsqueda.
 * Si hay búsqueda, busca en todas las categorías.
 */
export function filtrarProductos(datos, { categoria = '', ocasion = '', busqueda = '' } = {}) {
  const { productos, paquetes, config } = datos;
  const palabras = normalizarTexto(busqueda).split(/\s+/).filter(Boolean);
  const nombreOcasion = Object.fromEntries(config.ocasiones.map((o) => [o.id, o.nombre]));
  const nombreCategoria = Object.fromEntries(config.categorias.map((c) => [c.id, c.nombre]));

  return productos.filter((p) => {
    if (ocasion && !p.ocasiones.includes(ocasion)) return false;
    if (!palabras.length) return !categoria || p.categoria === categoria;
    const textoPaquetes = (paquetes ?? [])
      .filter((k) => k.servicioId === p.id)
      .map((k) => `${k.nombre} ${k.descripcion} ${k.incluye.join(' ')}`)
      .join(' ');
    const texto = normalizarTexto([
      p.nombre, p.descripcion, nombreCategoria[p.categoria],
      ...p.ocasiones.map((o) => nombreOcasion[o]), textoPaquetes,
    ].join(' '));
    return palabras.every((w) => texto.includes(w));
  });
}

/** Destacados de la ocasión de temporada (vacío si no hay temporada configurada). */
export function productosTemporada(datos) {
  const t = datos.config.temporada;
  if (!t) return [];
  return datos.productos.filter((p) => p.destacado && p.ocasiones.includes(t));
}

export function paquetesDeServicio(datos, servicioId) {
  return datos.paquetes.filter((k) => k.servicioId === servicioId);
}

/** Ocasiones que tienen al menos un producto en la categoría (para no mostrar filtros vacíos). */
export function ocasionesConProductos(datos, categoria) {
  const usadas = new Set(
    datos.productos.filter((p) => !categoria || p.categoria === categoria).flatMap((p) => p.ocasiones),
  );
  return datos.config.ocasiones.filter((o) => usadas.has(o.id));
}
