// ==========================================================================
//  GSA Tools - control de acceso en el SERVIDOR (Cloudflare Pages Functions)
//
//  - Cualquiera entra a https://TU-SITIO/ y ve SOLO los proyectos marcados true en "publicos".
//  - Vos (y las cuentas de Gmail de "correos") entran con el botón "Ingresar con Google" y ven TODO.
//  - Cada proyecto además tiene su link privado:  /CARPETA/?k=CLAVE
//
//  IMPORTANTE: este archivo contiene claves. El repositorio de GitHub tiene que ser PRIVADO.
//  Para cambiar algo: editá acá, guardá, push. Cloudflare publica solo (~1 min).
// ==========================================================================
const CONFIG = {
  // ID de cliente de Google (el mismo del presupuestador). En Google Cloud Console →
  // Credenciales → ese cliente → "Orígenes de JavaScript autorizados": agregar https://gsa-tools.pages.dev
  googleClientId: "812734820974-2v5q2vd6u3dsb0uaoq6a9gldtlk7vgg3.apps.googleusercontent.com",

  // Cuentas de Gmail que ven TODO al ingresar con Google. Agregá o sacá las que quieras.
  correos: [
    "lgomez.sop@gmail.com",
    "lgomez.sop2@gmail.com",
    "lucas.gomez.spti@gmail.com",
    "lucasaveit@gmail.com",
    "gsa.solutions.cba@gmail.com",
    "cintia.cerezo.f@gmail.com",
    "matiasgunc@gmail.com"
  ],

  // Respaldo: clave para entrar como dueño sin Google (en https://TU-SITIO/__login).
  // Cuando Google ya funcione, dejala vacía ("") para desactivarla.
  clave: "HYtPfUZ9Tv32Yp",

  // Texto largo al azar que firma las sesiones. No lo compartas. Si lo cambiás, se cierran todas las sesiones.
  secreto: "5be61b1668f1390e6855e81c69bbdefd8af4956375a99d3385dafdd7c87c2d2a",

  // Mostrar u ocultar cada proyecto: true = visible, false = oculto para TODOS (incluido vos).
  // Oculto = desaparece la tarjeta y su dirección responde "No disponible".
  activos: {
    "perfil-elevacion": true,
    "ses-10": true,
    "presupuestador": true,
    "electricidad": true
  },

  // Qué ve CUALQUIER persona que entra sin iniciar sesión (true = lo ve, false = solo vos).
  publicos: {
    "perfil-elevacion": false,
    "ses-10": true,
    "presupuestador": false,
    "electricidad": false
  },

  // Link privado de cada proyecto (para pasarle uno solo a alguien): /CARPETA/?k=CLAVE
  proyectos: {
    "perfil-elevacion": "gdb2bsyadfhkgphg2jt9",
    "ses-10": "aw9kw3zuxkx27rcs7c2s",
    "presupuestador": "9986j4tq7u6b6jn76a7y",
    "electricidad": "zqhentkszads3fmub3ue"
  }
};

const UN_ANIO = 60 * 60 * 24 * 365;
const TREINTA_DIAS = 60 * 60 * 24 * 30;
const enc = new TextEncoder();

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
function cookie(nombre, valor, extra, edad) {
  return nombre + "=" + encodeURIComponent(valor) + "; Path=/; Secure; SameSite=Lax; Max-Age=" + (edad || UN_ANIO) + (extra || "");
}
function b64u(buf) {
  const b = new Uint8Array(buf); let s = "";
  for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function deB64u(str) {
  str = str.replace(/-/g, "+").replace(/_/g, "/"); while (str.length % 4) str += "=";
  const s = atob(str), b = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i);
  return b;
}
const textoDe = (str) => new TextDecoder().decode(deB64u(str));

