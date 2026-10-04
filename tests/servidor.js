// Servidor estático mínimo para probar el catálogo en local: `npm run servir` -> http://localhost:8080
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = fileURLToPath(new URL('..', import.meta.url));
const PUERTO = Number(process.env.PUERTO || 8080);
const TIPOS = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp',
  '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json', '.gs': 'text/plain; charset=utf-8',
};

const escapar = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** Evalúa una plantilla de Apps Script (<?= ?> y <?!= ?>) igual que HtmlService. */
async function plantilla(nombre, contexto) {
  const leerHtml = (n) => readFileSync(join(RAIZ, 'apps-script', n + '.html'), 'utf8');
  const ctx = { ...contexto, incluir_: leerHtml };
  return leerHtml(nombre).replace(/<\?(!?=)\s*([\s\S]*?)\s*\?>/g, (_, tipo, expr) => {
    const valor = String(Function(...Object.keys(ctx), `return (${expr});`)(...Object.values(ctx)));
    return tipo === '!=' ? valor : escapar(valor);
  });
}

/** El panel de Apps Script corriendo en local, con Codigo.gs sobre el simulador. */
async function panelLocal() {
  const html = await plantilla('Panel', {
    correo: 'duena@gmail.com',
    urlCatalogo: `http://localhost:${PUERTO}/`,
    urlLogo: '/img/logo-192.png',
  });
  return html
    .replace('<head>', '<head>\n  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n  <title>Decorarte · Panel (local)</title>')
    .replace('<body>', '<body>\n  <script src="/tests/simulador/apps-script-falso.js"></script>\n  <script src="/tests/simulador/panel-local.js"></script>');
}

createServer(async (req, res) => {
  let ruta = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (ruta === '/panel-local/' || ruta === '/panel-local') {
    res.writeHead(200, { 'Content-Type': TIPOS['.html'], 'Cache-Control': 'no-store' });
    res.end(await panelLocal());
    return;
  }
  if (ruta.endsWith('/')) ruta += 'index.html';
  const archivo = normalize(join(RAIZ, ruta));
  if (!archivo.startsWith(normalize(RAIZ))) { res.writeHead(403).end(); return; }
  try {
    const cuerpo = await readFile(archivo);
    res.writeHead(200, { 'Content-Type': TIPOS[extname(archivo)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(cuerpo);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('No encontrado');
  }
}).listen(PUERTO, () => console.log(`Sirviendo ${RAIZ} en http://localhost:${PUERTO}`));
