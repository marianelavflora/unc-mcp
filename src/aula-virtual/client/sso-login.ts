import { randomInt } from "node:crypto";
import { CookieJar } from "tough-cookie";
import { logger } from "../../shared/logger.js";
import type { Credentials } from "./credentials.js";
import { UnsupportedRegionalError, type Regional, type SsoProviderId } from "./regionals.js";
import { MoodleError } from "./moodle-api.js";

export class LoginRequiredError extends Error {
    constructor(message = "Hace falta iniciar sesión: corré `utn-mcp login`.") {
        super(message);
        this.name = "LoginRequiredError";
    }
}

export class InvalidCredentialsError extends Error {
    constructor(reason?: string) {
        const base = "El aula rechazó usuario o contraseña. Corré `utn-mcp login` para actualizarlos.";
        super(reason ? `${base} Motivo del aula: ${reason}` : base);
        this.name = "InvalidCredentialsError";
    }
}

const MAX_REDIRECTS = 20;
const TIMEOUT_MS = 30_000;

type Landing = { token: string } | { url: string; html: string };
type Page = Extract<Landing, { url: string }>;

/** Lo que cambia de un SSO a otro; el recorrido (aula → SSO → aula → token) es el mismo. */
interface SsoProvider {
    /** El botón de la página de login de Moodle que lleva al SSO. */
    link: RegExp;
    /** Manda usuario y contraseña al formulario del SSO. Si los rechaza, la página queda en el SSO. */
    submit(jar: CookieJar, page: Page, credentials: Credentials): Promise<Landing>;
    /** El motivo del rechazo que muestra el SSO. */
    loginError(html: string): string | undefined;
}

const PROVIDERS: Record<SsoProviderId, SsoProvider> = {
    keycloak: {
        link: /href="([^"]*\/auth\/oauth2\/login\.php[^"]*)"/,
        submit: submitKeycloakForm,
        loginError: extractLoginError,
    },
    microsoft: {
        link: /href="([^"]*\/auth\/oidc\/[^"]*)"/,
        submit: submitMicrosoftForm,
        loginError: microsoftLoginError,
    },
    cas: {
        link: /href="([^"]*\/auth\/saml2\/login\.php[^"]*)"/,
        submit: submitCasForm,
        loginError: casLoginError,
    },
};

/**
 * Obtiene un token del web service. Dos estrategias según la regional:
 * - Regionales con SSO (Keycloak como FRBA, Office 365 como FRH): flujo de launch.php, que usa la
 *   sesión del SSO. Si el SSO rechaza las credenciales, `login/token.php`: hay usuarios sin cuenta en
 *   el SSO.
 * - Regionales con login directo de Moodle (ej. FRT): primero `login/token.php` (no depende del
 *   plugin de mobile launch, que puede estar deshabilitado); si falla, flujo de launch.php.
 * Las cookies se usan solo durante el login y se descartan: las sesiones de Moodle y del SSO duran
 * horas y el token, semanas, así que no sirven para renovarlo.
 */
