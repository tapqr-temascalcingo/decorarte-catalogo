/*
 * Simulador mínimo de los servicios de Google Apps Script que usa apps-script/Codigo.gs:
 * SpreadsheetApp, Drive (servicio avanzado v3 con reglas de drive.file), CacheService,
 * PropertiesService, Session, LockService, Utilities, ContentService y HtmlService. Todo en memoria.
 *
 * Sirve en Node (pruebas, con vm) y en el navegador (panel local para capturas).
 *
 * Quién usa el script:
 *   estado.usuario      correo de la sesión ('' = sin sesión)       -> Session.getActiveUser()
 *   estado.ejecutaComo  'usuario' (implementación Panel) o 'propietario' (API catálogo / editor)
 *   El usuario efectivo es quien "es dueño" de lo que se crea en Drive.
 */
(function (raiz) {
  function crearEntornoAppsScript(opciones) {
    opciones = opciones || {};
    const estado = {
      usuario: opciones.usuario === undefined ? 'duena@gmail.com' : opciones.usuario,
      propietario: opciones.propietario || 'duena@gmail.com',
      ejecutaComo: opciones.ejecutaComo || 'usuario',
      archivosHtml: opciones.archivosHtml || {},
      contador: 0,
      fallas: {}, // nombre de operación -> número de veces que debe fallar (para simular cortes)
      editores: new Set(),               // cuentas con la hoja compartida como Editor
      editoresPuedenCompartir: false,    // la casilla que se desmarca en la hoja (INSTALACION.md)
      correosCompartidos: [],            // avisos que Google mandaría al compartir
    };
    const efectivo = () => (estado.ejecutaComo === 'propietario' ? estado.propietario : estado.usuario);
    function quizaFallar(operacion) {
      if (estado.fallas[operacion] > 0) {
        estado.fallas[operacion] -= 1;
        throw new Error('Falla simulada en ' + operacion);
      }
    }

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

    const hojas = [crearHoja('Hoja 1')];
    // Solo la dueña de la hoja y quienes la tienen compartida pueden leerla (como en Google).
    const tieneAcceso = () => efectivo() === estado.propietario || estado.editores.has(efectivo());
    function exigirAcceso() {
      if (!tieneAcceso()) throw new Error('Exception: No cuentas con el permiso necesario para acceder al documento solicitado.');
    }
    function exigirCompartir() {
      exigirAcceso();
      if (efectivo() !== estado.propietario && !estado.editoresPuedenCompartir) {
        throw new Error('Exception: Access denied: You do not have permission to share this document.');
      }
    }
    const usuario = (correo) => ({ getEmail: () => correo });
    const libro = encadenable({
      getId: () => 'libro-de-prueba',
      getSheetByName: (n) => { exigirAcceso(); return hojas.find((h) => h.getName() === n) || null; },
      getSheets: () => { exigirAcceso(); return hojas.slice(); },
      getOwner: () => usuario(estado.propietario),
      getEditors: () => { exigirAcceso(); return [...estado.editores].map(usuario); },
      addEditor(correo) {
        exigirCompartir();
        correo = String(correo).toLowerCase();
        if (!/@/.test(correo) || /@no-es-google\.test$/.test(correo)) throw new Error('Exception: Invalid email: ' + correo);
        if (correo !== estado.propietario) { estado.editores.add(correo); estado.correosCompartidos.push(correo); }
        return libro;
      },
      removeEditor(correo) {
        exigirCompartir();
        estado.editores.delete(String(correo).toLowerCase());
        return libro;
      },
      insertSheet(n) {
        exigirAcceso();
        quizaFallar('insertSheet');
        if (hojas.some((h) => h.getName() === n)) throw new Error(`Ya existe una hoja con el nombre "${n}"`);
        const h = crearHoja(n);
        hojas.push(h);
        return h;
      },
      deleteSheet(h) { hojas.splice(hojas.indexOf(h), 1); },
      toast(m) { estado.ultimoAviso = m; },
    });

    const SpreadsheetApp = {
      getActiveSpreadsheet: () => libro,
      openById: () => libro,
      flush() {},
      getUi: () => encadenable({
        alert() { throw new Error('alert() bloquearía la ejecución: no se debe usar'); },
      }),
    };

    /* ---------- Drive (servicio avanzado v3, reglas de drive.file) ---------- */
    // drive.file: cada cuenta solo puede ver y modificar los archivos que creó con esta app.
    const archivos = {};
    function nuevoId() {
      estado.contador += 1;
      return ('1SimuladoDrive' + String(estado.contador).padStart(6, '0') + 'xxxxxxxxxx').slice(0, 33);
    }
    function accesible(id) {
      const a = archivos[id];
      if (!a || a.dueno !== efectivo()) {
        const e = new Error(`GoogleJsonResponseException: File not found: ${id}.`);
        throw e;
      }
      return a;
    }
    const Drive = {
      Files: {
        create(recurso, blob) {
          quizaFallar(recurso.mimeType === 'application/vnd.google-apps.folder' ? 'crearCarpeta' : 'crearArchivo');
          if (recurso.parents) recurso.parents.forEach(accesible);
          const id = nuevoId();
          archivos[id] = {
            id,
            nombre: recurso.name,
            tipo: recurso.mimeType || (blob && blob.getContentType()),
            carpeta: recurso.parents ? recurso.parents[0] : null,
            appProperties: recurso.appProperties || {},
            bytes: blob ? blob.getBytes() : null,
            dueno: efectivo(),
            compartido: false,
            enPapelera: false,
          };
          return { id, name: recurso.name };
        },
        get(id) {
          const a = accesible(id);
          return { id: a.id, trashed: a.enPapelera };
        },
        update(recurso, id) {
          const a = accesible(id);
          if ('trashed' in recurso) a.enPapelera = !!recurso.trashed;
          return { id };
        },
        list(opciones) {
          const q = opciones.q || '';
          const clave = /appProperties has \{ key='(\w+)' and value='(\w+)' \}/.exec(q);
          const files = Object.values(archivos).filter((a) => a.dueno === efectivo()
            && (!/trashed=false/.test(q) || !a.enPapelera)
            && (!/mimeType='application\/vnd\.google-apps\.folder'/.test(q) || a.tipo === 'application/vnd.google-apps.folder')
            && (!clave || a.appProperties[clave[1]] === clave[2]))
            .slice(0, opciones.pageSize || 100)
            .map((a) => ({ id: a.id }));
          return { files };
        },
      },
      Permissions: {
        create(permiso, id) {
          const a = accesible(id);
          if (permiso.type === 'anyone' && permiso.role === 'reader') a.compartido = true;
          return { id: 'anyoneWithLink' };
        },
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
    function almacenPropiedades(datos) {
      return {
        getProperty: (k) => (k in datos ? datos[k] : null),
        setProperty: (k, v) => { datos[k] = String(v); },
        setProperties: (o) => { Object.keys(o).forEach((k) => { datos[k] = String(o[k]); }); },
        deleteProperty: (k) => { delete datos[k]; },
      };
    }
    const propiedades = {};
    const propiedadesUsuario = {};
    const PropertiesService = {
      getScriptProperties: () => almacenPropiedades(propiedades),
      getUserProperties: () => almacenPropiedades(propiedadesUsuario[efectivo()] || (propiedadesUsuario[efectivo()] = {})),
    };
    const Session = {
      getActiveUser: () => ({ getEmail: () => estado.usuario }),
      getEffectiveUser: () => ({ getEmail: () => efectivo() }),
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
        const salida = { texto, tipo: 'text/plain', esHtml: false, setMimeType(t) { salida.tipo = t; return salida; }, getContent: () => texto };
        return salida;
      },
    };
    function salidaHtml(contenido) {
      const s = { contenido, titulo: '', esHtml: true, setTitle(t) { s.titulo = t; return proxy; }, getContent: () => s.contenido };
      const proxy = encadenable(s);
      return proxy;
    }
    const HtmlService = {
      createHtmlOutput: (html) => salidaHtml(html),
      createHtmlOutputFromFile: (n) => salidaHtml(estado.archivosHtml[n] || ''),
      createTemplateFromFile: (n) => ({ _archivo: n, evaluate: () => salidaHtml(`[plantilla ${n}]`) }),
    };

    return {
      // globales de Apps Script
      SpreadsheetApp, Drive, CacheService, PropertiesService, Session, LockService, Utilities,
      ContentService, HtmlService, Logger: { log() {} },
      // para inspeccionar desde las pruebas
      __simulador: { estado, libro, archivos, memoriaCache, propiedades, propiedadesUsuario },
    };
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = { crearEntornoAppsScript };
  raiz.crearEntornoAppsScript = crearEntornoAppsScript;
})(typeof globalThis !== 'undefined' ? globalThis : this);
