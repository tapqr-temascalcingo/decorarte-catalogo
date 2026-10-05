import { CONFIG } from './config.js';
import {
  normalizarDatos, filtrarProductos, productosTemporada, paquetesDeServicio, ocasionesConProductos,
  tipoDeCategoria, textoPrecio, urlFoto, enlaceWhatsApp, mensajeProducto, mensajeCotizacion, numeroPara,
} from './logica.js';

const LOGO = 'img/logo.webp';
const params = new URLSearchParams(location.search);
const modoDemo = !CONFIG.endpoint || params.has('demo');
const CLAVE_CACHE = 'decorarte:datos:' + (modoDemo ? 'demo' : CONFIG.endpoint);

const $ = (id) => document.getElementById(id);
const estado = {
  datos: null,
  categoria: params.get('cat') || '',
  ocasion: params.get('ocasion') || '',
  busqueda: '',
};

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));
const icono = (id, clase = 'ico') => `<svg class="${clase}" aria-hidden="true"><use href="#i-${id}"/></svg>`;

function imagen(foto, alt, ancho, prioridad = false) {
  const src = urlFoto(foto, ancho);
  if (!src) return `<img class="sin-foto" src="${LOGO}" alt="${esc(alt)}" loading="lazy">`;
  const carga = prioridad ? 'loading="eager" fetchpriority="high"' : 'loading="lazy"';
  return `<img src="${esc(src)}" alt="${esc(alt)}" ${carga} decoding="async">`;
}

// Si una foto no carga, se pone el logo en su lugar.
// Las fotos de Drive tienen un segundo intento con la miniatura de Drive.
document.addEventListener('error', (e) => {
  const img = e.target;
  if (img.tagName !== 'IMG') return;
  const drive = /lh3\.googleusercontent\.com\/d\/([\w-]+)=w(\d+)/.exec(img.src);
  if (drive && !img.dataset.reintento) {
    img.dataset.reintento = '1';
    img.src = `https://drive.google.com/thumbnail?id=${drive[1]}&sz=w${drive[2]}`;
    return;
  }
  if (!img.classList.contains('sin-foto')) {
    img.classList.add('sin-foto');
    img.src = LOGO;
  }
}, true);

/* ---------------- Datos ---------------- */

function leerCache() {
  try { return JSON.parse(localStorage.getItem(CLAVE_CACHE) || 'null'); } catch { return null; }
}
function guardarCache(crudo) {
  try { localStorage.setItem(CLAVE_CACHE, JSON.stringify(crudo)); } catch { /* sin espacio o bloqueado */ }
}

async function pedirDatos() {
  const url = modoDemo ? 'datos/demo.json' : CONFIG.endpoint + (CONFIG.endpoint.includes('?') ? '&' : '?') + 'api';
  const ctrl = new AbortController();
  const limite = setTimeout(() => ctrl.abort(), 15000);
  try {
    const r = await fetch(url, { signal: ctrl.signal, cache: modoDemo ? 'default' : 'no-store' });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const json = await r.json();
    if (!json || json.error || !Array.isArray(json.productos)) throw new Error(json?.error || 'Respuesta inválida');
    return json;
  } finally {
    clearTimeout(limite);
  }
}

// La página se pinta al instante con la copia guardada en el teléfono y se actualiza en cuanto
// llegan los datos nuevos. También se revisa al volver a la pestaña: Safari en iPhone suele
// mostrar la página que tenía en memoria sin recargarla.
let ultimaConsulta = 0;
let consultando = false;

async function actualizarDesdeServidor(pedido) {
  if (consultando) return;
  consultando = true;
  ultimaConsulta = Date.now();
  const cache = leerCache();
  try {
    const nuevo = await (pedido || pedirDatos());
    if (!cache || JSON.stringify(cache) !== JSON.stringify(nuevo)) {
      guardarCache(nuevo);
      aplicar(nuevo);
    }
  } catch (err) {
    console.warn('No se pudo cargar el catálogo:', err);
    if (!cache && !estado.datos) mostrarError();
  } finally {
    consultando = false;
  }
}

function iniciar() {
  const pedido = pedirDatos(); // primero se pide; mientras llega, se pinta la copia guardada
  pedido.catch(() => {});
  const cache = leerCache();
  if (cache) aplicar(cache);
  actualizarDesdeServidor(pedido);
}