export async function fetchToken(regional: Regional, credentials: Credentials): Promise<string> {
    if (regional.support === "unsupported") throw new UnsupportedRegionalError(regional);
    const { baseUrl, sso } = regional;
    const jar = new CookieJar();

    // Regionales con login directo: intentamos token.php primero (no depende de launch.php).
    if (!sso) {
        const viaTokenPhp = await tryTokenPhp(baseUrl, credentials);
        if (viaTokenPhp) return viaTokenPhp;
    }

    const launchUrl =
        `${baseUrl}/admin/tool/mobile/launch.php` +
        `?service=moodle_mobile_app&passport=${randomInt(1e9)}&urlscheme=moodlemobile`;

    let landing = await follow(jar, launchUrl);
    if ("token" in landing) return landing.token;

    const provider = sso && PROVIDERS[sso.provider];
    const ssoHref = provider && landing.html.match(provider.link)?.[1];
    // Donde el SSO está forzado (la mayoría de las facultades de la UNC), launch.php redirige derecho al
    // SSO sin pasar por la página de login de Moodle: no hay botón que buscar, ya estamos en el formulario.
    const alreadyAtSso = !!sso && new URL(landing.url).host === sso.host;
    if (sso && provider && (ssoHref || alreadyAtSso)) {
        if (ssoHref) {
            landing = await follow(jar, new URL(decodeHtml(ssoHref), landing.url).toString());
            if ("token" in landing) return landing.token;
        }

        if (new URL(landing.url).host === sso.host) {
            landing = await provider.submit(jar, landing, credentials);
            if ("token" in landing) return landing.token;
            if (new URL(landing.url).host === sso.host) {
                const reason = provider.loginError(landing.html);
                // Aspirantes del ingreso y algunas tecnicaturas no tienen cuenta en el SSO: entran con el login
                // de Moodle. En la UNC no: las cuentas de alumno existen solo en el SSO, Moodle no les valida
                // la contraseña ni por la web ni por la API, y cada intento le suma un login fallido a la
                // cuenta. Si el camino de Moodle también rechaza, el motivo que sirve es el del SSO: el suyo
                // es siempre "Acceso inválido", que para una cuenta que solo existe en el SSO no explica nada.
                if (sso.provider !== "cas") {
                    try {
                        const viaTokenPhp = await tryTokenPhp(baseUrl, credentials);
                        if (viaTokenPhp) return viaTokenPhp;
                    } catch (e) {
                        if (!(e instanceof InvalidCredentialsError)) throw e;
                    }
                }
                throw new InvalidCredentialsError(reason);
            }
        }
    } else {
        const loginPageUrl = `${baseUrl}/login/index.php`;
        const loginPage = await follow(jar, loginPageUrl);
        if ("token" in loginPage) return loginPage.token;
        landing = await submitMoodleLoginForm(jar, loginPage.url, loginPage.html, credentials);
        if ("token" in landing) return landing.token;
        const stillOnLogin =
            landing.url.includes("/login") ||
            /alert-danger/i.test(landing.html) ||
            /loginerrors/i.test(landing.html);
        if (stillOnLogin) {
            const reason = extractLoginError(landing.html);
            throw new InvalidCredentialsError(reason);
        }
    }

    landing = await follow(jar, launchUrl);
    if ("token" in landing) return landing.token;

    if (!sso) {
        const viaTokenPhp = await tryTokenPhp(baseUrl, credentials);
        if (viaTokenPhp) return viaTokenPhp;
    }

    throw unexpected(landing.url);
}

export class MfaRequiredError extends Error {
    constructor(reason?: string) {
        super(
            "Tu cuenta de Microsoft pide un segundo factor (código, app o similar), que UTN-MCP todavía no puede " +
                "completar solo." + (reason ? ` Microsoft dijo: ${reason}` : ""),
        );
        this.name = "MfaRequiredError";
    }
}

/** El `$Config` de las páginas de login de Microsoft: los campos que necesita el flujo. */
interface AadConfig {
    sFT?: string;
    sCtx?: string;
    canary?: string;
    urlPost?: string;
    sErrorCode?: string;
    strServiceExceptionMessage?: string;
    arrUserProofs?: unknown[];
}

/** Cantidad máxima de pasos de Microsoft entre la contraseña y la vuelta al aula (KMSI y similares). */
const MAX_MICROSOFT_STEPS = 6;

/**
 * Formulario de Office 365 (Microsoft Entra ID). No es un `<form>`: los datos están en el `$Config` de
 * la página. Después de la contraseña puede venir "¿Mantener la sesión iniciada?" antes del formulario
 * que vuelve al aula con el `code`. No completa MFA ni logins federados (ADFS).
 */
