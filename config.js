// ============================================================
//  Configuración de GSA Tools (versión Cloudflare: el acceso lo controla el servidor)
//
//  mostrarWeb : true = el inicio muestra la tarjeta de la web de la empresa (/electricidad/);
//               false = no la muestra. Ojo: quién puede ABRIRLA se define en functions/_middleware.js.
//  servidor   : true = el control de acceso lo hace Cloudflare (no tocar).
//
//  Después de editar: guardá y hacé push.
// ============================================================
window.GSA_CONFIG = {
  mostrarWeb: false,
  servidor: true
};
