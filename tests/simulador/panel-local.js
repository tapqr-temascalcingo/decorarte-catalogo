/*
 * Corre el panel en el navegador sin Google: carga apps-script/Codigo.gs real sobre el simulador
 * y ofrece un google.script.run de mentira. Lo usa /panel-local/ del servidor de pruebas.
 *
 * Parámetros de la URL:
 *   ?usuario=correo        sesión de quien entra ('' = sin sesión). Por defecto, la dueña.
 *   ?implementacion=api    simula que estas llamadas llegan a la implementación "API catálogo".
 *   ?vacio                 sin productos de ejemplo.   ?demora=ms  latencia de cada llamada.
 */
(function () {
  function leerSincrono(url) {
    var x = new XMLHttpRequest();
    x.open('GET', url, false);
    x.send();
    if (x.status !== 200) throw new Error('No se pudo leer ' + url);
    return x.responseText;
  }

  var parametros = new URLSearchParams(location.search);
  var implementacion = parametros.get('implementacion') || 'panel';
  var usuario = parametros.has('usuario') ? parametros.get('usuario') : 'duena@gmail.com';
  var entorno = window.crearEntornoAppsScript({
    usuario: 'duena@gmail.com', propietario: 'duena@gmail.com',
    ejecutaComo: implementacion === 'panel' ? 'usuario' : 'propietario',
  });
  Object.assign(window, entorno);

  // Ejemplos.gs y Codigo.gs reales, con las URLs apuntando al servidor local.
  var codigo = 'const IMPLEMENTACION = ' + JSON.stringify(implementacion) + ';\n' +
    leerSincrono('/apps-script/Ejemplos.gs') + '\n' +
    leerSincrono('/apps-script/Codigo.gs').replace("'https://tapqr-temascalcingo.github.io/decorarte-catalogo/'", 'location.origin + "/"');
  var script = document.createElement('script');
  script.textContent = codigo + '\n;window.__gs = { instalar: instalar, cargarEjemplos: cargarEjemplos, doGet: doGet, api: function () { return JSON.parse(jsonPublicoConCache_()); } };';
  document.head.appendChild(script);

  // La dueña instala desde el editor; después entra quien diga la URL.
  window.__gs.instalar();
  if (!parametros.has('vacio')) window.__gs.cargarEjemplos();
  entorno.__simulador.estado.usuario = usuario;

  // google.script.run de mentira: asíncrono y con datos serializados como en Google.
  // window.__falloSubida = n  hace que las siguientes n subidas de foto fallen (señal perdida).
  var demora = Number(parametros.get('demora') || 120);
  function corredor(exito, fallo) {
    return new Proxy({}, {
      get: function (_, nombre) {
        if (nombre === 'withSuccessHandler') return function (f) { return corredor(f, fallo); };
        if (nombre === 'withFailureHandler') return function (f) { return corredor(exito, f); };
        return function () {
          var args = JSON.parse(JSON.stringify(Array.prototype.slice.call(arguments)));
          var espera = nombre === 'panelSubirFotoProducto' ? Number(window.__demoraSubida || demora) : demora;
          setTimeout(function () {
            try {
              if (typeof window[nombre] !== 'function' || /_$/.test(nombre)) throw new Error('Función no disponible: ' + nombre);
              if (nombre === 'panelSubirFotoProducto' && window.__falloSubida > 0) {
                window.__falloSubida -= 1;
                throw new Error('Se perdió la conexión');
              }
              var r = window[nombre].apply(null, args);
              if (exito) exito(r === undefined ? null : JSON.parse(JSON.stringify(r)));
            } catch (err) {
              if (fallo) fallo(err); else console.error(err);
            }
          }, espera);
        };
      },
    });
  }
  window.google = { script: { run: corredor(null, null) } };
})();