async function submitMicrosoftForm(jar: CookieJar, page: Page, { username, password }: Credentials): Promise<Landing> {
    const ssoHost = new URL(page.url).host;
    const cfg = parseAadConfig(page.html);
    if (!cfg?.urlPost || !cfg.sFT) {
        throw new Error("No se encontró el formulario de Microsoft; puede que haya cambiado o que el login sea federado.");
    }
    let landing = await follow(jar, new URL(cfg.urlPost, page.url).toString(), {
        method: "POST",
        body: new URLSearchParams({
            login: username,
            loginfmt: username,
            passwd: password,
            type: "11",
            LoginOptions: "3",
            flowToken: cfg.sFT,
            ctx: cfg.sCtx ?? "",
            canary: cfg.canary ?? "",
            i13: "0",
            ps: "2",
        }),
    });

    for (let i = 0; i < MAX_MICROSOFT_STEPS; i++) {
        if ("token" in landing) return landing;
        const form = findPostForm(landing.html);
        const action = form && new URL(form.action, landing.url).toString();
        if (form && action && new URL(action).host !== ssoHost) {
            return follow(jar, action, { method: "POST", body: new URLSearchParams(form.inputs) });
        }

        const step = parseAadConfig(landing.html);
        if (step?.arrUserProofs?.length) throw new MfaRequiredError(step.strServiceExceptionMessage);
        if (step?.sErrorCode) return landing;
        if (step?.urlPost) {
            landing = await follow(jar, new URL(step.urlPost, landing.url).toString(), {
                method: "POST",
                body: new URLSearchParams({
                    LoginOptions: "1",
                    type: "28",
                    ctx: step.sCtx ?? "",
                    flowToken: step.sFT ?? "",
                    canary: step.canary ?? "",
                }),
            });
            continue;
        }
        if (form && action) {
            landing = await follow(jar, action, { method: "POST", body: new URLSearchParams(form.inputs) });
            continue;
        }
        throw unexpected(landing.url);
    }
    throw new Error("Demasiados pasos en el login de Microsoft.");
}

/** El motivo del rechazo en una página de Microsoft (ej. AADSTS50126: usuario o contraseña incorrectos). */
function microsoftLoginError(html: string): string | undefined {
    const cfg = parseAadConfig(html);
    if (!cfg?.sErrorCode) return undefined;
    return cfg.strServiceExceptionMessage || `AADSTS${cfg.sErrorCode}`;
}

/**
 * Extrae el objeto `$Config={...}` que Microsoft embebe en sus páginas de login, recorriendo las
 * llaves a mano (el objeto es grande y una regex no lo acota bien). Devuelve null si no está.
 */
function parseAadConfig(html: string): AadConfig | null {
    const at = html.indexOf("$Config=");
    if (at < 0) return null;
    const start = html.indexOf("{", at);
    if (start < 0) return null;
    let depth = 0;
    let inStr = false;
    let esc = false;
    for (let i = start; i < html.length; i++) {
        const c = html[i];
        if (inStr) {
            if (esc) esc = false;
            else if (c === "\\") esc = true;
            else if (c === '"') inStr = false;
        } else if (c === '"') inStr = true;
        else if (c === "{") depth++;
        else if (c === "}" && --depth === 0) {
            try {
                return JSON.parse(html.slice(start, i + 1)) as AadConfig;
            } catch {
                return null;
            }
        }
    }
    return null;
}

/**
 * El primer `<form method="post">` de la página: su `action` y sus inputs ocultos. Un form sin `action`
 * se postea a la propia página, que es lo que significa el string vacío al resolverlo contra su URL: la
 * pantalla de la contraseña del CAS de la UNC es así (`<form method="post" id="fm1">`, sin `action`).
 */
