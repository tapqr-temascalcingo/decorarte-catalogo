// Configuración pública del catálogo. Aquí NO va ninguna llave ni dato privado.
//
// endpoint: URL "/exec" de la implementación "API catálogo" de Apps Script
//           (ver INSTALACION.md, paso 6). Si está vacía, el catálogo muestra los datos de demostración.
// panel:    URL "/exec" de la implementación "Panel" (paso 7). La usa el acceso directo /panel/.
//           No es secreta: el panel solo deja entrar a los correos autorizados.
// whatsappRespaldo: número para el botón de contacto si el catálogo no logra cargar.
export const CONFIG = {
  endpoint: 'https://script.google.com/macros/s/AKfycbyUl6tN45ACkqIoibr3S3DiP_6xS-jKxf2WyLrveeLZnTzB4ssTtPxgE1bCDj0yBfrM/exec',
  panel: '',
  whatsappRespaldo: '527122319080',
};
