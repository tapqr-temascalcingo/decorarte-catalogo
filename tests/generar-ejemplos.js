// Genera apps-script/Ejemplos.gs a partir de datos/demo.json:  npm run ejemplos
// Así "cargarEjemplos" no necesita descargar nada (sin permiso de "servicio externo").
import { readFileSync, writeFileSync } from 'node:fs';

const demo = JSON.parse(readFileSync(new URL('../datos/demo.json', import.meta.url), 'utf8'));
const ejemplos = {
  productos: demo.productos,
  paquetes: demo.paquetes,
  temporada: demo.config.temporada,
  temporadaTitulo: demo.config.temporadaTitulo,
};
const texto = `/**
 * Productos de ejemplo que carga "cargarEjemplos". Archivo generado desde datos/demo.json
 * con \`npm run ejemplos\`; no lo edites a mano.
 */
const EJEMPLOS = ${JSON.stringify(ejemplos, null, 2)};
`;
writeFileSync(new URL('../apps-script/Ejemplos.gs', import.meta.url), texto);
console.log('apps-script/Ejemplos.gs actualizado');
