# Instalación del catálogo Decorarte

Guía para dejar funcionando el catálogo **en la cuenta de Google de la agencia**, que lo administra como servicio con
mantenimiento. La dueña de la tienda **no recibe una cuenta**: entra al panel con **su propio correo de Google**, como
persona con acceso. Se hace una sola vez, de preferencia desde una computadora. Tiempo aproximado: 30 minutos.

Al terminar tendrás:

- Una **hoja de Google Sheets** (en el Drive de la agencia) con tres pestañas: Productos, Paquetes y Configuración. Es el respaldo de toda la información.
- El **panel de administración**, que la dueña abre desde un ícono en su celular con su propio Gmail.
- El **catálogo público** en https://tapqr-temascalcingo.github.io/decorarte-catalogo/ mostrando sus productos reales.

Todo es gratis: no hay servidores ni mensualidades.

---

## Cómo está armado

```
 Clientes ──► Catálogo (GitHub Pages) ──pide los datos──► "API catálogo" (Apps Script) ──lee──► Hoja (Drive de la agencia)
                                                                                                   ▲
 Dueña (su Gmail) ─► Ícono en su celular ─► "Panel" (Apps Script, solo personas con acceso) ─escribe┘
```

**Quién es quién**

| Persona | Cuenta | Qué puede hacer |
|---|---|---|
| **Quien administra** (la agencia) | La cuenta que ejecuta `instalar` | Todo: código, implementaciones, y **agregar o quitar personas con acceso**. |
| **La dueña** | Su propio Gmail | Usar el panel: productos, fotos, paquetes y ajustes del catálogo. Ve la lista de personas con acceso, pero no la puede cambiar. |

El mismo proyecto de Apps Script se publica **dos veces**. Cada publicación ("implementación") queda fijada a una versión
del código en la que el archivo `Implementacion.gs` dice qué es:

| Implementación | `Implementacion.gs` | Ejecutar como | Quién tiene acceso | Qué hace |
|---|---|---|---|---|
| **API catálogo** | `'api'` | Yo (la cuenta de la agencia) | Cualquier persona | Solo entrega el JSON público del catálogo. Nunca muestra páginas ni acepta cambios, aunque se abra sin `?api` o con sesión. |
| **Panel** | `'panel'` | Usuario que accede a la aplicación web | Cualquier usuario con cuenta de Google | Muestra el panel solo a las personas con acceso. |

Si `Implementacion.gs` falta o dice cualquier cosa distinta de `'panel'`, el código se comporta como **API** (lo más cerrado).
`instalar`, `cargarEjemplos` y `publicarCambios` solo funcionan para la cuenta que instaló.

**Por qué la hoja se comparte con la dueña:** el panel corre con la cuenta de quien entra, para saber quién es y dejar pasar
solo a las personas con acceso. Por eso cada persona necesita la hoja compartida como **Editor**. El panel lo hace solo:
al agregar a alguien en **Ajustes → Personas con acceso** se le comparte la hoja, y al quitarlo se le retira.

En el repositorio público solo quedan las dos direcciones `/exec`, que no son secretas. **No hay llaves ni contraseñas en el repositorio.**

### Permisos que pide

Cada cuenta que use el panel (la agencia al instalar, y la dueña la primera vez que entra) ve esta lista. El texto exacto
en español puede variar un poco según el idioma de la cuenta:

| Lo que se ve al autorizar | Original en inglés | Para qué |
|---|---|---|
| **Ver, editar, crear y eliminar todas tus hojas de cálculo de Hojas de cálculo de Google** | See, edit, create, and delete all your Google Sheets spreadsheets | Leer y guardar productos en la hoja del catálogo, y compartirla con las personas con acceso. |
| **Ver, editar, crear y borrar solo los archivos específicos de Google Drive que uses con esta app** | See, edit, create, and delete only the specific Google Drive files you use with this app | Crear la carpeta de fotos y subir las fotos. **No** puede ver ningún otro archivo de Drive. |
| **Ver la dirección de correo electrónico principal de tu Cuenta de Google** | See your primary Google Account email address | Saber quién entra al panel para dejar pasar solo a las personas con acceso. |

