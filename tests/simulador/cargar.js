// Carga apps-script/Codigo.gs dentro del simulador de Apps Script, para probarlo en Node.
//
// Simula las dos implementaciones del mismo proyecto sobre la MISMA hoja, Drive y caché:
//   gs        -> versión con IMPLEMENTACION = 'panel' (o la que se pida)
//   gs.apiGs  -> versión con IMPLEMENTACION = 'api', ejecutando como la dueña ("API catálogo")
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

const leer = (ruta) => readFileSync(new URL(ruta, import.meta.url), 'utf8');
export const DEMO = JSON.parse(leer('../../datos/demo.json'));
const CODIGO = leer('../../apps-script/Codigo.gs');
const EJEMPLOS = leer('../../apps-script/Ejemplos.gs');
export const IMPLEMENTACION_REAL = leer('../../apps-script/Implementacion.gs');

function contexto(entorno, implementacion) {
  const ctx = vm.createContext({ console, Buffer, crypto: globalThis.crypto });
  Object.assign(ctx, entorno);
  vm.runInContext(EJEMPLOS, ctx, { filename: 'Ejemplos.gs' });
  if (implementacion === 'real') vm.runInContext(IMPLEMENTACION_REAL, ctx, { filename: 'Implementacion.gs' });
  else if (implementacion !== null) vm.runInContext(`const IMPLEMENTACION = ${JSON.stringify(implementacion)};`, ctx);
  vm.runInContext(CODIGO, ctx, { filename: 'Codigo.gs' });
  return ctx;
}

/**
 * @param implementacion 'panel' | 'api' | 'real' (lee Implementacion.gs) | null (archivo ausente) | cualquier texto
 * @param ejecutaComo    'usuario' (Panel) | 'propietario' (API catálogo o editor)
 */
export function cargarCodigo({
  usuario = 'duena@gmail.com', propietario = 'duena@gmail.com', implementacion = 'panel', ejecutaComo = 'usuario',
} = {}) {
  const base = vm.createContext({ console, Buffer, crypto: globalThis.crypto });
  vm.runInContext(leer('./apps-script-falso.js'), base, { filename: 'apps-script-falso.js' });
  const entorno = base.crearEntornoAppsScript({ usuario, propietario, ejecutaComo });
  const { estado } = entorno.__simulador;

  const gs = contexto(entorno, implementacion);
  gs.apiGs = contexto(entorno, 'api');
  gs.comoUsuario = (correo) => { estado.usuario = correo; };
  gs.evaluar = (expresion) => vm.runInContext(expresion, gs);

  /** Ejecuta fn como en la implementación "API catálogo" (como la dueña), con o sin sesión. */
  gs.enApi = (fn, { sesion = '' } = {}) => {
    const antes = { usuario: estado.usuario, ejecutaComo: estado.ejecutaComo };
    Object.assign(estado, { usuario: sesion, ejecutaComo: 'propietario' });
    try { return fn(gs.apiGs); } finally { Object.assign(estado, antes); }
  };
  /** Lo que recibe el catálogo al pedir <API>/exec?api */
  gs.api = () => gs.enApi((api) => JSON.parse(api.doGet({ parameter: { api: '' } }).getContent()));
  /** Ejecuta fn como si se corriera desde el editor de Apps Script con la cuenta indicada. */
  gs.enEditor = (fn, correo = propietario) => {
    const antes = { usuario: estado.usuario, ejecutaComo: estado.ejecutaComo };
    Object.assign(estado, { usuario: correo, ejecutaComo: 'usuario' });
    try { return fn(gs); } finally { Object.assign(estado, antes); }
  };
  return gs;
}

/** Codigo.gs instalado y con los datos de ejemplo cargados. */
export function conEjemplos(opciones) {
  const gs = cargarCodigo(opciones);
  gs.enEditor((g) => { g.instalar(); g.cargarEjemplos(); });
  return gs;
}
