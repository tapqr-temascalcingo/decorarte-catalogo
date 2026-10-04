# Instalación del catálogo Decorarte

Guía paso a paso para dejar funcionando el catálogo con los datos reales de Decorarte, **en la cuenta de Google del negocio**
(una cuenta creada solo para el catálogo). Se hace una sola vez, de preferencia desde una computadora. Tiempo aproximado: 30 minutos.

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

El mismo proyecto de Apps Script se publica **dos veces**. Cada publicación ("implementación") queda fijada a una versión
del código en la que el archivo `Implementacion.gs` dice qué es:

| Implementación | `Implementacion.gs` | Ejecutar como | Quién tiene acceso | Qué hace |
|---|---|---|---|---|
| **API catálogo** | `'api'` | Yo (la cuenta del negocio) | Cualquier persona | Solo entrega el JSON público del catálogo. Nunca muestra páginas ni acepta cambios, aunque se abra sin `?api` o con sesión. |
| **Panel** | `'panel'` | Usuario que accede a la aplicación web | Cualquier usuario con cuenta de Google | Muestra el panel solo a los correos autorizados. |

Si `Implementacion.gs` falta o dice cualquier cosa distinta de `'panel'`, el código se comporta como **API** (lo más cerrado).
Además, `instalar`, `cargarEjemplos` y `publicarCambios` solo funcionan para la cuenta que instaló.

En el repositorio público solo quedan las dos direcciones `/exec`, que no son secretas. **No hay llaves ni contraseñas en el repositorio.**

### Permisos que pide

Al autorizar, Google muestra esta lista (el texto exacto en español puede variar un poco según el idioma de la cuenta):

| Lo que verá la dueña | Original en inglés | Para qué |
|---|---|---|
| **Ver, editar, crear y eliminar todas tus hojas de cálculo de Hojas de cálculo de Google** | See, edit, create, and delete all your Google Sheets spreadsheets | Leer y guardar productos en la hoja del catálogo. |
| **Ver, editar, crear y borrar solo los archivos específicos de Google Drive que uses con esta app** | See, edit, create, and delete only the specific Google Drive files you use with this app | Crear la carpeta de fotos y subir las fotos. **No** puede ver ningún otro archivo de su Drive. |
| **Ver la dirección de correo electrónico principal de tu Cuenta de Google** | See your primary Google Account email address | Saber quién entra al panel para dejar pasar solo a los autorizados. |

Ya **no** se pide "ver, editar y borrar todos tus archivos de Drive" ni "conectarse a un servicio externo".

