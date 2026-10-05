# Instalación del catálogo Decorarte

Guía para instalar el catálogo **en la cuenta de Google de la agencia**, que lo administra como servicio con mantenimiento.
La dueña de la tienda entra al panel con **su propio Gmail**, como persona con acceso.

El código vive en un **proyecto de Apps Script independiente** (no ligado a la hoja). La dueña puede usar el panel y tiene la
hoja compartida, pero **no puede ver ni editar el código**.

Sigue los pasos **en orden y de corrido**, desde una computadora. Tiempo aproximado: 30 minutos.

---

## Antes de empezar: las dos palabras que más confunden

En el editor de Apps Script, el botón azul **Implementar** (arriba a la derecha) tiene tres opciones. Solo usarás dos:

| Opción | Cuándo se usa | Qué hace |
|---|---|---|
| **Nueva implementación** | **Solo dos veces en toda la vida del catálogo**: una para **"API catálogo"** y otra para **"Panel"** (pasos 22 y 26). | Crea una dirección (URL) **nueva**. Si la usas de más, tendrás direcciones de sobra que no sirven. |
| **Gestionar implementaciones** | **Siempre después**, cada vez que actualices el código. | Ahí se elige la implementación, se toca el **lápiz ✏️**, se escoge **Versión → Nueva versión** y **Implementar**. La dirección **no cambia**. |

Dentro de **Gestionar implementaciones** también hay un botón **Archivar** (ícono de caja). **Archivar apaga esa dirección**:
el catálogo o el panel que la usen dejan de funcionar. No lo toques salvo para borrar una instalación vieja.

El archivo **`Implementacion.gs`** tiene una sola línea que dice qué es cada publicación:

- `const IMPLEMENTACION = 'api';` → para **API catálogo**. Es el valor que debe quedar guardado siempre al terminar.
- `const IMPLEMENTACION = 'panel';` → solo mientras publicas el **Panel**.

---

## Si ya tienes una instalación de prueba en la misma cuenta

La instalación nueva **no usa ni modifica** nada de la de prueba: crea su propia hoja y su propia carpeta de fotos, marcadas con
el número de su proyecto, aunque se llamen igual. Para no confundirlas tú, **antes de empezar** cámbiales el nombre a las de
prueba. No se rompe nada: todo se busca por número, no por nombre.

1. En **drive.google.com**, cambia el nombre de la hoja de prueba "Decorarte – Catálogo" a **"PRUEBA – Decorarte – Catálogo"**
   (clic derecho → **Cambiar nombre**).
2. Igual con la carpeta de prueba "Decorarte Catálogo – Fotos" → **"PRUEBA – Decorarte Catálogo – Fotos"**.
3. Abre la hoja de prueba → **Extensiones → Apps Script** y cambia el nombre del proyecto (arriba a la izquierda) a
   **"Decorarte Panel – PRUEBA"**.