No se pide "ver, editar y borrar todos tus archivos de Drive" ni "conectarse a un servicio externo".

> **¿Por qué el de hojas de cálculo dice "todas"?** Existe un permiso más estrecho (`spreadsheets.currentonly`), pero está
> pensado para menús y barras laterales dentro de la hoja. No hay garantía de que funcione cuando el código corre como
> aplicación web, que es como corren la API y el panel. En la práctica el código solo abre la hoja del catálogo.

---

## Paso 1. Crear la hoja

1. Entra a Google **con la cuenta de la agencia**. Si hay varias cuentas abiertas en el navegador, usa una ventana de incógnito y entra solo con esa.
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
   1. **Revisar permisos** → elige la cuenta de la agencia.
   2. Aparece "Google no verificó esta app". Es normal: es una app propia, no publicada para el público. Toca **Configuración avanzada → Ir a Decorarte Panel (no seguro)**.
   3. Revisa que la lista sea la de la tabla **Permisos que pide** de arriba y toca **Permitir**.
3. El registro de ejecución muestra los pasos `1/4 … 4/4` y termina en segundos. Revisa la hoja: ya tiene las pestañas **Productos**, **Paquetes** y **Configuración**. En el Drive de la agencia aparece la carpeta **Decorarte Catálogo – Fotos**.
4. *(Opcional)* Para empezar con los 8 productos de ejemplo, ejecuta también **`cargarEjemplos`**.

> `instalar` y `cargarEjemplos` se pueden ejecutar las veces que haga falta. Si una se corta a medias, vuelve a ejecutarla:
> continúa donde se quedó sin duplicar pestañas, renglones, carpetas ni productos. `instalar` también vuelve a compartir
> la hoja con todas las personas de la lista y pone al día la copia de la lista que usa el panel para sus mensajes.

## Paso 5. Proteger la hoja: solo la agencia comparte

En la hoja **Decorarte – Catálogo**:

1. Toca **Compartir** (arriba a la derecha).
2. Toca el engrane ⚙️ (**Configuración**) de esa ventana.
3. **Desmarca** "Los editores pueden cambiar los permisos y compartir".
4. Toca la flecha para regresar y luego **Listo**.

Así, la dueña no puede compartir la hoja con nadie más. Agregar o quitar personas lo hace solo la agencia, desde el panel.
Si alguien más intenta cambiar la lista en el panel, verá: "Solo quien administra el catálogo puede agregar personas".

> **Qué puede hacer la dueña al tener la hoja como Editora:** abrir la hoja y cambiar celdas a mano, borrar pestañas
> (se recupera con **Archivo → Historial de versiones**), y abrir **Extensiones → Apps Script**, donde **puede ver y editar
> el código**, porque el código está ligado a la hoja. Las implementaciones publicadas no cambian solas (están fijadas a una
> versión). **No** puede ver otros archivos del Drive de la agencia. No se pueden proteger las pestañas para que solo la
> agencia las edite: el panel escribe con la cuenta de la dueña.

## Paso 6. Publicar la "API catálogo"

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
   - Si muestra una página, `Implementacion.gs` no decía `'api'`: corrígelo y publica una versión nueva (ver "Actualizar el código").

## Paso 7. Conectar el catálogo

1. En GitHub abre [`js/config.js`](js/config.js) y toca el lápiz ✏️ (**Edit this file**).
2. Pega la URL del paso 6 entre las comillas de `endpoint`, **sin** `?api`:
   ```js
   endpoint: 'https://script.google.com/macros/s/AKfy…/exec',
   ```
3. **Commit changes…** → **Commit changes**.
4. Espera 1 o 2 minutos y abre https://tapqr-temascalcingo.github.io/decorarte-catalogo/. Ya no debe aparecer la franja de "Catálogo de demostración".

> La demostración sigue disponible en `…/decorarte-catalogo/?demo` por si quieres enseñarla otra vez.

## Paso 8. Publicar el "Panel"

1. Abre **`Implementacion.gs`**, cambia la línea a:
   ```js
   const IMPLEMENTACION = 'panel';
   ```
   Guarda.
