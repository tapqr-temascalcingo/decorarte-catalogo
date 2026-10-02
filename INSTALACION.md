# Instalación del catálogo Decorarte

Guía paso a paso para dejar funcionando el catálogo con los datos reales de Decorarte, **en la cuenta de Google de la dueña**.
Se hace una sola vez, de preferencia desde una computadora. Tiempo aproximado: 30 minutos.

Al terminar tendrás:

- Una **hoja de Google Sheets** con tres pestañas (Productos, Paquetes, Configuración). Es el respaldo de toda la información.
- Una **carpeta de Google Drive** con las fotos.
- El **panel de administración**, que la dueña abre desde un ícono en su celular.
- El **catálogo público** en https://tapqr-temascalcingo.github.io/decorarte-catalogo/ mostrando sus productos reales.

Todo es gratis: no hay servidores ni mensualidades.

---

## Cómo está armado

```
 Clientes ──► Catálogo (GitHub Pages) ──pide los datos──► "API catálogo" (Apps Script) ──lee──► Hoja + fotos en Drive
                                                                                                   ▲
 Dueña ─────► Ícono en su celular ──► "Panel" (Apps Script, solo correos autorizados) ──escribe────┘
```

El mismo código de Apps Script se publica **dos veces**, con permisos distintos:

| Publicación | Ejecutar como | Quién tiene acceso | Para qué |
|---|---|---|---|
| **API catálogo** | Yo (la dueña) | Cualquier persona | El catálogo lee de aquí los productos visibles. No muestra correos ni datos privados. |
| **Panel** | Usuario que accede a la aplicación web | Cualquier usuario con cuenta de Google | La dueña entra con su cuenta. Solo pasan los correos de la lista de autorizados. |

En el repositorio público solo quedan las dos direcciones `/exec`, que no son secretas: la API solo entrega lo que ya se ve en el catálogo y el panel pide iniciar sesión. **No hay llaves ni contraseñas en el repositorio.**

---

## Paso 1. Crear la hoja

1. Entra a Google **con la cuenta de la dueña**. Si hay varias cuentas abiertas en el navegador, usa una ventana de incógnito y entra solo con la suya.
2. Abre https://sheets.new. Se crea una hoja en blanco.
3. Arriba a la izquierda, cambia el nombre "Hoja de cálculo sin título" por **Decorarte – Catálogo**.

## Paso 2. Abrir Apps Script

1. En la hoja, menú **Extensiones → Apps Script**. Se abre el editor en otra pestaña.
2. Arriba a la izquierda, cambia "Proyecto sin título" por **Decorarte Panel**.

## Paso 3. Pegar el código

Los archivos están en la carpeta [`apps-script/`](apps-script/) de este repositorio. Para copiar cada uno, ábrelo en GitHub y usa el botón **Copy raw file** (ícono de dos hojas), o **Raw → seleccionar todo → copiar**.

1. **Codigo.gs**
   - En el editor ya existe `Código.gs`. Bórrale todo y pega el contenido de [`apps-script/Codigo.gs`](apps-script/Codigo.gs).
   - El nombre del archivo puede quedarse como está.
2. **Archivos HTML.** Crea uno por uno con **＋ → HTML**. Escribe el nombre **exactamente como aparece aquí, sin `.html`**, borra lo que trae y pega:

   | Nombre | Contenido |
   |---|---|
   | `Panel` | [`apps-script/Panel.html`](apps-script/Panel.html) |
   | `PanelEstilos` | [`apps-script/PanelEstilos.html`](apps-script/PanelEstilos.html) |
   | `PanelApp` | [`apps-script/PanelApp.html`](apps-script/PanelApp.html) |
   | `Fotos` | [`apps-script/Fotos.html`](apps-script/Fotos.html) |

3. **appsscript.json**
   - Ve a ⚙️ **Configuración del proyecto** y marca **Mostrar el archivo de manifiesto "appsscript.json" en el editor**.
   - Regresa al editor (ícono `< >`), abre `appsscript.json` y reemplaza su contenido por [`apps-script/appsscript.json`](apps-script/appsscript.json). Así queda la zona horaria de México.
4. Guarda con 💾 o con **Ctrl + S**.

## Paso 4. Preparar la hoja y dar permisos

