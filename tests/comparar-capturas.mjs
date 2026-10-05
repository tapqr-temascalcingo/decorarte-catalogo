// Capturas para comparar antes y después a 390 px:  node tests/comparar-capturas.mjs <carpeta> [puerto]
// - portada del catálogo (?demo), una tarjeta de producto, y el panel con el teclado abierto.
// El teclado no se puede abrir en un navegador de prueba: se simula dejando visible solo la parte
// de la pantalla que queda libre en un iPhone 13 con el teclado arriba (unos 400 px) y con el campo enfocado.
import { chromium, webkit } from 'playwright';
import { mkdirSync } from 'node:fs';

const carpeta = process.argv[2];
const puerto = process.argv[3] || '8080';
const base = `http://localhost:${puerto}`;
mkdirSync(carpeta, { recursive: true });

const b = await webkit.launch();
const c = await chromium.launch();
const movil = { viewport: { width: 390, height: 664 }, deviceScaleFactor: 2, hasTouch: true };

// Portada y tarjeta (WebKit, como Safari en iPhone)
let p = await (await b.newContext(movil)).newPage();
await p.goto(`${base}/?demo`);
await p.waitForSelector('#lista .tarjeta:not(.esqueleto)');
await p.addStyleTag({ content: '.confeti{display:none!important}' });
await p.waitForTimeout(800);
await p.screenshot({ path: `${carpeta}/portada-390.png` });
const primerBoton = await p.evaluate(() => {
  const b = document.querySelector('.tarjeta .boton-wa');
  return b ? Math.round(b.getBoundingClientRect().bottom) : null;
});
await p.evaluate(() => scrollTo(0, document.getElementById('titulo-lista').getBoundingClientRect().top + scrollY - 140));
await p.waitForTimeout(400);
await p.screenshot({ path: `${carpeta}/lista-390.png` });
await p.locator('#lista .tarjeta').nth(1).screenshot({ path: `${carpeta}/tarjeta-390.png` });
const barra = await p.evaluate(() => {
  const fijos = [...document.querySelectorAll('body *')].filter((e) => getComputedStyle(e).position === 'sticky');
  return fijos.map((e) => Math.round(e.getBoundingClientRect().height)).reduce((a, x) => a + x, 0);
});

// Panel con teclado (Chromium; el teclado se simula con el alto visible)
p = await (await c.newContext({ viewport: { width: 390, height: 400 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true })).newPage();
await p.goto(`${base}/panel-local/?demora=0`);
await p.waitForSelector('.item');
await p.locator('.item-principal').first().click();
await p.locator('#f-descripcion').scrollIntoViewIfNeeded();
await p.focus('#f-descripcion');
await p.evaluate(() => document.getElementById('f-descripcion').scrollIntoView({ block: 'center' }));
await p.waitForTimeout(500);
await p.screenshot({ path: `${carpeta}/panel-teclado-390.png` });
const libre = await p.evaluate(() => {
  const tapan = [...document.querySelectorAll('.navegacion, .guardar-fijo, .agregar, .cabecera')]
    .filter((e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return cs.display !== 'none' && cs.visibility !== 'hidden' && +cs.opacity > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight; })
    .map((e) => { const r = e.getBoundingClientRect(); return Math.min(r.bottom, innerHeight) - Math.max(r.top, 0); });
  return innerHeight - tapan.reduce((a, x) => a + x, 0);
});

console.log(JSON.stringify({ primerLoQuieroBajaHasta: primerBoton, altoPantalla: 664, barraFija: barra, panelEspacioLibreConTeclado: libre, de: 400 }));
await b.close(); await c.close();