const REVISAR_CADA = 10_000;
window.addEventListener('pageshow', (e) => {
  if (e.persisted) actualizarDesdeServidor();
});
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && Date.now() - ultimaConsulta > REVISAR_CADA) actualizarDesdeServidor();
});

function aplicar(crudo) {
  estado.datos = normalizarDatos(crudo);
  const { config } = estado.datos;
  if (!config.categorias.some((c) => c.id === estado.categoria)) {
    estado.categoria = config.categorias[0]?.id || '';
  }
  if (estado.ocasion && !config.ocasiones.some((o) => o.id === estado.ocasion)) estado.ocasion = '';
  $('aviso-demo').hidden = !crudo.demo;
  if (config.lema) $('lema').textContent = config.lema;
  if (config.direccion) $('lugar').textContent = config.direccion;
  renderPie();
  render();
  abrirDesdeHash();
}

/* ---------------- Render ---------------- */

function render() {
  renderPestanas();
  renderOcasiones();
  marcarSiHayMas();
  renderTemporada();
  renderLista();
  actualizarUrl();
}

function renderPestanas() {
  const { categorias } = estado.datos.config;
  $('pestanas').innerHTML = categorias.map((c) => `
    <button type="button" class="pestana" role="tab" data-categoria="${esc(c.id)}"
      aria-selected="${c.id === estado.categoria && !estado.busqueda}">${esc(c.nombre)}</button>`).join('');
}

function renderOcasiones() {
  // Los filtros por ocasión son para regalos; en Servicios no se muestran ni filtran.
  const enServicios = !estado.busqueda && tipoDeCategoria(estado.categoria, estado.datos.config) === 'servicios';
  if (enServicios) estado.ocasion = '';
  const lista = enServicios ? [] : ocasionesConProductos(estado.datos, estado.busqueda ? '' : estado.categoria);
  const chips = [{ id: '', nombre: 'Todas', emoji: '✨' }, ...lista];
  $('barra-ocasiones').hidden = lista.length === 0;
  $('ocasiones').innerHTML = chips.map((o) => `
    <button type="button" class="chip" data-ocasion="${esc(o.id)}" aria-pressed="${o.id === estado.ocasion}">
      ${o.emoji ? esc(o.emoji) + ' ' : ''}${esc(o.nombre)}</button>`).join('');
}

/** Desvanece el borde derecho de la fila de ocasiones mientras queden filtros por ver. */
function marcarSiHayMas() {
  const fila = $('ocasiones');
  fila.classList.toggle('hay-mas', fila.scrollWidth - fila.clientWidth - fila.scrollLeft > 4);
}
$('ocasiones').addEventListener('scroll', marcarSiHayMas, { passive: true });
window.addEventListener('resize', marcarSiHayMas, { passive: true });

function renderTemporada() {
  const { config } = estado.datos;
  const enPortada = !estado.ocasion && !estado.busqueda && tipoDeCategoria(estado.categoria, config) === 'productos';
  const items = enPortada ? productosTemporada(estado.datos) : [];
  $('temporada').hidden = items.length === 0;
  if (!items.length) return;
  const oc = config.ocasiones.find((o) => o.id === config.temporada);
  $('temporada-titulo').textContent = config.temporadaTitulo || `Temporada: ${oc?.nombre ?? ''}`;
  $('temporada-lista').innerHTML = items.map((p, i) => tarjeta(p, true, i < 2)).join('');
}