2. **Implementar → Nueva implementación → Aplicación web**. Es una implementación **nueva**: no edites la del paso 6.
   - Descripción: `Panel`
   - Ejecutar como: **Usuario que accede a la aplicación web**
   - Quién tiene acceso: **Cualquier usuario con cuenta de Google**
3. **Implementar** y copia la URL. Es distinta a la del paso 6.
4. **Regresa `Implementacion.gs` a `'api'` y guarda.** Las implementaciones ya quedaron fijadas a su versión, así que esto no les afecta.
5. **Comprobación:** abre otra vez la URL de la **API** (paso 6) sin `?api`. Debe seguir mostrando `{"version":1,…`.
6. En GitHub, edita otra vez [`js/config.js`](js/config.js) y pega la URL del panel en `panel`:
   ```js
   panel: 'https://script.google.com/macros/s/AKfy…otra…/exec',
   ```
   Haz commit.

## Paso 9. Agregar a la dueña

Desde la computadora, con la cuenta de la agencia:

1. Abre la URL del panel (paso 8) y ve a **Ajustes → Personas con acceso al panel**.
2. En **A quién avisar si alguien no puede entrar**, escribe el contacto de la agencia, por ejemplo:
   `Jesús, de Agencia Digital Temas, WhatsApp 712 334 4128`. Es lo que verá una persona con acceso que todavía no tenga
   la hoja compartida. Se cambia en este mismo lugar cuando haga falta.
3. Toca **＋ Agregar persona**, escribe el **Gmail de la dueña** y toca **Guardar personas**.
4. Debe aparecer: **"✓ Se le compartió la hoja a …. Google le mandó un correo de aviso."**
   - Si aparece **"✗ … no parece ser una cuenta de Google"**, revisa el correo: debe ser una cuenta de Google (Gmail o un correo
     con cuenta de Google). Esa persona no queda en la lista hasta que se pueda compartir.

Para **quitar** a alguien: en la misma pantalla toca el bote de basura junto a su correo y **Guardar personas**. Se le retira la hoja
y ya no puede entrar. La cuenta de la agencia nunca se puede quitar.

## Paso 10. Entrega en el celular de la dueña

Hazlo con ella, con su teléfono en la mano.

**Antes de empezar: ¿cuántas cuentas de Google tiene en el teléfono?** Si en el navegador tiene más de una (por ejemplo,
la personal y la del trabajo), Google suele mostrar **«No se pudo abrir el archivo»** al abrir el panel. Es una limitación
conocida de Apps Script. En ese caso el panel se usa en **un navegador donde solo esté la cuenta con la que la agregaste**.
Por ejemplo, si en Safari tiene otra cuenta, instala **Google Chrome** desde la App Store y usa Chrome solo para el panel,
con esa única cuenta.

1. En el navegador elegido, abre **https://tapqr-temascalcingo.github.io/decorarte-catalogo/panel/**.
2. Agrega el acceso a la pantalla de inicio:
   - **Chrome en iPhone:** botón **Compartir** (cuadro con flecha, arriba a la derecha) → **Agregar a pantalla de inicio**.
   - **Safari en iPhone:** botón **Compartir** → **Agregar a inicio**.
   - **Android (Chrome):** menú **⋮ → Agregar a la pantalla principal** (o **Instalar app**).
3. Toca el ícono nuevo. La **primera vez** verá, en este orden:
   1. **Iniciar sesión con Google** (si no tenía sesión): que entre con el Gmail que agregaste.
   2. **"Google no verificó esta app"**: tocar **Configuración avanzada** (o "Avanzado") y luego **Ir a Decorarte Panel (no seguro)**.
      Es normal: es una app propia del catálogo, no publicada para el público.
   3. **"Decorarte Panel quiere acceder a tu Cuenta de Google"** con la lista de permisos de arriba: tocar **Continuar** o **Permitir**.
   4. El panel, con **Tus productos**.
4. Pídele que **agregue un producto con una foto de la cámara**. La primera foto crea en **su** Google Drive una carpeta
   llamada **Decorarte Catálogo – Fotos**. Explícale que **no debe borrarla**: ahí viven las fotos que ella sube y que se ven
   en el catálogo.
5. Enséñale el [MANUAL](MANUAL.md); la sección 9 explica qué hacer si algún día sale «No se pudo abrir el archivo».