// ---- Sesión firmada (HMAC) para las cuentas de Google ----
async function hmacKey() {
  return crypto.subtle.importKey("raw", enc.encode(CONFIG.secreto), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
}
async function crearSesion(email) {
  const payload = b64u(enc.encode(JSON.stringify({ e: email, x: Math.floor(Date.now() / 1000) + TREINTA_DIAS })));
  const sig = b64u(await crypto.subtle.sign("HMAC", await hmacKey(), enc.encode(payload)));
  return payload + "." + sig;
}
async function leerSesion(valor) {
  if (!valor || valor.indexOf(".") < 0) return null;
  const [payload, sig] = valor.split(".");
  const esperado = b64u(await crypto.subtle.sign("HMAC", await hmacKey(), enc.encode(payload)));
  if (!igual(sig, esperado)) return null;
  let d; try { d = JSON.parse(textoDe(payload)); } catch (e) { return null; }
  if (!d || !d.e || d.x < Math.floor(Date.now() / 1000)) return null;
  return permitido(d.e) ? d.e : null;   // si sacás un correo de la lista, pierde el acceso
}
function permitido(email) {
  return CONFIG.correos.some((c) => String(c).trim().toLowerCase() === String(email).trim().toLowerCase());
}

// ---- Verificación del token de Google (firma RS256 + datos) ----
async function verificarGoogle(idToken) {
  const partes = String(idToken || "").split(".");
  if (partes.length !== 3) return null;
  let header, payload;
  try { header = JSON.parse(textoDe(partes[0])); payload = JSON.parse(textoDe(partes[1])); } catch (e) { return null; }
  if (header.alg !== "RS256" || !header.kid) return null;
  const r = await fetch("https://www.googleapis.com/oauth2/v3/certs", { cf: { cacheTtl: 3600, cacheEverything: true } });
  if (!r.ok) return null;
  const jwk = ((await r.json()).keys || []).find((k) => k.kid === header.kid);
  if (!jwk) return null;
  const key = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  const ok = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, deB64u(partes[2]), enc.encode(partes[0] + "." + partes[1]));
  if (!ok) return null;
  const ahora = Math.floor(Date.now() / 1000);
  if (payload.aud !== CONFIG.googleClientId) return null;
  if (payload.iss !== "accounts.google.com" && payload.iss !== "https://accounts.google.com") return null;
  if (!payload.exp || payload.exp < ahora) return null;
  if (payload.email_verified !== true && payload.email_verified !== "true") return null;
  return payload.email || null;
}

const PAGINA = (titulo, cuerpo) => "<!doctype html><html lang=\"es\"><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>" + titulo + "</title>" +
  "<body style=\"margin:0;min-height:100vh;display:grid;place-items:center;background:#11161b;color:#e8edf2;font:17px system-ui,sans-serif;text-align:center;padding:24px\">" + cuerpo;
