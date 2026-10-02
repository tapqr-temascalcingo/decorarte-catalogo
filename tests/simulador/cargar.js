// Carga apps-script/Codigo.gs dentro del simulador de Apps Script, para probarlo en Node.
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

const leer = (ruta) => readFileSync(new URL(ruta, import.meta.url), 'utf8');
export const DEMO = JSON.parse(leer('../../datos/demo.json'));

export function cargarCodigo({ usuario = 'duena@gmail.com', propietario = 'duena@gmail.com' } = {}) {
  const ctx = vm.createContext({ console, Buffer, crypto: globalThis.crypto });
  vm.runInContext(leer('./apps-script-falso.js'), ctx, { filename: 'apps-script-falso.js' });
  Object.assign(ctx, ctx.crearEntornoAppsScript({ usuario, propietario }));
  // UrlFetchApp devuelve los datos de ejemplo, como si los descargara de GitHub Pages.
  ctx.UrlFetchApp = { fetch: () => ({ getResponseCode: () => 200, getContentText: () => JSON.stringify(DEMO) }) };
  vm.runInContext(leer('../../apps-script/Codigo.gs'), ctx, { filename: 'Codigo.gs' });
  ctx.comoUsuario = (correo) => { ctx.__simulador.estado.usuario = correo; };
  ctx.api = () => JSON.parse(ctx.doGet({ parameter: { api: '' } }).getContent());
  return ctx;
}

/** Codigo.gs instalado y con los datos de ejemplo cargados. */
export function conEjemplos(opciones) {
  const gs = cargarCodigo(opciones);
  gs.instalar();
  gs.cargarEjemplos();
  return gs;
}
