/*
 * Simulador mínimo de los servicios de Google Apps Script que usa apps-script/Codigo.gs:
 * SpreadsheetApp, DriveApp, CacheService, PropertiesService, Session, LockService, Utilities,
 * ContentService y HtmlService. Guarda todo en memoria.
 *
 * Sirve en Node (pruebas, con vm) y en el navegador (panel local para capturas).
 * Uso: const entorno = crearEntornoAppsScript({ usuario: 'duena@gmail.com' });
 */
(function (raiz) {
  function crearEntornoAppsScript(opciones) {
    opciones = opciones || {};
    const estado = {
      usuario: opciones.usuario || '',
      propietario: opciones.propietario || opciones.usuario || 'duena@gmail.com',
      archivosHtml: opciones.archivosHtml || {},
      contador: 0,
    };

    const encadenable = (obj) => new Proxy(obj, {
      get: (o, k) => (k in o ? o[k] : () => encadenable(o)),
    });

    /* ---------- Hojas ---------- */
    function crearHoja(nombre) {
      const filas = []; // arreglo de arreglos (fila 1 = índice 0)
      const ancho = () => filas.reduce((m, f) => Math.max(m, f.length), 0);
      const celda = (v) => (v === undefined || v === null ? '' : v);
      function rango(fila, col, numFilas, numCols) {
        return encadenable({
          getValues() {
            const r = [];
            for (let i = 0; i < numFilas; i++) {
              const f = [];
              for (let j = 0; j < numCols; j++) f.push(celda((filas[fila - 1 + i] || [])[col - 1 + j]));
              r.push(f);
            }
            return r;
          },
          setValues(valores) {
            if (valores.length !== numFilas || valores.some((v) => v.length !== numCols)) {
              throw new Error(`Las dimensiones no coinciden: se esperaban ${numFilas}×${numCols}`);
            }
            valores.forEach((v, i) => {
              const idx = fila - 1 + i;
              while (filas.length <= idx) filas.push([]);
              v.forEach((x, j) => { filas[idx][col - 1 + j] = celda(x); });
            });
            return this;
          },
          setValue(v) { return this.setValues([[v]]); },
          getValue() { return this.getValues()[0][0]; },
        });
      }
      const hoja = {
        _filas: filas,
        getName: () => nombre,
        getLastRow() {
          for (let i = filas.length - 1; i >= 0; i--) if ((filas[i] || []).some((c) => c !== '')) return i + 1;
          return 0;
        },
        getLastColumn: () => ancho(),
        getMaxRows: () => Math.max(1000, filas.length),
        getRange(a, b, c, d) {
          if (typeof a === 'string') {
            const m = /^([A-Z]+)(\d+)?(?::([A-Z]+)(\d+)?)?$/.exec(a);
            const col = m ? m[1].charCodeAt(0) - 64 : 1;
            return rango(Number(m && m[2]) || 1, col, 1, 1);
          }
          return rango(a, b, c || 1, d || 1);
        },
        appendRow(valores) {
          filas.length = hoja.getLastRow();
          filas.push(valores.map(celda));
          return hoja;
        },
        deleteRow(n) { filas.splice(n - 1, 1); },
        setFrozenRows() { return hoja; },
      };
      return encadenable(hoja);
    }

    const libro = (() => {
      const hojas = [crearHoja('Hoja 1')];
      return encadenable({
        getId: () => 'libro-de-prueba',
        getSheetByName: (n) => hojas.find((h) => h.getName() === n) || null,
        getSheets: () => hojas.slice(),
        insertSheet(n) { const h = crearHoja(n); hojas.push(h); return h; },
        deleteSheet(h) { hojas.splice(hojas.indexOf(h), 1); },
      });
    })();

    const SpreadsheetApp = {
      getActiveSpreadsheet: () => libro,
      openById: () => libro,
      flush() {},
      getUi: () => encadenable({ alert(m) { estado.ultimaAlerta = m; } }),
    };

    /* ---------- Drive ---------- */
    const archivos = {};
    const carpetas = {};
    function nuevoId() {
      estado.contador += 1;
      return ('1SimuladoDrive' + String(estado.contador).padStart(6, '0') + 'xxxxxxxxxx').slice(0, 33);
    }
    function crearCarpeta(nombre) {
      const id = nuevoId();
      const carpeta = encadenable({
        getId: () => id,
        getName: () => nombre,
        createFile(blob) {
          const fid = nuevoId();
          const archivo = { id: fid, nombre: blob.getName(), tipo: blob.getContentType(), bytes: blob.getBytes(), compartido: false, enPapelera: false, carpeta: id };
          archivos[fid] = archivo;
          return encadenable({
            getId: () => fid,
            setSharing() { archivo.compartido = true; return this; },
          });
        },
        setSharing() { return carpeta; },
      });
      carpetas[id] = carpeta;
      return carpeta;
    }
    const DriveApp = {
      Access: { ANYONE_WITH_LINK: 'ANYONE_WITH_LINK' },
      Permission: { VIEW: 'VIEW' },
      createFolder: crearCarpeta,
      getFolderById(id) { if (!carpetas[id]) throw new Error('No existe la carpeta'); return carpetas[id]; },
      getFileById(id) {
        const a = archivos[id];
        if (!a) throw new Error('No existe el archivo');
        return encadenable({ setTrashed(v) { a.enPapelera = !!v; return this; }, getId: () => id });
      },
    };

    /* ---------- Caché, propiedades, sesión, candado ---------- */
    const memoriaCache = {};
    const CacheService = {
      getScriptCache: () => ({
        get: (k) => (k in memoriaCache ? memoriaCache[k] : null),
        getAll: (ks) => ks.reduce((r, k) => { if (k in memoriaCache) r[k] = memoriaCache[k]; return r; }, {}),
        put: (k, v) => { memoriaCache[k] = String(v); },
        putAll: (o) => { Object.keys(o).forEach((k) => { memoriaCache[k] = String(o[k]); }); },
        remove: (k) => { delete memoriaCache[k]; },
        removeAll: (ks) => ks.forEach((k) => { delete memoriaCache[k]; }),
      }),
    };
    const propiedades = {};
    const PropertiesService = {
      getScriptProperties: () => ({
        getProperty: (k) => (k in propiedades ? propiedades[k] : null),
        setProperty: (k, v) => { propiedades[k] = String(v); },
        setProperties: (o) => { Object.keys(o).forEach((k) => { propiedades[k] = String(o[k]); }); },
      }),
    };
    const Session = {
      getActiveUser: () => ({ getEmail: () => estado.usuario }),
      getEffectiveUser: () => ({ getEmail: () => estado.propietario }),
    };
    const LockService = { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) };

    /* ---------- Utilidades ---------- */
    function base64ABytes(b64) {
      if (typeof Buffer !== 'undefined') return Array.from(Buffer.from(b64, 'base64'));
      return Array.from(atob(b64), (c) => c.charCodeAt(0));
    }
    const Utilities = {
      getUuid: () => {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, () => (Math.random() * 16 | 0).toString(16));
      },
      base64Decode: base64ABytes,
      newBlob: (bytes, tipo, nombre) => ({ getBytes: () => bytes, getContentType: () => tipo, getName: () => nombre }),
      formatDate: (d) => d.toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15),
    };

    /* ---------- Salidas web ---------- */
    const ContentService = {
      MimeType: { JSON: 'application/json' },
      createTextOutput: (texto) => {
        const salida = { texto, tipo: 'text/plain', setMimeType(t) { salida.tipo = t; return salida; }, getContent: () => texto };
        return salida;
      },
    };
    function salidaHtml(contenido) {
      const s = { contenido, titulo: '', setTitle(t) { s.titulo = t; return proxy; }, getContent: () => s.contenido };
      const proxy = encadenable(s);
      return proxy;
    }
    const HtmlService = {
      createHtmlOutput: (html) => salidaHtml(html),
      createHtmlOutputFromFile: (n) => salidaHtml(estado.archivosHtml[n] || ''),
      createTemplateFromFile: (n) => {
        const plantilla = { _archivo: n, evaluate: () => salidaHtml(`[plantilla ${n}]`) };
        return plantilla;
      },
    };

    return {
      // globales de Apps Script
      SpreadsheetApp, DriveApp, CacheService, PropertiesService, Session, LockService, Utilities,
      ContentService, HtmlService, Logger: { log() {} },
      UrlFetchApp: { fetch() { throw new Error('UrlFetchApp no disponible en el simulador'); } },
      // para inspeccionar desde las pruebas
      __simulador: { estado, libro, archivos, carpetas, memoriaCache, propiedades },
    };
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = { crearEntornoAppsScript };
  raiz.crearEntornoAppsScript = crearEntornoAppsScript;
})(typeof globalThis !== 'undefined' ? globalThis : this);
