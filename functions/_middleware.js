// ==========================================================================
//  GSA Tools - control de acceso en el SERVIDOR (Cloudflare Pages Functions)
//  Sin la clave correcta el servidor NO entrega ningún archivo del proyecto.
//
//  IMPORTANTE: este archivo contiene las claves en texto plano.
//  El repositorio de GitHub tiene que ser PRIVADO.
//
//  Para cambiar algo: editá acá, guardá, push. Cloudflare publica solo (~1 min).
// ==========================================================================
const CONFIG = {
  // Clave del dueño: abre el inicio y TODOS los proyectos. Cambiala por una larga.
  clave: "5555",

  // Clave de cada proyecto para los links que compartís: ...tu-sitio/CARPETA/?k=CLAVE
  proyectos: {
    "perfil-elevacion": "gdb2bsyadfhkgphg2jt9",
    "ses-10": "aw9kw3zuxkx27rcs7c2s",
    "presupuestador": "9986j4tq7u6b6jn76a7y",
    "electricidad": "zqhentkszads3fmub3ue"
  },

  // Mostrar u ocultar cada proyecto: true = visible, false = oculto para TODOS (incluido vos).
  // Oculto = desaparece la tarjeta del inicio y su dirección responde "No disponible".
  activos: {
    "perfil-elevacion": true,
    "ses-10": true,
    "presupuestador": true,
    "electricidad": true
  },

  // Carpetas abiertas a cualquiera, sin clave. Ej.: ["electricidad"] para publicar la web de la empresa.
  publicos: []
};

const UN_ANIO = 60 * 60 * 24 * 365;

function parseCookies(req) {
  const o = {};
  (req.headers.get("Cookie") || "").split(/;\s*/).forEach((p) => {
    const i = p.indexOf("=");
    if (i > 0) { try { o[p.slice(0, i)] = decodeURIComponent(p.slice(i + 1)); } catch (e) {} }
  });
  return o;
}
function igual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
function cookie(nombre, valor, extra) {
  return nombre + "=" + encodeURIComponent(valor) + "; Path=/; Secure; SameSite=Lax; Max-Age=" + UN_ANIO + (extra || "");
}
const PAGINA = (titulo, cuerpo) => "<!doctype html><html lang=\"es\"><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>" + titulo + "</title>" +
  "<body style=\"margin:0;min-height:100vh;display:grid;place-items:center;background:#11161b;color:#e8edf2;font:17px system-ui,sans-serif;text-align:center;padding:24px\">" + cuerpo;
function respuesta(html, status) {
  return new Response(html, { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "private, no-store" } });
}
function loginPage(error) {
  return respuesta(PAGINA("GSA Tools",
    "<form method=\"POST\" action=\"/__login\" style=\"width:100%;max-width:340px;background:#181f26;border:2px solid #2a343d;border-radius:14px;padding:28px 24px\">" +
    "<h1 style=\"font-size:1.6rem;margin:0 0 6px\">GSA Tools</h1><p style=\"margin:0 0 18px;color:#93a1ad\">Ingresá la clave para continuar.</p>" +
    "<input name=\"clave\" type=\"password\" autocomplete=\"current-password\" autofocus aria-label=\"Clave\" style=\"width:100%;box-sizing:border-box;padding:12px;border-radius:8px;border:2px solid #2a343d;background:#11161b;color:#e8edf2;font:inherit;font-size:1.3rem;text-align:center\">" +
    "<button style=\"margin-top:14px;width:100%;padding:12px;border:0;border-radius:8px;background:#c8915a;color:#10151a;font:inherit;font-weight:700;cursor:pointer\">Entrar</button>" +
    "<p style=\"min-height:1.3em;margin:10px 0 0;color:#e87a7a;font-size:.9rem\">" + (error || "") + "</p></form>"), 401);
}
function noDisponible() {
  return respuesta(PAGINA("No disponible",
    "<div><h1 style=\"font-size:1.5rem;margin:0 0 8px\">No disponible</h1><p style=\"margin:0;color:#93a1ad\">Esta página no está disponible por el momento.</p></div>"), 404);
}
function bloqueada() {
  return respuesta(PAGINA("Acceso restringido",
    "<div><h1 style=\"font-size:1.5rem;margin:0 0 8px\">Acceso restringido</h1><p style=\"margin:0;color:#93a1ad\">Abrí el link completo que te enviaron.</p></div>"), 403);
}
async function servir(next) {
  const res = await next();
  const r = new Response(res.body, res);
  r.headers.set("Cache-Control", "private, no-store");
  return r;
}

export async function onRequest(context) {
  const { request, next } = context;
  const url = new URL(request.url);
  const cookies = parseCookies(request);
  const esDueno = igual(cookies.gsa_owner, CONFIG.clave);

  // Entrar con la clave del dueño
  if (url.pathname === "/__login" && request.method === "POST") {
    let clave = "";
    try { clave = String((await request.formData()).get("clave") || "").trim(); } catch (e) {}
    if (igual(clave, CONFIG.clave)) {
      const h = new Headers({ Location: "/", "Cache-Control": "no-store" });
      h.append("Set-Cookie", cookie("gsa_owner", CONFIG.clave, "; HttpOnly"));
      h.append("Set-Cookie", cookie("gsa_o", "1"));   // solo para mostrar el botón "volver" en la pantalla
      return new Response(null, { status: 303, headers: h });
    }
    await new Promise((ok) => setTimeout(ok, 800));
    return loginPage("Clave incorrecta.");
  }

  // Salir (borra todos los accesos de este navegador)
  if (url.pathname === "/__salir") {
    const h = new Headers({ Location: "/", "Cache-Control": "no-store" });
    ["gsa_owner", "gsa_o"].concat(Object.keys(CONFIG.proyectos).map((p) => "gsa_p_" + p))
      .forEach((n) => h.append("Set-Cookie", n + "=; Path=/; Secure; Max-Age=0"));
    return new Response(null, { status: 303, headers: h });
  }

  const seg = url.pathname.split("/")[1] || "";
  const clave = Object.prototype.hasOwnProperty.call(CONFIG.proyectos, seg) ? CONFIG.proyectos[seg] : null;

  // Estado de los proyectos (lo usa el inicio para mostrar u ocultar las tarjetas). Solo el dueño.
  if (url.pathname === "/__estado") {
    if (!esDueno) return bloqueada();
    const e = {};
    Object.keys(CONFIG.proyectos).forEach((p) => { e[p] = CONFIG.activos[p] !== false; });
    return new Response(JSON.stringify(e), { headers: { "Content-Type": "application/json", "Cache-Control": "private, no-store" } });
  }

  // Proyectos
  if (clave !== null) {
    if (CONFIG.activos[seg] === false) return noDisponible();
    if (CONFIG.publicos.indexOf(seg) !== -1 || esDueno) return servir(next);
    const k = url.searchParams.get("k");
    if (k && igual(k, clave)) {
      url.searchParams.delete("k");
      const h = new Headers({ Location: url.pathname + url.search, "Cache-Control": "no-store" });
      h.append("Set-Cookie", cookie("gsa_p_" + seg, clave, "; HttpOnly"));
      return new Response(null, { status: 302, headers: h });
    }
    if (igual(cookies["gsa_p_" + seg], clave)) return servir(next);
    return bloqueada();
  }

  // Inicio: solo el dueño. Los demás archivos de la raíz (íconos, config.js, etc.) son públicos.
  if (url.pathname === "/" || url.pathname === "/index.html") {
    return esDueno ? servir(next) : loginPage("");
  }
  return next();
}