## Paso 11. Probar que todo funciona

1. En el panel, cambia el precio de un producto y guarda.
2. Abre el catálogo y recarga: el cambio se ve en unos segundos.
3. Desde el catálogo, toca **Lo quiero** en un producto: debe abrirse WhatsApp con el mensaje escrito.
4. Con la cuenta de la dueña, agrega un producto con foto tomada desde el celular. Se guarda al momento; la tarjeta dice
   "Subiendo foto…" unos segundos y después la foto aparece en el catálogo.

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
y cada persona con acceso verá otra vez la pantalla de permisos al abrir el panel.

### Personas con acceso

- **Agregar o quitar:** solo desde **Ajustes → Personas con acceso al panel**, con la cuenta de la agencia (paso 9). El panel
  comparte o retira la hoja en ese momento y muestra el resultado por persona.
- **Si alguien con acceso ve "Ya casi puedes entrar":** su correo está en la lista pero no tiene la hoja compartida (por
  ejemplo, alguien la quitó a mano en Compartir). Vuelve a guardar la lista en el panel o ejecuta `instalar`: le vuelve a compartir la hoja.
- **Fotos de cada persona:** por el permiso `drive.file`, cada cuenta guarda las fotos que sube en una carpeta **de su propio
  Drive** ("Decorarte Catálogo – Fotos"). Las de la dueña viven en el Drive de ella. Si ella las borra o cierra su cuenta,
  esas fotos dejan de verse en el catálogo (sale el logo en su lugar).

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
| «No se pudo abrir el archivo» (sobre todo en iPhone) | Hay varias cuentas de Google en ese navegador. Usa un navegador con solo la cuenta autorizada (paso 10). |
| "Ya casi puedes entrar" | La persona está en la lista pero sin la hoja compartida. Guarda otra vez la lista en el panel o ejecuta `instalar`. |
| "Este panel es privado" | El correo con el que se entró no está en la lista, o el navegador usó otra cuenta. |
| "No se pudo compartir la hoja con …" | El correo no es una cuenta de Google, o quien guardó no es la cuenta de la agencia. |
| "Solo quien administra el catálogo puede agregar personas" | Solo la cuenta de la agencia cambia la lista. Es lo esperado para las demás cuentas. |
| "Solo quien administra el catálogo puede ejecutar esta función" | `instalar`, `cargarEjemplos` y `publicarCambios` solo las ejecuta la cuenta que instaló. |
| Una foto dice "No se subió la foto" | Señal débil. Toca **Reintentar** cuando haya mejor señal; el panel también reintenta solo al recuperar la conexión. |
| Una foto no se ve en el catálogo | Revisa en el Drive de quien la subió que la foto esté en "Decorarte Catálogo – Fotos" y no en la papelera. Mientras tanto, el catálogo muestra el logo. |
| `instalar` se cortó | Vuelve a ejecutarla: continúa donde se quedó. |
| Cambié el código y no se nota | Falta publicar una **Nueva versión** en la implementación correspondiente (ver "Actualizar el código"). |

## Límites del plan gratuito

Sobran para una tienda local:

- **GitHub Pages:** hasta unos 100 GB de tráfico al mes. El catálogo pesa menos de 200 KB, sin contar fotos.
- **Apps Script (cuenta personal):** el límite que importa es de unas 30 ejecuciones **al mismo tiempo**. La API responde desde caché (CacheService), y cada teléfono guarda su propia copia.
- **Google Drive:** 15 GB compartidos con Gmail en cada cuenta. Cada foto reducida pesa como máximo 250 KB, o sea, decenas de miles de fotos.
- **App no verificada:** Google permite hasta 100 cuentas distintas en una app propia sin verificar; para este uso sobra.

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

`/panel-local/` corre el **mismo** `Codigo.gs` y los mismos HTML del panel en el navegador, sobre un simulador en memoria de la hoja
(con quién la tiene compartida), Drive (con las reglas de `drive.file`) y la caché (`tests/simulador/`).
Parámetros: `?implementacion=api`, `?usuario=correo`, `?invitar=correo,correo`, `?sinHoja=correo`.