function respuesta(html, status) {
  return new Response(html, { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "private, no-store" } });
}
function json(obj, status) {
  return new Response(JSON.stringify(obj), { status: status || 200, headers: { "Content-Type": "application/json", "Cache-Control": "private, no-store" } });
}
function loginPage(error) {
  return respuesta(PAGINA("GSA Tools",
    "<form method=\"POST\" action=\"/__login\" style=\"width:100%;max-width:340px;background:#181f26;border:2px solid #2a343d;border-radius:14px;padding:28px 24px\">" +
    "<h1 style=\"font-size:1.6rem;margin:0 0 6px\">GSA Tools</h1><p style=\"margin:0 0 18px;color:#93a1ad\">Ingresá la clave del dueño.</p>" +
    "<input name=\"clave\" type=\"password\" autocomplete=\"current-password\" autofocus aria-label=\"Clave\" style=\"width:100%;box-sizing:border-box;padding:12px;border-radius:8px;border:2px solid #2a343d;background:#11161b;color:#e8edf2;font:inherit;font-size:1.3rem;text-align:center\">" +
    "<button style=\"margin-top:14px;width:100%;padding:12px;border:0;border-radius:8px;background:#c8915a;color:#10151a;font:inherit;font-weight:700;cursor:pointer\">Entrar</button>" +
    "<p style=\"min-height:1.3em;margin:10px 0 0;color:#e87a7a;font-size:.9rem\">" + (error || "") + "</p>" +
    "<p style=\"margin:6px 0 0\"><a href=\"/\" style=\"color:#93a1ad;font-size:.9rem\">Volver</a></p></form>"), error ? 401 : 200);
}
function bloqueada() {
  return respuesta(PAGINA("Acceso restringido",
    "<div><h1 style=\"font-size:1.5rem;margin:0 0 8px\">Acceso restringido</h1><p style=\"margin:0;color:#93a1ad\">Abrí el link completo que te enviaron.</p></div>"), 403);
}
function noDisponible() {
  return respuesta(PAGINA("No disponible",
    "<div><h1 style=\"font-size:1.5rem;margin:0 0 8px\">No disponible</h1><p style=\"margin:0;color:#93a1ad\">Esta página no está disponible por el momento.</p></div>"), 404);
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
  const emailSesion = await leerSesion(cookies.gsa_s);
  const porClave = !!CONFIG.clave && igual(cookies.gsa_owner, CONFIG.clave);
  const esDueno = !!emailSesion || porClave;

  // Ingresar con Google (el botón del inicio manda el token acá)
  if (url.pathname === "/__google" && request.method === "POST") {
    let email = null;
    try { email = await verificarGoogle((await request.json()).credential); } catch (e) {}
    if (!email || !permitido(email)) return json({ ok: false }, 403);
    const h = new Headers({ "Content-Type": "application/json", "Cache-Control": "no-store" });
    h.append("Set-Cookie", cookie("gsa_s", await crearSesion(email), "; HttpOnly", TREINTA_DIAS));
    h.append("Set-Cookie", cookie("gsa_o", "1", "", TREINTA_DIAS));   // solo para mostrar el botón "volver"
    return new Response(JSON.stringify({ ok: true }), { headers: h });
  }

  // Respaldo: entrar con clave
  if (url.pathname === "/__login") {
    if (request.method !== "POST") return loginPage("");
    let clave = "";
    try { clave = String((await request.formData()).get("clave") || "").trim(); } catch (e) {}
    if (CONFIG.clave && igual(clave, CONFIG.clave)) {
      const h = new Headers({ Location: "/", "Cache-Control": "no-store" });
      h.append("Set-Cookie", cookie("gsa_owner", CONFIG.clave, "; HttpOnly"));
      h.append("Set-Cookie", cookie("gsa_o", "1"));
      return new Response(null, { status: 303, headers: h });
    }
    await new Promise((ok) => setTimeout(ok, 800));
    return loginPage("Clave incorrecta.");
  }

  // Salir (borra los accesos de este navegador)
  if (url.pathname === "/__salir") {
    const h = new Headers({ Location: "/", "Cache-Control": "no-store" });
    ["gsa_s", "gsa_owner", "gsa_o"].concat(Object.keys(CONFIG.proyectos).map((p) => "gsa_p_" + p))
      .forEach((n) => h.append("Set-Cookie", n + "=; Path=/; Secure; Max-Age=0"));
    return new Response(null, { status: 303, headers: h });
  }

  // Estado para el inicio: qué tarjetas mostrar y si hay sesión
  if (url.pathname === "/__estado") {
    const proyectos = {};
    Object.keys(CONFIG.proyectos).forEach((p) => {
      proyectos[p] = CONFIG.activos[p] !== false && (esDueno || CONFIG.publicos[p] === true);
    });
    return json({ rol: esDueno ? "dueno" : "publico", email: emailSesion || "", clientId: CONFIG.googleClientId, pin: !!CONFIG.clave, proyectos });
  }

  const seg = url.pathname.split("/")[1] || "";
  const clave = Object.prototype.hasOwnProperty.call(CONFIG.proyectos, seg) ? CONFIG.proyectos[seg] : null;

  // Proyectos
  if (clave !== null) {
    if (CONFIG.activos[seg] === false) return noDisponible();
    if (esDueno || CONFIG.publicos[seg] === true) return servir(next);
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

  // Inicio y archivos de la raíz (íconos, config.js, etc.): públicos. Las tarjetas las decide /__estado.
  return next();
}