function renderLista() {
  const { datos } = estado;
  const { config } = datos;
  const items = filtrarProductos(datos, estado);
  const cat = config.categorias.find((c) => c.id === estado.categoria);
  const oc = config.ocasiones.find((o) => o.id === estado.ocasion);

  let titulo = estado.busqueda ? `Resultados para “${estado.busqueda}”` : (cat?.nombre ?? 'Catálogo');
  if (oc) titulo += ` · ${oc.nombre}`;
  $('titulo-lista').textContent = titulo;

  const esServicios = !estado.busqueda && cat?.tipo === 'servicios';
  const n = items.length;
  $('conteo').textContent = n === 0 ? '' : esServicios
    ? `${n} ${n === 1 ? 'servicio' : 'servicios'} · elige un paquete y cotiza sin compromiso`
    : `${n} ${n === 1 ? 'opción' : 'opciones'} · toca una foto para ver más`;

  const conTemporada = !$('temporada').hidden;
  $('lista').innerHTML = items.map((p, i) => (
    tipoDeCategoria(p.categoria, config) === 'servicios' ? bloqueServicio(p, i === 0) : tarjeta(p, false, !conTemporada && i < 4)
  )).join('');

  $('vacio').hidden = n > 0;
  if (n === 0) {
    const busco = estado.busqueda || oc?.nombre || cat?.nombre || 'un regalo';
    $('vacio-wa').href = enlaceWhatsApp(config.whatsapp,
      `¡Hola ${config.negocio}! Estoy buscando: ${busco}. ¿Me pueden ayudar?`);
  }
}

function tarjeta(p, enCarrusel = false, prioridad = false) {
  const { config } = estado.datos;
  const precio = textoPrecio(p);
  const wa = enlaceWhatsApp(numeroPara('productos', config), mensajeProducto(p, config));
  return `
    <article class="tarjeta" data-id="${esc(p.id)}">
      <button type="button" class="tarjeta-foto" data-detalle="${esc(p.id)}" aria-label="Ver ${esc(p.nombre)}">
        ${imagen(p.foto, p.nombre, enCarrusel ? 500 : 400, prioridad)}
        ${p.destacado && !enCarrusel ? `<span class="insignia">${icono('star')}Favorito</span>` : ''}
      </button>
      <div class="tarjeta-cuerpo">
        <h3 class="tarjeta-nombre"><button type="button" data-detalle="${esc(p.id)}">${esc(p.nombre)}</button></h3>
        <p class="tarjeta-desc">${esc(p.descripcion)}</p>
        <span class="precio${precio === 'Pregunta por precio' ? ' consultar' : ''}">${esc(precio)}</span>
        <a class="boton boton-wa" href="${esc(wa)}" target="_blank" rel="noopener">${icono('whatsapp')}Lo quiero</a>
      </div>
    </article>`;
}

function bloqueServicio(s, prioridad = false) {
  const { config } = estado.datos;
  const numero = numeroPara('servicios', config);
  const paquetes = paquetesDeServicio(estado.datos, s.id);
  const precio = textoPrecio(s);
  return `
    <article class="servicio" data-id="${esc(s.id)}">
      <div class="servicio-foto">${imagen(s.foto, s.nombre, 800, prioridad)}</div>
      <div class="servicio-cuerpo">
        <h3 class="servicio-nombre">${esc(s.nombre)}</h3>
        <p class="servicio-desc">${esc(s.descripcion)}</p>
        ${precio !== 'Pregunta por precio' ? `<span class="precio">${esc(precio)}</span>` : ''}
        ${paquetes.length ? `<div class="paquetes">${paquetes.map((k) => `
          <div class="paquete">
            <div class="paquete-cabeza">
              <h4 class="paquete-nombre">${esc(k.nombre)}</h4>
              <span class="precio${textoPrecio(k) === 'Pregunta por precio' ? ' consultar' : ''}">${esc(textoPrecio(k))}</span>
            </div>
            ${k.descripcion ? `<p class="paquete-desc">${esc(k.descripcion)}</p>` : ''}
            ${k.incluye.length ? `<ul>${k.incluye.map((i) => `<li>${icono('check')}${esc(i)}</li>`).join('')}</ul>` : ''}
            <a class="boton boton-wa" href="${esc(enlaceWhatsApp(numero, mensajeCotizacion(s, k, config)))}" target="_blank" rel="noopener">${icono('whatsapp')}Cotizar ${esc(k.nombre)}</a>
          </div>`).join('')}</div>` : ''}
        <a class="boton ${paquetes.length ? 'boton-suave' : 'boton-wa'} servicio-cotizar" href="${esc(enlaceWhatsApp(numero, mensajeCotizacion(s, null, config)))}" target="_blank" rel="noopener">${icono('whatsapp')}${paquetes.length ? 'Cotizar algo a mi medida' : 'Cotizar'}</a>
      </div>
    </article>`;
}

