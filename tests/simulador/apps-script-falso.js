/*
 * Simulador mínimo de los servicios de Google Apps Script que usa apps-script/Codigo.gs:
 * SpreadsheetApp, Drive (servicio avanzado v3 con reglas de drive.file), CacheService,
 * PropertiesService, Session, LockService, Utilities, ContentService y HtmlService. Todo en memoria.
 *
 * Sirve en Node (pruebas, con vm) y en el navegador (panel local para capturas).
 *
 * El proyecto es independiente (no ligado a la hoja): getActiveSpreadsheet() da null y la hoja se
 * abre por su ID. Puede haber varias hojas (por ejemplo, la de una instalación de prueba anterior).
 * Drive con drive.file: cada cuenta ve solo lo que creó con ESTE proyecto (estado.proyecto).
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
      proyecto: opciones.proyecto || 'proyecto-definitivo', // ID del proyecto de Apps Script
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

    // Hojas de cálculo: cada una con su dueña y sus editores. Solo ellos pueden abrirla (como en Google).
    const libros = {};
    const usuario = (correo) => ({ getEmail: () => correo });
    function crearLibro(id, nombre, dueno) {
      const hojas = [crearHoja('Hoja 1')];
      const editores = new Set();
      const tieneAcceso = () => efectivo() === dueno || editores.has(efectivo());
      function exigirAcceso() {
        if (!tieneAcceso()) throw new Error('Exception: No cuentas con el permiso necesario para acceder al documento solicitado.');
      }
      function exigirCompartir() {
        exigirAcceso();
        if (efectivo() !== dueno && !estado.editoresPuedenCompartir) {
          throw new Error('Exception: Access denied: You do not have permission to share this document.');
        }
      }
      const libro = encadenable({
        _editores: editores,
        _dueno: dueno,
        _tieneAcceso: tieneAcceso,
        getId: () => id,
        getName: () => nombre,
        getUrl: () => 'https://docs.google.com/spreadsheets/d/' + id + '/edit',
        getSheetByName: (n) => { exigirAcceso(); return hojas.find((h) => h.getName() === n) || null; },
        getSheets: () => { exigirAcceso(); return hojas.slice(); },
        getOwner: () => usuario(dueno),
        getEditors: () => { exigirAcceso(); return [...editores].map(usuario); },
        addEditor(correo) {
          exigirCompartir();
          correo = String(correo).toLowerCase();
          if (!/@/.test(correo) || /@no-es-google\.test$/.test(correo)) throw new Error('Exception: Invalid email: ' + correo);
          if (correo !== dueno) { editores.add(correo); estado.correosCompartidos.push(correo); }
          return libro;
        },
        removeEditor(correo) {
          exigirCompartir();
          editores.delete(String(correo).toLowerCase());
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
        toast() { throw new Error('toast() solo existe en scripts ligados a la hoja'); },
      });
      libros[id] = libro;
      return libro;
    }
    /** La hoja de esta instalación (la que dice la propiedad idHoja). */
    const libroActual = () => libros[propiedades.idHoja] || null;
    Object.defineProperty(estado, 'editores', { get: () => (libroActual() ? libroActual()._editores : new Set()) });

    const SpreadsheetApp = {
      getActiveSpreadsheet: () => null, // proyecto independiente: no hay hoja "activa"
      openById(id) {
        const l = libros[id];
        if (!l) throw new Error('Exception: Unexpected error while getting the method or property openById on object SpreadsheetApp.');
        l.getSheets(); // exige acceso
        return l;
      },
      flush() {},
      getUi: () => { throw new Error('Cannot call SpreadsheetApp.getUi() from this context.'); },
    };
    const ScriptApp = { getScriptId: () => estado.proyecto };

    /* ---------- Drive (servicio avanzado v3, reglas de drive.file) ---------- */
    // drive.file: cada cuenta solo puede ver y modificar los archivos que creó con esta app.
    const archivos = {};
    function nuevoId() {
      estado.contador += 1;
      return ('1SimuladoDrive' + String(estado.contador).padStart(6, '0') + 'xxxxxxxxxx').slice(0, 33);
    }
    function accesible(id) {
      const a = archivos[id];
      if (!a || a.dueno !== efectivo() || a.app !== estado.proyecto) {
        const e = new Error(`GoogleJsonResponseException: File not found: ${id}.`);
        throw e;
      }
      return a;
    }
    const Drive = {
      Files: {
        create(recurso, blob) {
          quizaFallar(recurso.mimeType === 'application/vnd.google-apps.folder' ? 'crearCarpeta'
            : recurso.mimeType === 'application/vnd.google-apps.spreadsheet' ? 'crearHoja' : 'crearArchivo');
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
            app: estado.proyecto,
            compartido: false,
            enPapelera: false,
          };
          if (recurso.mimeType === 'application/vnd.google-apps.spreadsheet') crearLibro(id, recurso.name, efectivo());
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
          const claves = [...q.matchAll(/appProperties has \{ key='([\w-]+)' and value='([\w-]+)' \}/g)];
          const tipo = /mimeType='([^']+)'/.exec(q);
          const files = Object.values(archivos).filter((a) => a.dueno === efectivo() && a.app === estado.proyecto
            && (!/trashed=false/.test(q) || !a.enPapelera)
            && (!tipo || a.tipo === tipo[1])
            && claves.every((k) => a.appProperties[k[1]] === k[2]))
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
      SpreadsheetApp, ScriptApp, Drive, CacheService, PropertiesService, Session, LockService, Utilities,
      ContentService, HtmlService,
      Logger: { log(m) { estado.ultimoAviso = String(m); (estado.registro || (estado.registro = [])).push(String(m)); } },
      // para inspeccionar desde las pruebas
      __simulador: {
        estado, archivos, libros, memoriaCache, propiedades, propiedadesUsuario,
        get libro() { return libroActual(); },
        /** Crea la hoja y la carpeta de OTRA instalación (otro proyecto) con los mismos nombres. */
        crearInstalacionVieja(proyecto) {
          const antes = { proyecto: estado.proyecto, usuario: estado.usuario, ejecutaComo: estado.ejecutaComo };
          Object.assign(estado, { proyecto, usuario: estado.propietario, ejecutaComo: 'usuario' });
          try {
            const hoja = Drive.Files.create({ name: 'Decorarte – Catálogo', mimeType: 'application/vnd.google-apps.spreadsheet', appProperties: { decorarte: 'hoja' } }).id;
            const carpeta = Drive.Files.create({ name: 'Decorarte Catálogo – Fotos', mimeType: 'application/vnd.google-apps.folder', appProperties: { decorarte: 'fotos' } }).id;
            libros[hoja].insertSheet('Productos').appendRow(['ID', 'Nombre']).appendRow(['viejo1', 'Producto de la prueba']);
            return { hoja, carpeta };
          } finally { Object.assign(estado, antes); }
        },
      },
    };
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = { crearEntornoAppsScript };
  raiz.crearEntornoAppsScript = crearEntornoAppsScript;
})(typeof globalThis !== 'undefined' ? globalThis : this);
