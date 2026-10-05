# Decorarte · Catálogo digital

Catálogo de regalos, decoración y servicios para eventos de **Decorarte** (Temascalcingo, Estado de México),
con un panel para que la dueña lo administre desde su celular.

- **Catálogo:** https://tapqr-temascalcingo.github.io/decorarte-catalogo/
  (mientras no esté conectado a la hoja muestra datos de **demostración**; también con `?demo`)
- **Instalación en la cuenta de Google de la dueña:** [INSTALACION.md](INSTALACION.md)
- **Manual para la dueña:** [MANUAL.md](MANUAL.md)

Costo de operación: **$0**. No hay servidores ni mensualidades.

| Pieza | Dónde vive |
|---|---|
| Catálogo público | GitHub Pages (este repositorio) |
| Datos | Hoja de Google Sheets de la dueña (pestañas Productos, Paquetes, Configuración) |
| Fotos | Carpeta de su Google Drive |
| Panel y API de datos | Proyecto de Google Apps Script independiente, no ligado a la hoja ([`apps-script/`](apps-script/)) |

En este repositorio no hay llaves ni datos privados. Solo quedan las URL públicas de la API, que entrega lo mismo que ya muestra el catálogo, y del panel, que pide iniciar sesión con un correo autorizado.

## Estructura

| Ruta | Qué es |
|---|---|
| `index.html`, `css/`, `js/app.js` | Catálogo público: HTML, CSS y JS sin compilación, pensado primero para celular |
| `js/logica.js` | Lógica pura: precios, mensajes de WhatsApp, filtros, búsqueda y temporada |
| `js/config.js` | URL de la API (vacía = demo) y del panel |
| `datos/demo.json` | 8 productos y 1 servicio con 3 paquetes de ejemplo, en el mismo formato que la API |
| `panel/` | Acceso directo instalable (manifest e ícono) que abre el panel |
| `apps-script/` | `Codigo.gs` (API y funciones del panel), `Implementacion.gs` ('api' o 'panel'), `Ejemplos.gs` y los HTML del panel |
| `tests/unit/` | Pruebas con `node:test` de la lógica y de `Codigo.gs` sobre un simulador de Google |
| `tests/navegador/` | Pruebas con Playwright del catálogo, el panel y la reducción de fotos, más las capturas del manual |
| `tests/simulador/` | Simulador en memoria de SpreadsheetApp, Drive (servicio avanzado, reglas de `drive.file`), CacheService, etc. |

## Desarrollo

```bash
npm install
npx playwright install chromium   # la primera vez
npm run servir                    # http://localhost:8080 (catálogo) y /panel-local/ (panel simulado)
npm test                          # pruebas de lógica y Apps Script
npm run test:navegador            # pruebas en Chromium (Pixel 7 e iPhone 13)
npm run capturas                  # regenera docs/capturas/
```