1. En la barra de arriba del editor, elige la función **`instalar`** y presiona **▶ Ejecutar**.
2. Google pide permisos:
   1. **Revisar permisos** → elige la cuenta de la dueña.
   2. Aparece "Google no verificó esta app". Es normal: la app es suya y nadie más la usa. Toca **Configuración avanzada → Ir a Decorarte Panel (no seguro)**.
   3. Toca **Permitir**. Los permisos son para usar sus hojas y su Drive: el panel solo modifica esta hoja y la carpeta de fotos que crea.
3. Espera a que el registro diga "Ejecución completada". Revisa la hoja: ya tiene las pestañas **Productos**, **Paquetes** y **Configuración**. En su Drive aparece la carpeta **Decorarte Catálogo – Fotos**.
4. *(Opcional)* Para empezar con los 8 productos de ejemplo, ejecuta también **`cargarEjemplos`**. Pide un permiso más, "conectarse a un servicio externo", porque descarga los ejemplos desde GitHub. Después se pueden editar o borrar desde el panel.

> En la pestaña **Configuración**, el renglón `autorizados` ya tiene el correo de la dueña. Ahí están también el WhatsApp 527122319080, sus redes y la dirección "Temascalcingo, Estado de México". Todo eso se cambia luego desde **Ajustes** en el panel.

Si recargas la hoja, aparece el menú **Decorarte**, con las mismas opciones.

## Paso 5. Publicar la "API catálogo"

1. En el editor: **Implementar → Nueva implementación**.
2. En ⚙️ **Seleccionar tipo**, elige **Aplicación web**.
3. Llena así:
   - Descripción: `API catálogo`
   - Ejecutar como: **Yo (correo de la dueña)**
   - Quién tiene acceso: **Cualquier persona**
4. Toca **Implementar** y copia la **URL de la aplicación web**. Termina en `/exec`.
5. Pruébala: pega la URL en el navegador y agrégale `?api` al final. Ejemplo: `https://script.google.com/macros/s/AKfy…/exec?api`. Debe mostrar texto que empieza con `{"version":1,…`.

## Paso 6. Conectar el catálogo

1. En GitHub abre [`js/config.js`](js/config.js) y toca el lápiz ✏️ (**Edit this file**).
2. Pega la URL del paso 5 entre las comillas de `endpoint`, **sin** `?api`:
   ```js
   endpoint: 'https://script.google.com/macros/s/AKfy…/exec',
   ```
3. **Commit changes…** → **Commit changes**.
4. Espera 1 o 2 minutos y abre https://tapqr-temascalcingo.github.io/decorarte-catalogo/. Ya no debe aparecer la franja de "Catálogo de demostración".

> La demostración sigue disponible en `…/decorarte-catalogo/?demo` por si quieres enseñarla otra vez.

## Paso 7. Publicar el "Panel"

1. En el editor: **Implementar → Nueva implementación → Aplicación web**. Es una implementación **nueva**: no edites la del paso 5.
2. Llena así:
   - Descripción: `Panel`
   - Ejecutar como: **Usuario que accede a la aplicación web**
   - Quién tiene acceso: **Cualquier usuario con cuenta de Google**
3. **Implementar** y copia la URL. Es distinta a la del paso 5.
4. En GitHub, edita otra vez [`js/config.js`](js/config.js) y pégala en `panel`:
   ```js
   panel: 'https://script.google.com/macros/s/AKfy…otra…/exec',
   ```
   Haz commit.
5. Abre la URL del panel **en el celular de la dueña**, con su cuenta de Google. La primera vez vuelve a pedir permisos (los mismos del paso 4). Luego aparece **Tus productos**.

## Paso 8. Poner el panel en su pantalla de inicio

En el celular de la dueña abre **https://tapqr-temascalcingo.github.io/decorarte-catalogo/panel/**:

- **Android (Chrome):** menú **⋮ → Agregar a la pantalla principal** (o **Instalar app**).
- **iPhone (Safari):** botón **Compartir → Agregar a inicio**.

Le queda un ícono con su logo que abre el panel directamente.

## Paso 9. Probar que todo funciona