Cómo borrar la de prueba sin riesgo, cuando ya no la necesites: ver [Borrar la instalación de prueba](#borrar-la-instalación-de-prueba).

---

## Pasos

### Crear el proyecto y pegar el código

1. Entra a **https://script.google.com** con la cuenta de la agencia. Si hay varias cuentas abiertas, usa una ventana de incógnito y entra solo con esa.
2. Toca **＋ Nuevo proyecto**.
3. Arriba a la izquierda, cambia "Proyecto sin título" por **Decorarte Panel**. Este nombre es el que verá la dueña en la pantalla de permisos.
4. En la barra izquierda toca ⚙️ **Configuración del proyecto** y marca **Mostrar el archivo de manifiesto "appsscript.json" en el editor**.
5. Regresa al editor (ícono `< >`). Abre **`appsscript.json`**, borra todo y pega [`apps-script/appsscript.json`](apps-script/appsscript.json). Guarda (💾 o **Ctrl + S**).
   En la barra izquierda, bajo **Servicios**, debe aparecer **Drive**.
6. Abre **`Código.gs`**, borra todo y pega [`apps-script/Codigo.gs`](apps-script/Codigo.gs).
7. Toca **＋ → Secuencia de comandos**, ponle de nombre **`Implementacion`** (sin `.gs`) y pega [`apps-script/Implementacion.gs`](apps-script/Implementacion.gs).
   Debe decir `const IMPLEMENTACION = 'api';`.
8. **＋ → Secuencia de comandos** → **`Ejemplos`** → pega [`apps-script/Ejemplos.gs`](apps-script/Ejemplos.gs).
9. **＋ → HTML** → **`Panel`** (sin `.html`) → borra lo que trae y pega [`apps-script/Panel.html`](apps-script/Panel.html).
10. **＋ → HTML** → **`PanelEstilos`** → pega [`apps-script/PanelEstilos.html`](apps-script/PanelEstilos.html).
11. **＋ → HTML** → **`PanelApp`** → pega [`apps-script/PanelApp.html`](apps-script/PanelApp.html).
12. **＋ → HTML** → **`Fotos`** → pega [`apps-script/Fotos.html`](apps-script/Fotos.html).
13. Guarda. A la izquierda deben verse 8 archivos: `appsscript.json`, `Código.gs`, `Implementacion.gs`, `Ejemplos.gs`, `Panel.html`, `PanelEstilos.html`, `PanelApp.html` y `Fotos.html`.

> Para copiar cada archivo desde GitHub: ábrelo y usa el botón **Copy raw file** (ícono de dos hojas).

### Crear la hoja y dar permisos

14. En la barra de arriba del editor, elige la función **`instalar`** y toca **▶ Ejecutar**.
15. Google pide permisos:
    1. **Revisar permisos** → elige la cuenta de la agencia.
    2. "Google no verificó esta app" → **Configuración avanzada** → **Ir a Decorarte Panel (no seguro)**. Es normal: es una app propia, no publicada para el público.
    3. Revisa que la lista sea la de [Permisos que pide](#permisos-que-pide) y toca **Permitir**.
16. Abajo, en el **Registro de ejecución**, deben aparecer los pasos `1/5 … 5/5` y al final
    **"Listo. La hoja está preparada: https://docs.google.com/spreadsheets/d/…"**.
    **Esa es la hoja de esta instalación.** Ábrela con ese enlace y guárdalo en tus favoritos.
    Si algo se corta a medias, vuelve a ejecutar `instalar`: continúa donde se quedó sin duplicar nada.
17. *(Opcional)* Para empezar con los 8 productos de ejemplo, elige **`cargarEjemplos`** y **▶ Ejecutar**.

### Proteger la hoja

18. En la hoja (el enlace del paso 16), toca **Compartir** (arriba a la derecha).
19. Toca el engrane ⚙️ de esa ventana y **desmarca** "Los editores pueden cambiar los permisos y compartir". Regresa con la flecha y toca **Listo**.
    Así solo la agencia comparte la hoja; el panel lo hace por ti al agregar personas.

### Publicar la API (una sola vez)

20. Abre **`Implementacion.gs`**. Debe decir exactamente:
    ```js
    const IMPLEMENTACION = 'api';
    ```
21. Guarda.
22. **Implementar → Nueva implementación** ← *primera de las dos únicas veces*.
    - Junto a "Seleccionar tipo" toca el engrane ⚙️ → **Aplicación web**.
    - **Descripción:** escribe `API catálogo`.
    - **Ejecutar como:** **Yo** (tu correo).
    - **Quién tiene acceso:** **Cualquier persona**.
    - Toca **Implementar** y copia la **URL de la aplicación web** (termina en `/exec`). Esta es la **URL de la API**.
23. **Comprobación:** pega la URL de la API en una pestaña nueva, **tal cual, sin agregarle `?api`**.
    Debe salir texto que empieza con `{"version":1,…`. Si sale una página, `Implementacion.gs` no decía `'api'`: ve a
    [Si una dirección muestra lo que no debe](#si-una-dirección-muestra-lo-que-no-debe).

### Publicar el Panel (una sola vez)

24. Abre **`Implementacion.gs`** y cambia la línea a:
    ```js
    const IMPLEMENTACION = 'panel';
    ```
25. Guarda.
26. **Implementar → Nueva implementación** ← *segunda y última vez que usas esta opción*.
    - Tipo: **Aplicación web**.
    - **Descripción:** escribe `Panel`.
    - **Ejecutar como:** **Usuario que accede a la aplicación web**.
    - **Quién tiene acceso:** **Cualquier usuario con cuenta de Google**.
    - Toca **Implementar** y copia la URL. Esta es la **URL del Panel** (es distinta a la de la API).
27. Abre **`Implementacion.gs`** y **regrésala** a:
    ```js
    const IMPLEMENTACION = 'api';
    ```
28. Guarda. (Las implementaciones ya quedaron fijadas a su versión; esto no les afecta.)
29. **Comprobación:** abre otra vez la **URL de la API sin `?api`**. Debe seguir saliendo `{"version":1,…`.
30. Abre la **URL del Panel**: debe salir **Tus productos**. (Si te pide permisos, son los mismos del paso 15.)

### Conectar el catálogo

31. Las dos URL van en el archivo [`js/config.js`](js/config.js) del repositorio:
    ```js
    export const CONFIG = {
      endpoint: 'URL DE LA API (paso 22), sin ?api',
      panel: 'URL DEL PANEL (paso 26)',
      whatsappRespaldo: '527122319080',
    };
    ```
    Mándaselas a quien mantiene el repositorio para que las cambie y publique, o edítalo en GitHub con el lápiz ✏️ y
    **Commit changes**. No se toca nada más.
32. Espera 1 o 2 minutos y abre **https://tapqr-temascalcingo.github.io/decorarte-catalogo/** (recarga si ya lo tenías abierto).
    Ya no debe salir la franja de "Catálogo de demostración" y deben verse los productos de la hoja nueva.

### Agregar a la dueña

33. Abre la **URL del Panel** → **Ajustes** → **Personas con acceso al panel**.
34. En **A quién avisar si alguien no puede entrar** escribe: `Jesús, de Agencia Digital Temas, WhatsApp 712 334 4128`.
35. Toca **＋ Agregar persona**, escribe el **Gmail de la dueña** y toca **Guardar personas**.
36. Debe aparecer **"✓ Se le compartió la hoja a …. Google le mandó un correo de aviso."**
    Si aparece **"✗ … no parece ser una cuenta de Google"**, revisa el correo y vuelve a intentarlo.

### Entrega en el celular de la dueña

Hazlo con ella, con su teléfono en la mano.

37. Pregúntale si en el navegador de su teléfono tiene **más de una cuenta de Google**. Si sí, usa **un navegador donde solo esté
    su Gmail** (por ejemplo, instala **Google Chrome** y usa Chrome solo para el panel). Si no, Google suele mostrar
    «No se pudo abrir el archivo».
38. En ese navegador abre **https://tapqr-temascalcingo.github.io/decorarte-catalogo/panel/** y agrega el acceso a la pantalla de inicio:
    - **Chrome en iPhone:** **Compartir** (cuadro con flecha) → **Agregar a pantalla de inicio**.
    - **Safari en iPhone:** **Compartir** → **Agregar a inicio**.
    - **Android (Chrome):** menú **⋮** → **Agregar a la pantalla principal** (o **Instalar app**).
39. Toca el ícono nuevo. La **primera vez** verá, en este orden:
    1. **Iniciar sesión** (si no tenía sesión): con su Gmail.
    2. **"Google no verificó esta app"** → **Configuración avanzada** (o **Avanzado**) → **Ir a Decorarte Panel (no seguro)**.
    3. **"Decorarte Panel quiere acceder a tu Cuenta de Google"** → **Continuar** o **Permitir**.
    4. **Tus productos**.
40. Pídele que **agregue un producto con una foto de la cámara**. La primera foto crea en **su** Google Drive la carpeta
    **Decorarte Catálogo – Fotos**. Dile que **no la borre**: ahí viven las fotos que ella sube.
41. Enséñale el [MANUAL](MANUAL.md). La sección 9 explica qué hacer si sale «No se pudo abrir el archivo».

Listo. Después haz las [pruebas con una segunda cuenta](#pruebas-con-una-segunda-cuenta).

---

## Cómo actualizar el código después

Cada vez que cambie algún archivo de [`apps-script/`](apps-script/). **Nunca** uses "Nueva implementación" para esto.

1. Abre el proyecto **Decorarte Panel** en script.google.com, pega los archivos que cambiaron y guarda.
2. **API:** confirma que `Implementacion.gs` dice `'api'` y guarda. **Implementar → Gestionar implementaciones** → selecciona
   **API catálogo** → **lápiz ✏️** → **Versión: Nueva versión** → **Implementar**.
3. **Comprobación:** abre la URL de la API **sin `?api`** → debe salir `{"version":1,…`.
4. **Panel:** cambia `Implementacion.gs` a `'panel'` y guarda. **Gestionar implementaciones** → **Panel** → **lápiz ✏️** →
   **Nueva versión** → **Implementar**. Abre la URL del Panel → debe salir el panel.
5. Regresa `Implementacion.gs` a `'api'` y guarda.
6. **Comprobación final:** la URL de la API sin `?api` sigue mostrando `{"version":1,…`.

Las dos URL no cambian, así que `js/config.js` no se toca. Si el cambio modificó `appsscript.json` (permisos), ejecuta
`instalar` una vez y cada persona verá otra vez la pantalla de permisos al abrir el panel.

### Si una dirección muestra lo que no debe

| Qué ves | Qué pasó | Qué hacer |
|---|---|---|
| La URL de la **API** muestra una página | Esa versión se publicó con `'panel'` | Pon `'api'`, guarda, y en **Gestionar implementaciones → API catálogo → ✏️ → Nueva versión → Implementar**. |
| La URL del **Panel** muestra `{"version":1,…` | Esa versión se publicó con `'api'` | Pon `'panel'`, guarda, **Gestionar implementaciones → Panel → ✏️ → Nueva versión → Implementar**, y regresa a `'api'`. |

## Qué hacer si edito la hoja a mano

No hace falta editarla: todo se maneja desde el panel. Si aun así cambias algo directo en la hoja, el catálogo **no** se entera
solo (el proyecto independiente no recibe avisos de la hoja). Para que se vea al momento:

1. Abre el proyecto **Decorarte Panel** en script.google.com.
2. Elige la función **`publicarCambios`** y toca **▶ Ejecutar**.
3. En el registro debe salir "Listo: el catálogo ya muestra la información actual de la hoja."

Si no lo haces, el cambio aparece solo cuando vence la caché (máximo 6 horas) o la próxima vez que alguien guarde algo en el panel.

---

## Referencia

### Permisos que pide

Cada cuenta que use el panel (la agencia al instalar y la dueña la primera vez) ve esta lista. El texto exacto puede variar un poco:

| Lo que se ve al autorizar | Original en inglés | Para qué |
|---|---|---|
| **Ver, editar, crear y eliminar todas tus hojas de cálculo de Hojas de cálculo de Google** | See, edit, create, and delete all your Google Sheets spreadsheets | Leer y guardar en la hoja del catálogo, y compartirla con las personas con acceso. |
| **Ver, editar, crear y borrar solo los archivos específicos de Google Drive que uses con esta app** | See, edit, create, and delete only the specific Google Drive files you use with this app | Crear la hoja y la carpeta de fotos, y subir las fotos. **No** ve ningún otro archivo de Drive. |
| **Ver la dirección de correo electrónico principal de tu Cuenta de Google** | See your primary Google Account email address | Saber quién entra al panel. |

No se pide "todos tus archivos de Drive", ni "conectarse a un servicio externo", ni "ejecutarse cuando no estás presente".

### Cómo está armado

```
 Clientes ──► Catálogo (GitHub Pages) ──► "API catálogo" (Apps Script, ejecuta como la agencia) ──lee──► Hoja
 Dueña (su Gmail) ─► Ícono ─► "Panel" (Apps Script, ejecuta como quien entra) ──escribe──────────────────┘
```

- **Quién administra** = la cuenta que ejecutó `instalar`. Solo ella cambia la lista de personas con acceso y ejecuta
  `instalar`, `cargarEjemplos`, `publicarCambios` y `dondeEstaTodo`.
- **La dueña** tiene la hoja compartida como **Editora** (el panel trabaja con su cuenta). Puede abrirla y cambiar celdas a mano,
  pero **no puede ver el código** ni compartir la hoja con nadie (paso 19). Si algo se rompe en la hoja,
  **Archivo → Historial de versiones** permite regresar a una versión anterior.
- **Fotos:** cada cuenta guarda las fotos que sube en una carpeta **de su propio Drive** ("Decorarte Catálogo – Fotos").
  Las de la dueña viven en el Drive de ella; si las borra, en el catálogo sale el logo en su lugar.

### Personas con acceso

- **Agregar o quitar:** Panel → **Ajustes → Personas con acceso al panel**, con la cuenta de la agencia. El panel comparte o
  retira la hoja en ese momento y muestra el resultado por persona. La cuenta de la agencia no se puede quitar.
- **"Ya casi puedes entrar":** la persona está en la lista pero sin la hoja (alguien la quitó a mano en Compartir). Guarda otra vez
  la lista en el panel o ejecuta `instalar`.

### Dónde está cada cosa (para distinguir instalaciones)

En el proyecto **Decorarte Panel**, ejecuta **`dondeEstaTodo`**. El registro muestra el número de proyecto, el enlace de **su**
hoja y el de **su** carpeta de fotos.

| Dónde | Instalación nueva (definitiva) | Instalación de prueba |
|---|---|---|
| script.google.com → Mis proyectos | **Decorarte Panel**, sin hoja "contenedora" | **Decorarte Panel – PRUEBA**, con ícono de hoja de cálculo (está dentro de la hoja) |
| Google Drive | **Decorarte – Catálogo** y **Decorarte Catálogo – Fotos** | **PRUEBA – Decorarte – Catálogo** y **PRUEBA – Decorarte Catálogo – Fotos** (si las renombraste) |
| Direcciones | Las que están en `js/config.js` | Las anteriores |

### Borrar la instalación de prueba

Hazlo **solo después** de que el catálogo público ya use las direcciones nuevas (paso 32) y funcione.

1. Confirma que [`js/config.js`](js/config.js) tiene las URL **nuevas** (compáralas con las del paso 22 y 26).
2. Abre la hoja **PRUEBA – Decorarte – Catálogo** → **Extensiones → Apps Script** (proyecto "Decorarte Panel – PRUEBA") →
   **Implementar → Gestionar implementaciones** → **Archivar** cada una de sus implementaciones. Sus direcciones se apagan.
3. Abre el catálogo público y el panel nuevo: deben seguir funcionando. Si algo falla, **no sigas** y revisa `js/config.js`.
4. En Google Drive, manda a la papelera **PRUEBA – Decorarte – Catálogo** (eso borra también su código, que vive dentro) y
   **PRUEBA – Decorarte Catálogo – Fotos**. La segunda cuenta con la que probaste puede borrar su propia carpeta de prueba.
5. *(Opcional)* En **myaccount.google.com → Seguridad → Conexiones con terceros**, quita el acceso a "Decorarte Panel – PRUEBA"
   si aparece. Ojo: **no** quites "Decorarte Panel" (la nueva).

La papelera de Drive guarda todo 30 días por si te equivocas.

---

## Pruebas con una segunda cuenta

Hazlas en la instalación nueva, con otra cuenta de Google en otro celular (o en otro navegador sin tu cuenta).

1. **Sin acceso:** con la segunda cuenta, abre la URL del Panel. Debe salir **"Este panel es privado"**.
2. **Agregar:** con tu cuenta, en Ajustes → Personas con acceso agrega a la segunda cuenta y **Guardar personas**. Debe salir
   **"✓ Se le compartió la hoja a …"**, y a esa cuenta le llega el correo de aviso de Google.
3. **Entrar:** con la segunda cuenta, recarga el panel. Verá la pantalla de permisos (paso 39) y luego **Tus productos**.
4. **Crear con foto:** sube un producto con foto de la cámara. Debe verse en el catálogo público, y en el Drive de esa cuenta debe
   aparecer **Decorarte Catálogo – Fotos**.
5. **Editar y borrar** un producto: los cambios se ven en el catálogo.
6. **No puede cambiar la lista:** con la segunda cuenta, en Ajustes → Personas con acceso, ve la lista sin poder editarla y el aviso
   "Solo quien administra el catálogo puede agregar personas…" con tu contacto.
7. **No puede compartir ni ver el código:** con la segunda cuenta, abre la hoja (le llegó por correo). **Compartir** no debe dejarla
   agregar a nadie. Luego, con esa misma cuenta, entra a **script.google.com**: en **Mis proyectos** y en **Compartidos conmigo**
   **no** debe aparecer "Decorarte Panel". (No uses Extensiones → Apps Script en la hoja: eso crearía un proyecto vacío nuevo.)
8. **"Ya casi puedes entrar":** con tu cuenta, en la hoja → **Compartir**, quítale la hoja a mano a la segunda cuenta (sin tocar la
   lista del panel). Con la segunda cuenta, recarga el panel: debe salir **"Ya casi puedes entrar"** con tu contacto.
   Luego, con tu cuenta, guarda otra vez la lista en el panel: debe volver a compartírsela.
9. **Correo inválido:** con tu cuenta, agrega un correo que no sea de Google. Debe salir el aviso rojo y no quedar en la lista.
10. **Quitar:** con tu cuenta, quita a la segunda cuenta y **Guardar personas**. Debe salir **"✓ Se le quitó el acceso a …"**.
11. **Ya no entra ni ve la hoja:** con la segunda cuenta, recarga el panel → **"Este panel es privado"**. Abre el enlace de la hoja →
    Google pide **solicitar acceso**.
12. **La prueba sigue intacta:** abre la hoja **PRUEBA – Decorarte – Catálogo**: no debe tener ningún cambio de estas pruebas.

---

## Solución de problemas

| Qué pasa | Qué hacer |
|---|---|
| El catálogo sigue diciendo "demostración" | Revisa que `endpoint` en `js/config.js` tenga la URL de la API y que el cambio esté publicado. GitHub Pages tarda 1–2 minutos; recarga. |
| El catálogo dice "No pudimos cargar el catálogo" | Abre la URL de la API. Si pide iniciar sesión, la implementación no está en **Cualquier persona**. Si muestra `{"error":…}`, casi siempre falta ejecutar `instalar`. |
| «No se pudo abrir el archivo» (sobre todo en iPhone) | Varias cuentas de Google en ese navegador. Usa un navegador con solo la cuenta autorizada (paso 37). |
| "Ya casi puedes entrar" | La persona está en la lista pero sin la hoja. Guarda otra vez la lista en el panel o ejecuta `instalar`. |
| "Este panel es privado" | El correo con el que se entró no está en la lista, o el navegador usó otra cuenta. |
| "No se pudo compartir la hoja con …" | El correo no es una cuenta de Google, o quien guardó no es la cuenta de la agencia. |
| "Solo quien administra el catálogo puede…" | Solo la cuenta que instaló cambia la lista o ejecuta `instalar`, `cargarEjemplos`, `publicarCambios` y `dondeEstaTodo`. |
| "Falta ejecutar instalar" | Ejecuta `instalar` en el proyecto **Decorarte Panel**. |
| Una foto dice "No se subió la foto" | Señal débil. **Reintentar** cuando haya mejor señal; el panel también reintenta solo. |
| Una foto no se ve en el catálogo | Revisa en el Drive de quien la subió que esté en "Decorarte Catálogo – Fotos" y no en la papelera. |
| Edité la hoja a mano y no se ve | Ejecuta `publicarCambios` (ver [Qué hacer si edito la hoja a mano](#qué-hacer-si-edito-la-hoja-a-mano)). |
| Cambié el código y no se nota | Falta **Nueva versión** en **Gestionar implementaciones** (ver [Cómo actualizar el código después](#cómo-actualizar-el-código-después)). |

## Límites del plan gratuito

- **GitHub Pages:** hasta unos 100 GB de tráfico al mes. El catálogo pesa menos de 200 KB, sin contar fotos.
- **Apps Script (cuenta personal):** unas 30 ejecuciones **al mismo tiempo**. La API responde desde caché y cada teléfono guarda su propia copia.
- **Google Drive:** 15 GB por cuenta. Cada foto reducida pesa como máximo 250 KB.
- **App no verificada:** Google permite hasta 100 cuentas distintas; para este uso sobra.

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

`/panel-local/` corre el **mismo** `Codigo.gs` y los mismos HTML del panel en el navegador, sobre un simulador en memoria de
las hojas (con quién las tiene compartidas), Drive (con las reglas de `drive.file` por proyecto) y la caché (`tests/simulador/`).
Parámetros: `?implementacion=api`, `?usuario=correo`, `?invitar=correo,correo`, `?sinHoja=correo`.
