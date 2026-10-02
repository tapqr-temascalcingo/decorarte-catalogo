/*
 * Corre el panel en el navegador sin Google: carga apps-script/Codigo.gs real sobre el simulador
 * y ofrece un google.script.run de mentira. Lo usa /panel-local/ del servidor de pruebas.
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
  var entorno = window.crearEntornoAppsScript({ usuario: parametros.get('usuario') || 'duena@gmail.com', propietario: 'duena@gmail.com' });
  entorno.UrlFetchApp = {
    fetch: function () {
      var texto = leerSincrono('/datos/demo.json');
      return { getResponseCode: function () { return 200; }, getContentText: function () { return texto; } };
    },
  };
  Object.assign(window, entorno);

  // Codigo.gs real, con las URLs apuntando al servidor local.
  var codigo = leerSincrono('/apps-script/Codigo.gs')
    .replace("'https://tapqr-temascalcingo.github.io/decorarte-catalogo/'", 'location.origin + "/"');
  var script = document.createElement('script');
  script.textContent = codigo + '\n;window.__gs = { instalar: instalar, cargarEjemplos: cargarEjemplos, doGet: doGet };';
  document.head.appendChild(script);

  window.__gs.instalar();
  if (!parametros.has('vacio')) window.__gs.cargarEjemplos();

  // google.script.run de mentira: asíncrono y con datos serializados como en Google.
  var demora = Number(parametros.get('demora') || 120);
  function corredor(exito, fallo) {
    return new Proxy({}, {
      get: function (_, nombre) {
        if (nombre === 'withSuccessHandler') return function (f) { return corredor(f, fallo); };
        if (nombre === 'withFailureHandler') return function (f) { return corredor(exito, f); };
        return function () {
          var args = JSON.parse(JSON.stringify(Array.prototype.slice.call(arguments)));
          setTimeout(function () {
            try {
              if (typeof window[nombre] !== 'function' || /_$/.test(nombre)) throw new Error('Función no disponible: ' + nombre);
              var r = window[nombre].apply(null, args);
              if (exito) exito(r === undefined ? null : JSON.parse(JSON.stringify(r)));
            } catch (err) {
              if (fallo) fallo(err); else console.error(err);
            }
          }, demora);
        };
      },
    });
  }
  window.google = { script: { run: corredor(null, null) } };
})();