function renderPie() {
  const { config } = estado.datos;
  const redes = [
    ['whatsapp', 'WhatsApp', config.whatsapp && enlaceWhatsApp(config.whatsapp, `¡Hola ${config.negocio}! Vi su catálogo y me gustaría información.`)],
    ['instagram', 'Instagram', config.instagram],
    ['facebook', 'Facebook', config.facebook],
    ['star', 'Déjanos tu reseña', config.resenas],
  ].filter(([, , url]) => url);
  $('pie-redes').innerHTML = redes.map(([ico, nombre, url]) => `
    <a class="red" href="${esc(url)}" target="_blank" rel="noopener">${icono(ico)}${esc(nombre)}</a>`).join('');

  $('pie-direccion').textContent = config.direccion || 'Temascalcingo, Estado de México';
  const maps = config.mapsUrl || '';
  if (maps) $('pie-ubicacion').href = maps; else $('pie-ubicacion').removeAttribute('href');
  $('pie-horario').hidden = !config.horario;
  $('pie-horario').textContent = config.horario || '';
  $('wa-flotante').href = enlaceWhatsApp(config.whatsapp, `¡Hola ${config.negocio}! Vi su catálogo y me gustaría información.`);
}

function mostrarError() {
  $('lista').innerHTML = '';
  $('titulo-lista').textContent = 'Catálogo';
  $('conteo').textContent = '';
  $('vacio').hidden = false;
  $('vacio').querySelector('.vacio-titulo').textContent = 'No pudimos cargar el catálogo en este momento.';
  $('vacio').querySelector('p:not(.vacio-titulo)').textContent = 'Revisa tu conexión o escríbenos directo, con gusto te atendemos.';
  const wa = enlaceWhatsApp(CONFIG.whatsappRespaldo, '¡Hola Decorarte! Quiero ver su catálogo.');
  $('vacio-wa').href = wa;
  $('wa-flotante').href = wa;
}

function actualizarUrl() {
  const p = new URLSearchParams();
  if (params.has('demo')) p.set('demo', '');
  if (estado.categoria && estado.categoria !== estado.datos.config.categorias[0]?.id) p.set('cat', estado.categoria);
  if (estado.ocasion) p.set('ocasion', estado.ocasion);
  const qs = p.toString().replace('demo=&', 'demo&').replace(/demo=$/, 'demo');
  history.replaceState(history.state, '', location.pathname + (qs ? '?' + qs : '') + location.hash);
}

/* ---------------- Detalle de producto ---------------- */

const dialogo = $('detalle');

function abrirDetalle(id, agregarHistorial = true) {
  const p = estado.datos?.productos.find((x) => x.id === id);
  if (!p || tipoDeCategoria(p.categoria, estado.datos.config) === 'servicios') return;
  const { config } = estado.datos;
  const nombres = Object.fromEntries(config.ocasiones.map((o) => [o.id, `${o.emoji} ${o.nombre}`.trim()]));
  const precio = textoPrecio(p);
  $('detalle-cuerpo').innerHTML = `
    <div class="detalle-foto">${imagen(p.foto, p.nombre, 900)}</div>
    <div class="detalle-info">
      <h2 id="detalle-nombre">${esc(p.nombre)}</h2>
      <span class="precio${precio === 'Pregunta por precio' ? ' consultar' : ''}">${esc(precio)}</span>
      <p>${esc(p.descripcion)}</p>
      ${p.ocasiones.length ? `<ul class="etiquetas">${p.ocasiones.filter((o) => nombres[o]).map((o) => `<li>${esc(nombres[o])}</li>`).join('')}</ul>` : ''}
      <a class="boton boton-wa" href="${esc(enlaceWhatsApp(numeroPara('productos', config), mensajeProducto(p, config)))}" target="_blank" rel="noopener">${icono('whatsapp')}Lo quiero</a>
    </div>`;
  if (agregarHistorial) history.pushState({ detalle: id }, '', '#' + encodeURIComponent(id));
  if (!dialogo.open) dialogo.showModal();
  dialogo.scrollTop = 0;
}

function cerrarDetalle() {
  if (history.state?.detalle) history.back(); // el evento popstate cierra el diálogo
  else dialogo.close();
}

function abrirDesdeHash() {
  const id = decodeURIComponent(location.hash.slice(1));
  if (id && !dialogo.open) abrirDetalle(id, false);
}