function findPostForm(html: string): { action: string; inputs: Record<string, string> } | null {
    const m = html.match(/<form\b[^>]*>([\s\S]*?)<\/form>/i);
    if (!m || !/method\s*=\s*["']?post/i.test(m[0])) return null;
    const action = m[0].match(/action\s*=\s*["']([^"']*)["']/i)?.[1] ?? "";
    const inputs: Record<string, string> = {};
    for (const input of m[1].matchAll(/<input\b[^>]*>/gi)) {
        const name = input[0].match(/name\s*=\s*["']([^"']*)["']/i)?.[1];
        if (name) inputs[name] = decodeHtml(input[0].match(/value\s*=\s*["']([^"']*)["']/i)?.[1] ?? "");
    }
    return { action: decodeHtml(action), inputs };
}

/**
 * Pide el token a /login/token.php (Moodle estándar). Devuelve null si el aula no lo expone
 * (no contesta JSON), para seguir con launch.php; si contesta con un error, lo propaga.
 */
async function tryTokenPhp(baseUrl: string, credentials: Credentials): Promise<string | null> {
    const res = await fetch(`${baseUrl}/login/token.php`, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            username: credentials.username,
            password: credentials.password,
            service: "moodle_mobile_app",
        }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    let data: { token?: string; error?: string; errorcode?: string };
    try {
        data = await res.json();
    } catch {
        return null;
    }
    if (data.token) return data.token;
    if (data.errorcode === "invalidlogin" || /invalid login/i.test(data.error ?? "")) {
        throw new InvalidCredentialsError(data.error);
    }
    // Hay aulas (ej. la TUP) a las que se les rompe un plugin de autenticación con cada login
    // rechazado: contestan `generalexceptionmessage`, y el formulario web muestra la misma excepción.
    if (data.errorcode === "generalexceptionmessage") {
        throw new InvalidCredentialsError(
            `${data.error} (es un error interno del aula, que en algunas aparece cuando el usuario o la contraseña están mal)`,
        );
    }
    // El mismo servicio lo usa launch.php: si token.php lo rechaza, seguir no sirve.
    throw new MoodleError(
        `El aula no dio el token (${data.errorcode ?? res.status}): ${data.error ?? "respuesta sin token"}. ` +
            "Si dice que el servicio web no está disponible, lo tiene que habilitar el admin del aula.",
        data.errorcode,
    );
}

/** Formulario de Keycloak: el `action` viene en el `loginAction` del JSON que arma la página. */
async function submitKeycloakForm(jar: CookieJar, { html }: Page, { username, password }: Credentials): Promise<Landing> {
    const action = html.match(/"loginAction"\s*:\s*("(?:[^"\\]|\\.)*")/)?.[1];
    if (!action) throw new Error("No se encontró el formulario de Keycloak; puede que haya cambiado.");

    const body = new URLSearchParams({ username, password, rememberMe: "on", credentialId: "" });
    return follow(jar, JSON.parse(action) as string, { method: "POST", body });
}

/**
 * Pasos máximos del webflow de CAS: usuario, contraseña y el relay SAML son tres, y quedan tres de
 * margen para pantallas intermedias (avisos, elección de IdP) antes de cortar.
 */
const MAX_CAS_STEPS = 6;

/**
 * Formulario del Apereo CAS que valida usuario y contraseña detrás del IdP Shibboleth de la UNC. Es
 * identifier-first (usuario y contraseña en pantallas separadas) y el `execution` del Spring Webflow
 * cambia en cada paso, así que el bucle decide qué mandar mirando el formulario que tiene a mano en vez
 * de contar pasos: así no importa cuántas pantallas meta el CAS ni si pide `username` de nuevo.
 */
async function submitCasForm(jar: CookieJar, page: Page, { username, password }: Credentials): Promise<Landing> {
    const ssoHost = new URL(page.url).host;
    let landing: Landing = page;
    let passwordSent = false;

    for (let i = 0; i < MAX_CAS_STEPS; i++) {
        if ("token" in landing) return landing;
        // Si ya mandamos algo y el CAS muestra un error, rechazó las credenciales: lo cuenta `fetchToken`.
        if (i > 0 && casLoginError(landing.html)) return casStep(i, landing, "el CAS muestra un error");

        const form = findPostForm(landing.html);
        // Sigue en el SSO y no hay nada más que postear: que `fetchToken` decida con `loginError`.
        if (!form) return casStep(i, landing, "sin formulario que postear");
        const action = new URL(form.action, landing.url).toString();

        // El relay SAML: un form autoejecutable con `SAMLResponse` + `RelayState` que apunta al ACS de
        // Moodle (`/auth/saml2/sp/saml2-acs.php/<aula>`). Se postea tal cual y el 303 del ACS termina en
        // `moodlemobile://token=...`, que ya resuelve `follow`. Se reconoce por su `SAMLResponse` antes
        // que por el host: así sigue andando aunque su `action` venga de una plantilla que lo escape raro.
        if ("SAMLResponse" in form.inputs || new URL(action).host !== ssoHost) {
            return follow(jar, action, { method: "POST", body: new URLSearchParams(form.inputs) });
        }

        // El paso de la contraseña se reconoce por tener el input `password` en el form, no por su número.
        const isPasswordStep = "password" in form.inputs;
        // Volver a la pantalla de contraseña después de haberla mandado es un rechazo, aunque no le
        // reconozcamos el mensaje de error: reintentar la encadenaría hasta bloquear la cuenta, porque el
        // CAS cuenta los intentos fallidos. Que `fetchToken` lo reporte como credenciales inválidas.
        if (isPasswordStep && passwordSent) return casStep(i, landing, "volvió a pedir la contraseña");

        logger.info(`Paso ${i + 1} del CAS: ${isPasswordStep ? "contraseña" : "usuario"}.`);
        // `username` va en los dos pasos: es inocuo y cubre que el CAS lo pida como hidden en el segundo.
        const body = new URLSearchParams({
            ...form.inputs,
            username,
            ...(isPasswordStep ? { password } : {}),
            _eventId: "submit",
        });
        passwordSent ||= isPasswordStep;
        landing = await follow(jar, action, { method: "POST", body });
    }
    throw new Error("Demasiados pasos en el login del CAS de la UNC.");
}

/**
 * Deja asentado en qué paso del CAS se cortó el login y por qué, y devuelve la página tal cual para que
 * `fetchToken` decida el error. Loguea host y path solamente: el query de estas URLs lleva el
 * `SAMLRequest` y el `RelayState`, que no aportan nada para diagnosticar y son ruido.
 */
function casStep(step: number, landing: Page, why: string): Page {
    const { host, pathname } = new URL(landing.url);
    logger.info(`El login del CAS se detuvo en el paso ${step + 1} (${host}${pathname}): ${why}.`);
    return landing;
}

/** Login directo de Moodle (sin SSO): manda usuario y contraseña al formulario de /login/index.php. */
async function submitMoodleLoginForm(
    jar: CookieJar,
    pageUrl: string,
    html: string,
    { username, password }: Credentials,
): Promise<Landing> {
    const tokenMatch =
        html.match(/name="logintoken"\s+value="([^"]*)"/) ||
        html.match(/value="([^"]*)"\s+name="logintoken"/);
    const logintoken = tokenMatch?.[1] ?? "";

    const actionMatch = html.match(/<form[^>]*action="([^"]*)"[^>]*>/i);
    let action = actionMatch?.[1] ? decodeHtml(actionMatch[1]) : "";
    if (!action) action = pageUrl;
    if (!action.startsWith("http")) action = new URL(action, pageUrl).toString();

    const body = new URLSearchParams({ username, password, logintoken, anchor: "" });
    return follow(jar, action, { method: "POST", body });
}