1. En el panel, cambia el precio de un producto y guarda.
2. Abre el catálogo y recarga. La primera vista sale de la copia guardada en el teléfono y en uno o dos segundos se actualiza sola. Si no ves el cambio, recarga una vez más.
3. Desde el catálogo, toca **Lo quiero** en un producto: debe abrirse WhatsApp con el mensaje escrito.
4. Agrega un producto con foto tomada desde el celular y revisa que aparezca en el catálogo.

---

## Mantenimiento

### Actualizar el código de Apps Script

Si en el futuro cambia algún archivo de `apps-script/`:

1. Pega el código nuevo en el editor y guarda.
2. **Implementar → Gestionar implementaciones**.
3. Selecciona **API catálogo** → ✏️ → Versión: **Nueva versión** → **Implementar**.
4. Repite con **Panel**.

Las URL no cambian, así que no hay que tocar `js/config.js`.

### Dar acceso a otra persona (por ejemplo, una ayudante)

El panel funciona con los permisos de quien entra, así que esa persona necesita dos cosas:

1. Que su correo esté en **Ajustes → Personas con acceso al panel**.
2. Que la dueña le **comparta como Editor** la hoja **Decorarte – Catálogo** y la carpeta **Decorarte Catálogo – Fotos** de Drive.

Para quitarle el acceso, se hace lo contrario.

### Si alguien edita la hoja a mano

No hace falta, pero si pasa, el catálogo se actualiza solo. Si algo no se refleja, usa el menú **Decorarte → Publicar cambios hechos a mano en la hoja**.

---

## Solución de problemas

| Qué pasa | Qué hacer |
|---|---|
| El catálogo sigue diciendo "demostración" | Revisa que `endpoint` en `js/config.js` tenga la URL `/exec` y que el commit esté hecho. GitHub Pages tarda 1–2 minutos; recarga sin caché. |
| El catálogo dice "No pudimos cargar el catálogo" | Abre la URL de la API con `?api`. Si pide iniciar sesión, la implementación no está en **Cualquier persona**: créala otra vez como en el paso 5. Si muestra `{"error":…}`, lee el mensaje; casi siempre falta ejecutar `instalar`. |
| El panel dice "Este panel es privado" | El correo con el que se entró no está autorizado, o el navegador usó otra cuenta. Abre el panel en incógnito o cierra las demás cuentas de Google. |
| El panel no carga o se queda en "Cargando…" con varias cuentas abiertas | Es una limitación conocida de Google con varias sesiones a la vez. Usa el navegador con una sola cuenta, o el ícono instalado. |
| Una foto no se ve en el catálogo | Las fotos se comparten solas como "Cualquier persona con el enlace". Revisa en Drive que la foto esté en la carpeta y no en la papelera. Mientras tanto, el catálogo muestra el logo. |
| "No tienes permiso para hacer cambios" al guardar | Ese correo ya no está en la lista de autorizados, o (si es ayudante) no tiene la hoja compartida como Editor. |
| Cambié el código y no se nota | Falta publicar una **Nueva versión** en las dos implementaciones (ver "Actualizar el código"). |

## Límites del plan gratuito

Sobran para una tienda local:

- **GitHub Pages:** hasta unos 100 GB de tráfico al mes. El catálogo pesa menos de 200 KB, sin contar fotos.
- **Apps Script (cuenta personal):** el límite que importa es de unas 30 ejecuciones **al mismo tiempo**. La API responde desde caché (CacheService) en menos de un segundo, y cada teléfono guarda su propia copia, así que alcanza de sobra para el tráfico de una tienda local.
- **Google Drive:** 15 GB compartidos con Gmail. Cada foto reducida pesa entre 150 y 300 KB, o sea, decenas de miles de fotos.

## Para desarrolladores

```bash
npm install
npx playwright install chromium   # solo la primera vez
npm run servir                    # catálogo en http://localhost:8080 y panel simulado en /panel-local/
npm test                          # lógica del catálogo + Codigo.gs sobre un simulador de Google
npm run test:navegador            # catálogo y panel en Chromium (Pixel 7 / iPhone 13)
npm run capturas                  # regenera docs/capturas/ para el MANUAL.md
```

`/panel-local/` corre el **mismo** `Codigo.gs` y los mismos HTML del panel en el navegador, sobre un simulador en memoria de la hoja, Drive y la caché (`tests/simulador/`). Sirve para probar cambios del panel sin publicarlo.
