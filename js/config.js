// Configuración pública del catálogo. Aquí NO va ninguna llave ni dato privado.
//
// endpoint: URL "/exec" de la implementación "API catálogo" de Apps Script
//           (ver INSTALACION.md, paso 6). Si está vacía, el catálogo muestra los datos de demostración.
// panel:    URL "/exec" de la implementación "Panel" (paso 7). La usa el acceso directo /panel/.
//           No es secreta: el panel solo deja entrar a los correos autorizados.
// whatsappRespaldo: número para el botón de contacto si el catálogo no logra cargar.
export const CONFIG = {
  endpoint: 'https://script.google.com/macros/s/AKfycbw7F7dZuC67mM1ccM2zalNo3kLsCzc4bTSd9aCY_wm_xKiu5nqW1o7zx7Kl7nyZyruKJg/exec',
  panel: 'https://script.google.com/macros/s/AKfycby5-G5Rqb0SaaiiGRnxfoot4ISENE2lxZRa9jJWrcSxqapk0ExEKYBez9Q-wCNlx2t6Rw/exec',
  whatsappRespaldo: '527122319080',
};