/** Hace la request y sigue redirecciones a mano, guardando cookies en cada salto. */
async function follow(jar: CookieJar, url: string, init?: RequestInit): Promise<Landing> {
    for (let i = 0; i < MAX_REDIRECTS; i++) {
        const cookie = await jar.getCookieString(url);
        const res = await fetch(url, {
            ...init,
            redirect: "manual",
            headers: cookie ? { cookie } : {},
            signal: AbortSignal.timeout(TIMEOUT_MS),
        });
        for (const setCookie of res.headers.getSetCookie()) {
            await jar.setCookie(setCookie, url, { ignoreError: true });
        }

        const location = res.headers.get("location");
        if (res.status >= 300 && res.status < 400 && location) {
            await res.body?.cancel();
            if (location.startsWith("moodlemobile://")) return { token: decodeLaunchToken(location) };
            url = new URL(location, url).toString();
            init = undefined; // tras un redirect, siempre GET
            continue;
        }
        return { url, html: await res.text() };
    }
    throw new Error("Demasiadas redirecciones en el login.");
}

/** moodlemobile://token=BASE64(siteid:::token[:::privatetoken]) → token */
export function decodeLaunchToken(url: string): string {
    const encoded = decodeURIComponent(url.split("token=")[1] ?? "");
    const parts = Buffer.from(encoded, "base64").toString("utf8").split(":::");
    if (parts.length < 2 || !parts[1]) throw new Error("Formato de token inesperado en launch.php");
    return parts[1];
}