> **¿Por qué el de hojas de cálculo dice "todas"?** Existe un permiso más estrecho (`spreadsheets.currentonly`, "solo la hoja
> donde está instalada"), pero está pensado para menús y barras laterales dentro de la hoja. No hay garantía de que funcione
> cuando el código corre como aplicación web, que es como corren la API y el panel. En la práctica el código solo abre la
> hoja a la que está ligado.

---

## Paso 1. Crear la hoja

1. Entra a Google **con la cuenta del negocio**. Si hay varias cuentas abiertas en el navegador, usa una ventana de incógnito y entra solo con esa.
2. Abre https://sheets.new. Se crea una hoja en blanco.
3. Arriba a la izquierda, cambia el nombre "Hoja de cálculo sin título" por **Decorarte – Catálogo**.

## Paso 2. Abrir Apps Script

1. En la hoja, menú **Extensiones → Apps Script**. Se abre el editor en otra pestaña.
2. Arriba a la izquierda, cambia "Proyecto sin título" por **Decorarte Panel**.

## Paso 3. Pegar el código

Los archivos están en la carpeta [`apps-script/`](apps-script/) de este repositorio. Para copiar cada uno, ábrelo en GitHub y usa el botón **Copy raw file** (ícono de dos hojas).

1. **appsscript.json** (primero, porque activa el servicio de Drive y fija los permisos)
   - Ve a ⚙️ **Configuración del proyecto** y marca **Mostrar el archivo de manifiesto "appsscript.json" en el editor**.
   - Regresa al editor (ícono `< >`), abre `appsscript.json` y reemplaza todo su contenido por [`apps-script/appsscript.json`](apps-script/appsscript.json).
   - Guarda. En la lista de la izquierda, bajo **Servicios**, debe aparecer **Drive**.
2. **Archivos de código.** `Código.gs` ya existe: bórrale todo y pega [`Codigo.gs`](apps-script/Codigo.gs). Crea los otros dos con **＋ → Secuencia de comandos**, con el nombre exacto y sin `.gs`:

   | Nombre | Contenido |
   |---|---|
   | `Código` (ya existe) | [`apps-script/Codigo.gs`](apps-script/Codigo.gs) |
   | `Implementacion` | [`apps-script/Implementacion.gs`](apps-script/Implementacion.gs) |
   | `Ejemplos` | [`apps-script/Ejemplos.gs`](apps-script/Ejemplos.gs) |

3. **Archivos HTML.** Crea uno por uno con **＋ → HTML**, con el nombre **exacto y sin `.html`**. Borra lo que traen y pega:

   | Nombre | Contenido |
   |---|---|
   | `Panel` | [`apps-script/Panel.html`](apps-script/Panel.html) |
   | `PanelEstilos` | [`apps-script/PanelEstilos.html`](apps-script/PanelEstilos.html) |
   | `PanelApp` | [`apps-script/PanelApp.html`](apps-script/PanelApp.html) |
   | `Fotos` | [`apps-script/Fotos.html`](apps-script/Fotos.html) |

4. Guarda con 💾 o con **Ctrl + S**.

## Paso 4. Preparar la hoja y dar permisos

1. En la barra de arriba del editor, elige la función **`instalar`** y presiona **▶ Ejecutar**.
2. Google pide permisos:
   1. **Revisar permisos** → elige la cuenta del negocio.
   2. Aparece "Google no verificó esta app". Es normal: la app es del negocio y nadie más la usa. Toca **Configuración avanzada → Ir a Decorarte Panel (no seguro)**.
   3. Revisa que la lista sea la de la tabla **Permisos que pide** de arriba y toca **Permitir**.
3. El registro de ejecución muestra los pasos `1/4 … 4/4` y termina en segundos. Revisa la hoja: ya tiene las pestañas **Productos**, **Paquetes** y **Configuración**. En el Drive aparece la carpeta **Decorarte Catálogo – Fotos**.
4. *(Opcional)* Para empezar con los 8 productos de ejemplo, ejecuta también **`cargarEjemplos`**. Ya no pide permisos extra.

> `instalar` y `cargarEjemplos` se pueden ejecutar las veces que haga falta. Si una se corta a medias (por ejemplo, se
> cerró la pestaña), vuelve a ejecutarla: continúa donde se quedó sin duplicar pestañas, renglones, carpetas ni productos.

En la pestaña **Configuración**, el renglón `autorizados` ya tiene el correo de la cuenta que instaló. Ahí están también el WhatsApp 527122319080, las redes y la dirección "Temascalcingo, Estado de México". Todo eso se cambia luego desde **Ajustes** en el panel.

## Paso 5. Publicar la "API catálogo"

1. Abre **`Implementacion.gs`** y confirma que dice exactamente:
   ```js
   const IMPLEMENTACION = 'api';
   ```
   Guarda.
2. **Implementar → Nueva implementación** → ⚙️ **Aplicación web**:
   - Descripción: `API catálogo`
   - Ejecutar como: **Yo**
   - Quién tiene acceso: **Cualquier persona**
3. **Implementar** y copia la **URL de la aplicación web** (termina en `/exec`).
4. **Comprobación:** abre esa URL **tal cual, sin `?api`**, en una pestaña normal (con sesión).
   - Debe mostrar texto que empieza con `{"version":1,…`.
   - Si muestra una página (el panel o "Este panel es privado"), `Implementacion.gs` no decía `'api'`: corrígelo y publica una versión nueva (ver "Actualizar el código").

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

1. Abre **`Implementacion.gs`**, cambia la línea a:
   ```js
   const IMPLEMENTACION = 'panel';
   ```
   Guarda.
2. **Implementar → Nueva implementación → Aplicación web**. Es una implementación **nueva**: no edites la del paso 5.
   - Descripción: `Panel`
   - Ejecutar como: **Usuario que accede a la aplicación web**
   - Quién tiene acceso: **Cualquier usuario con cuenta de Google**
3. **Implementar** y copia la URL. Es distinta a la del paso 5.
4. **Regresa `Implementacion.gs` a `'api'` y guarda.** Las implementaciones ya quedaron fijadas a su versión, así que esto no les afecta. Así, el código guardado queda en el modo más cerrado.
5. **Comprobación:** abre otra vez la URL de la **API** (paso 5) sin `?api`. Debe seguir mostrando `{"version":1,…`.
6. En GitHub, edita otra vez [`js/config.js`](js/config.js) y pega la URL del panel en `panel`:
   ```js
   panel: 'https://script.google.com/macros/s/AKfy…otra…/exec',
   ```
   Haz commit.

## Paso 8. Entrega: el celular de la dueña

La dueña tendrá **dos cuentas de Google** en su iPhone (la personal y la del negocio). Con varias cuentas abiertas en el mismo
navegador, Google suele mostrar **«No se pudo abrir el archivo»** al abrir el panel. Es una limitación conocida de Apps Script.
Para evitarlo, el panel se usa en **un navegador dedicado al catálogo**, donde solo está la cuenta del negocio:

1. Elige el navegador dedicado. Si en Safari tiene su cuenta personal, instala **Google Chrome** desde la App Store y úsalo solo para el panel.
2. En ese navegador entra a **google.com** e inicia sesión **solo** con la cuenta del negocio. No agregues la cuenta personal ahí.
3. En ese mismo navegador abre **https://tapqr-temascalcingo.github.io/decorarte-catalogo/panel/**.
4. Agrega el acceso a la pantalla de inicio:
   - **Chrome en iPhone:** botón **Compartir** (cuadro con flecha, arriba a la derecha) → **Agregar a pantalla de inicio**.
   - **Safari en iPhone:** botón **Compartir** → **Agregar a inicio**.
   - **Android (Chrome):** menú **⋮ → Agregar a la pantalla principal** (o **Instalar app**).
5. Toca el ícono nuevo, entra con la cuenta del negocio y autoriza los permisos la primera vez (los mismos del paso 4).
6. Pruébalo enfrente de ella: agrega un producto con foto desde la cámara.

Si alguna vez sale «No se pudo abrir el archivo», la página del ícono muestra la ayuda paso a paso. También está en el [MANUAL](MANUAL.md#9-si-te-sale-no-se-pudo-abrir-el-archivo).

## Paso 9. Probar que todo funciona

1. En el panel, cambia el precio de un producto y guarda.
2. Abre el catálogo y recarga: el cambio se ve en unos segundos (la página primero muestra la copia guardada en el teléfono y se actualiza sola).
3. Desde el catálogo, toca **Lo quiero** en un producto: debe abrirse WhatsApp con el mensaje escrito.
4. Agrega un producto con foto tomada desde el celular. Se guarda al momento; la tarjeta dice "Subiendo foto…" unos segundos y después la foto aparece en el catálogo.

---

## Mantenimiento

### Actualizar el código de Apps Script

Las URL de las dos implementaciones **no cambian** si se actualizan así (con "Gestionar implementaciones", nunca con "Nueva implementación"):

1. Pega el código nuevo en el editor (los archivos que hayan cambiado) y guarda.
2. **API catálogo**
   1. En `Implementacion.gs` deja `const IMPLEMENTACION = 'api';` y guarda.
   2. **Implementar → Gestionar implementaciones** → selecciona **API catálogo** → ✏️ → Versión: **Nueva versión** → **Implementar**.
   3. **Comprobación:** abre la URL de la API **sin `?api`**. Debe salir `{"version":1,…}` y **no** una página. Si sale una página, repite este paso con `'api'`.
3. **Panel**
   1. En `Implementacion.gs` cambia a `const IMPLEMENTACION = 'panel';` y guarda.
   2. **Gestionar implementaciones** → **Panel** → ✏️ → Versión: **Nueva versión** → **Implementar**.
   3. **Comprobación:** abre la URL del panel: debe salir el panel. Si sale texto `{"version":1,…}`, la versión no decía `'panel'`.
4. Regresa `Implementacion.gs` a `'api'` y guarda.
5. **Comprobación final:** abre otra vez la URL de la API sin `?api`. Debe seguir saliendo `{"version":1,…}`.

Si un cambio modifica `appsscript.json` (los permisos), Google pide autorizar de nuevo: ejecuta `instalar` desde el editor
y abre el panel una vez con cada cuenta autorizada.

### Dar acceso a otra persona (por ejemplo, una ayudante)

El panel funciona con los permisos de quien entra. Esa persona necesita:

1. Que su correo esté en **Ajustes → Personas con acceso al panel**.
2. Que se le **comparta como Editor** la hoja **Decorarte – Catálogo**.

Por el permiso `drive.file`, las fotos que suba **esa persona** se guardan en una carpeta **de su propio Drive**, no en la del negocio.
Se ven igual en el catálogo, pero si ella las borra o cierra su cuenta, desaparecen. Por eso el MANUAL pide subir fotos desde la cuenta del negocio.

### Si alguien edita la hoja a mano

No hace falta, pero si pasa, el catálogo se actualiza solo. Si algo no se refleja, usa el menú **Decorarte → Publicar cambios hechos a mano en la hoja**
(solo la cuenta que instaló). Si el menú **Decorarte** no aparece, ejecuta `publicarCambios` desde el editor.

---

## Solución de problemas

| Qué pasa | Qué hacer |
|---|---|
| El catálogo sigue diciendo "demostración" | Revisa que `endpoint` en `js/config.js` tenga la URL `/exec` y que el commit esté hecho. GitHub Pages tarda 1–2 minutos; recarga sin caché. |
| El catálogo dice "No pudimos cargar el catálogo" | Abre la URL de la API. Si pide iniciar sesión, la implementación no está en **Cualquier persona**. Si muestra `{"error":…}`, lee el mensaje; casi siempre falta ejecutar `instalar`. |
| La URL de la API muestra una página | Esa versión se publicó con `Implementacion.gs` en `'panel'`. Sigue "Actualizar el código", paso 2. |
| La URL del panel muestra `{"version":1,…}` | Esa versión se publicó con `'api'`. Sigue "Actualizar el código", paso 3. |
| «No se pudo abrir el archivo» (sobre todo en iPhone) | Hay varias cuentas de Google en ese navegador. Usa el navegador dedicado del paso 8. |
| El panel dice "Este panel es privado" | El correo con el que se entró no está autorizado, o el navegador usó otra cuenta. |
| "Solo la dueña del catálogo puede ejecutar esta función" | `instalar`, `cargarEjemplos` y `publicarCambios` solo las ejecuta la cuenta que instaló. |
| Una foto dice "No se subió la foto" | Señal débil. Toca **Reintentar** cuando haya mejor señal; el panel también reintenta solo al recuperar la conexión. La foto queda guardada en el teléfono mientras tanto. |
| Una foto no se ve en el catálogo | Revisa en Drive que la foto esté en la carpeta y no en la papelera. Mientras tanto, el catálogo muestra el logo. |
| `instalar` se cortó | Vuelve a ejecutarla: continúa donde se quedó. |
| Cambié el código y no se nota | Falta publicar una **Nueva versión** en la implementación correspondiente (ver "Actualizar el código"). |

## Límites del plan gratuito

Sobran para una tienda local:

- **GitHub Pages:** hasta unos 100 GB de tráfico al mes. El catálogo pesa menos de 200 KB, sin contar fotos.
- **Apps Script (cuenta personal):** el límite que importa es de unas 30 ejecuciones **al mismo tiempo**. La API responde desde caché (CacheService), y cada teléfono guarda su propia copia.
- **Google Drive:** 15 GB compartidos con Gmail. Cada foto reducida pesa como máximo 250 KB, o sea, decenas de miles de fotos.

## Para desarrolladores

```bash
npm install
npx playwright install chromium   # solo la primera vez
npm run servir                    # catálogo en http://localhost:8080 y panel simulado en /panel-local/
npm test                          # lógica del catálogo + Codigo.gs sobre un simulador de Google
npm run test:navegador            # catálogo, panel y página del ícono en Chromium (Pixel 7 / iPhone 13)
npm run capturas                  # regenera docs/capturas/ para el MANUAL.md
npm run ejemplos                  # regenera apps-script/Ejemplos.gs desde datos/demo.json
```

`/panel-local/` corre el **mismo** `Codigo.gs` y los mismos HTML del panel en el navegador, sobre un simulador en memoria de la hoja,
Drive (con las reglas de `drive.file`) y la caché (`tests/simulador/`). Con `?implementacion=api` simula la implementación API.
