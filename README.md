# Decorarte · Catálogo digital

Catálogo de regalos, decoración y servicios para eventos de **Decorarte** (Temascalcingo, Estado de México).

- **Catálogo público:** https://tapqr-temascalcingo.github.io/decorarte-catalogo/
- **Modo demostración:** se muestra mientras `js/config.js` no tenga `endpoint`, o agregando `?demo` a la dirección.

Costo de operación: $0. El catálogo es una página estática en GitHub Pages; los datos viven en una hoja de Google Sheets
de la dueña, las fotos en su Google Drive y el panel de administración es un Google Apps Script ligado a esa hoja.

## Estructura

| Ruta | Qué es |
|---|---|
| `index.html`, `css/`, `js/` | Catálogo público (HTML + CSS + JS sin compilación) |
| `js/logica.js` | Lógica pura: precios, mensajes de WhatsApp, filtros, búsqueda |
| `js/config.js` | URL del endpoint de Apps Script (pública; vacía = demo) |
| `datos/demo.json` | Datos de ejemplo, con el mismo formato que devuelve el endpoint |
| `img/` | Logo, íconos e ilustraciones de la demo |
| `tests/` | Pruebas (`npm test`) y servidor local (`npm run servir`) |

## Desarrollo

```bash
npm install
npm run servir      # http://localhost:8080
npm test            # pruebas de lógica con node:test
```