/**
 * Las entidades de los atributos de estas páginas. No alcanza con `&amp;`: las plantillas del IdP
 * Shibboleth de la UNC escapan el `action` y el `RelayState` del relay SAML carácter por carácter, hasta
 * los `:` y las `/` (`https&#x3a;&#x2f;&#x2f;...`). Sin decodificar eso, el `#` de la primera entidad
 * arranca un fragmento y la URL resuelve a un path inexistente del propio IdP. `&amp;` va al final para
 * no volver a decodificar lo que ya salió de otra entidad.
 */
const decodeHtml = (s: string) =>
    s
        .replace(/&#x([0-9a-f]{1,6});/gi, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
        .replace(/&#(\d{1,7});/g, (_, dec: string) => String.fromCodePoint(Number(dec)))
        .replaceAll("&quot;", '"')
        .replaceAll("&apos;", "'")
        .replaceAll("&lt;", "<")
        .replaceAll("&gt;", ">")
        .replaceAll("&amp;", "&");

/** Extrae el mensaje de error que muestra Moodle/Keycloak en la página de login. */
function extractLoginError(html: string): string | undefined {
    return matchErrorText(html, [
        /alert-danger[^>]*>([\s\S]*?)<\/div>/i,
        /alert-error[^>]*>([\s\S]*?)<\/div>/i,
        /class="[^"]*error[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
        /<div[^>]*id="loginerrormessage"[^>]*>([\s\S]*?)<\/div>/i,
    ]);
}

/**
 * El contenedor de error del CAS de la UNC, visto en su HTML real el 2026-10-25: `#server-error` en la
 * pantalla del usuario y `#server-errors` (con items `.server-error-item`) en la de la contraseña. Los
 * patrones genéricos no sirven acá porque el mensaje está dos divs adentro, así que cortar en el primer
 * `</div>` deja solo un comentario sin texto.
 */
const CAS_ERROR_CONTAINER = /<div[^>]*id="server-errors?"[^>]*>/i;

/** Cuánto HTML se mira después del contenedor: si está vacío, no se sale a buscar texto del formulario. */
const CAS_ERROR_SPAN = 1000;

/** El motivo del rechazo que muestra el CAS de la UNC; si no reconoce el contenedor, prueba el genérico. */
function casLoginError(html: string): string | undefined {
    const container = html.match(CAS_ERROR_CONTAINER);
    if (container?.index !== undefined) {
        const from = container.index + container[0].length;
        const text = firstText(html.slice(from, from + CAS_ERROR_SPAN));
        if (text) return text;
    }
    return extractLoginError(html);
}

/** El primer texto visible del fragmento: en el contenedor de error del CAS es el mensaje. */
function firstText(html: string): string | undefined {
    for (const chunk of html.replace(/<!--[\s\S]*?-->/g, "").split(/<[^>]+>/)) {
        const text = chunk.replace(/\s+/g, " ").trim();
        if (text) return text;
    }
    return undefined;
}

/** El primero de esos contenedores que tenga texto, ya sin etiquetas ni espacios de más. */
function matchErrorText(html: string, patterns: RegExp[]): string | undefined {
    for (const re of patterns) {
        const m = html.match(re);
        if (m?.[1]) {
            const text = m[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
            if (text) return text;
        }
    }
    return undefined;
}

const unexpected = (url: string) => {
    const { host, pathname } = new URL(url);
    return new Error(`Flujo de login inesperado: terminó en ${host}${pathname}`);
};