dialogo.addEventListener('close', () => {
  if (location.hash) history.replaceState(null, '', location.pathname + location.search);
});
dialogo.addEventListener('click', (e) => { if (e.target === dialogo) cerrarDetalle(); });
dialogo.addEventListener('cancel', (e) => { e.preventDefault(); cerrarDetalle(); });
$('detalle-cerrar').addEventListener('click', cerrarDetalle);
window.addEventListener('popstate', () => {
  if (dialogo.open && !history.state?.detalle) dialogo.close();
  else if (history.state?.detalle) abrirDetalle(history.state.detalle, false);
});

/* ---------------- Eventos ---------------- */

document.addEventListener('click', (e) => {
  const det = e.target.closest('[data-detalle]');
  if (det) return abrirDetalle(det.dataset.detalle);

  const pest = e.target.closest('[data-categoria]');
  if (pest && estado.datos) {
    estado.categoria = pest.dataset.categoria;
    estado.ocasion = '';
    limpiarBusqueda();
    render();
    irAlContenido();
    return;
  }

  const chip = e.target.closest('[data-ocasion]');
  if (chip && estado.datos) {
    estado.ocasion = chip.dataset.ocasion === estado.ocasion ? '' : chip.dataset.ocasion;
    render();
    $('ocasiones').querySelector(`[data-ocasion="${CSS.escape(estado.ocasion)}"]`)
      ?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
    irAlContenido();
  }
});

function irAlContenido() {
  // Lugar natural de la fila fija = justo debajo del buscador. (offsetTop de un elemento
  // pegado devuelve donde está pegado, no su lugar en la página.)
  const barra = $('barra');
  const inicio = barra.offsetTop + barra.offsetHeight;
  if (window.scrollY > inicio) {
    window.scrollTo({ top: inicio, behavior: 'smooth' });
  }
}

let temporizador;
$('buscar').addEventListener('input', (e) => {
  clearTimeout(temporizador);
  $('limpiar-busqueda').hidden = !e.target.value;
  temporizador = setTimeout(() => {
    estado.busqueda = e.target.value.trim();
    if (estado.datos) render();
  }, 150);
});
$('buscar').addEventListener('keydown', (e) => { if (e.key === 'Enter') e.target.blur(); });
$('limpiar-busqueda').addEventListener('click', () => {
  limpiarBusqueda();
  if (estado.datos) render();
  $('buscar').focus();
});
function limpiarBusqueda() {
  $('buscar').value = '';
  estado.busqueda = '';
  $('limpiar-busqueda').hidden = true;
}

new IntersectionObserver(([entrada]) => {
  $('barra-ocasiones').classList.toggle('pegada', !entrada.isIntersecting);
}).observe($('barra'));

// El botón flotante de WhatsApp se aparta mientras hay productos debajo del pulgar
// (cada producto ya tiene su "Lo quiero") y vuelve en la portada y en el pie.
// La franja vigilada es el 18 % de abajo de la pantalla (donde está el botón); en porcentaje
// se ajusta sola cuando cambia el alto (barra de Safari que se esconde, teclado, giro).
new IntersectionObserver(([entrada]) => {
  $('wa-flotante').classList.toggle('apartado', entrada.isIntersecting);
}, { rootMargin: '-82% 0px 0px 0px' }).observe($('contenido'));

/* Un poco de confeti la primera vez, como en su página */
function confeti() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  try { if (sessionStorage.getItem('decorarte:confeti')) return; sessionStorage.setItem('decorarte:confeti', '1'); } catch { /* sin almacenamiento */ }
  const colores = ['#f5c6d6', '#f8d7e2', '#e9cf9a', '#f0aecb'];
  for (let i = 0; i < 18; i++) {
    const c = document.createElement('div');
    const s = 4 + Math.random() * 5;
    c.className = 'confeti';
    Object.assign(c.style, {
      left: Math.random() * 100 + 'vw', width: s + 'px', height: s + 'px',
      background: colores[i % colores.length],
      animationDuration: 2.4 + Math.random() * 2 + 's', animationDelay: Math.random() * 0.6 + 's',
    });
    document.body.appendChild(c);
    setTimeout(() => c.remove(), 5500);
  }
}

confeti();
iniciar();
