/**
 * Qué se sabe de si el MCP anda con el aula de una regional:
 * - `verified`: alguien ya entró y usó las tools.
 * - `candidate`: tiene habilitado el servicio `moodle_mobile_app` (y se sabe cómo entra), así que
 *   casi seguro anda; se verifica con el primer login que funcione.
 * - `unsupported`: no tiene el servicio habilitado, o entra por un login que todavía no sabemos usar;
 *   se puede elegir, pero todavía no se puede usar.
 */
export type RegionalSupport = "verified" | "candidate" | "unsupported";

/**
 * Los SSO que sabemos usar: Keycloak propio de la regional, Office 365 (Microsoft Entra ID) o el
 * SAML2 de la UNC, donde quien valida usuario y contraseña detrás del IdP es un Apereo CAS.
 */
export type SsoProviderId = "keycloak" | "microsoft" | "cas";

/** El SSO por el que entra el aula: quién valida usuario y contraseña, y en qué host. */
export interface Sso {
    provider: SsoProviderId;
    host: string;
}

/** De qué universidad es el aula: agrupa el selector de login, que si no tendría ~46 entradas en una lista plana. */
export type UniversityId = "utn" | "unc";

/** Nombre corto para mostrar en el selector de login, agrupado por universidad. */
export const UNIVERSITY_NAME: Record<UniversityId, string> = {
    utn: "UTN",
    unc: "UNC",
};

/** El aula virtual de una regional de la UTN. Sin `sso`, entra con el login directo de Moodle. */
export interface Regional {
    id: string;
    name: string;
    baseUrl: string;
    sso?: Sso;
    support: RegionalSupport;
    /**
     * Opcional a propósito: así las ~30 entradas de la UTN quedan intactas (sin `university: "utn"` en
     * cada una) y un merge futuro con el upstream no conflictúa línea por línea. Sin el campo, es UTN:
     * el catálogo original.
     */
    university?: UniversityId;
}

/** La universidad de una regional: sin el campo, es la UTN, el catálogo original. */
export function universityOf(r: Regional): UniversityId {
    return r.university ?? "utn";
}

/** Office 365: cada regional tiene su tenant, pero el login es siempre en este host. */
const MICROSOFT_SSO: Sso = { provider: "microsoft", host: "login.microsoftonline.com" };

/** UNC: casi todas las facultades entran por el mismo IdP SAML2 central, así que el SSO es uno solo. */
export const UNC_SSO: Sso = { provider: "cas", host: "autenticar.unc.edu.ar" };

/**
 * El soporte de las que no son `verified` sale de `tool_mobile_get_public_config`, que Moodle contesta
 * sin login (octubre de 2026). Falta Villa María (FRVM): no encontramos su aula.
 */
const REGIONALS: Regional[] = [
    { id: "fra", name: "Avellaneda (FRA)", baseUrl: "https://www.utnfravirtual.org.ar", support: "candidate" },
    { id: "frbb", name: "Bahía Blanca (FRBB)", baseUrl: "https://aulavirtual.frbb.utn.edu.ar", support: "candidate" },
    {
        id: "frba",
        name: "Buenos Aires (FRBA)",
        baseUrl: "https://aulasvirtuales.frba.utn.edu.ar",
        sso: { provider: "keycloak", host: "auth.frba.utn.edu.ar" },
        support: "verified",
    },
    { id: "frch", name: "Chubut (FRCh)", baseUrl: "https://frch.cvg.utn.edu.ar", support: "candidate" },
    { id: "frcu", name: "Concepción del Uruguay (FRCU)", baseUrl: "https://virtual.frcu.utn.edu.ar", support: "candidate" },
    { id: "frcon", name: "Concordia (FRCon)", baseUrl: "https://frcon.cvg.utn.edu.ar", support: "candidate" },
    { id: "frc", name: "Córdoba (FRC)", baseUrl: "https://uv.frc.utn.edu.ar", support: "verified" },
    { id: "frd", name: "Delta (FRD)", baseUrl: "https://frd.cvg.utn.edu.ar", support: "candidate" },
    { id: "frgp", name: "General Pacheco (FRGP)", baseUrl: "https://frgp.cvg.utn.edu.ar", support: "candidate" },
    { id: "frh", name: "Haedo (FRH)", baseUrl: "https://frh.cvg.utn.edu.ar", sso: MICROSOFT_SSO, support: "candidate" },
    { id: "frlp", name: "La Plata (FRLP)", baseUrl: "https://frlp.cvg.utn.edu.ar", support: "candidate" },
    { id: "frlr", name: "La Rioja (FRLR)", baseUrl: "https://frlr.cvg.utn.edu.ar", support: "candidate" },
    // Tiene también frmdp.cvg.utn.edu.ar, pero ese entra con Office 365 y no tiene el mobile web service
    // habilitado, así que no puede emitir token aunque se resuelva el login.
    { id: "frmdp", name: "Mar del Plata (FRMDP)", baseUrl: "https://campus.mdp.utn.edu.ar", support: "candidate" },
    // Sin el servicio habilitado.
    { id: "frm", name: "Mendoza (FRM)", baseUrl: "https://campusvirtual.frm.utn.edu.ar", support: "unsupported" },
    { id: "frn", name: "Neuquén (FRN)", baseUrl: "https://frn.cvg.utn.edu.ar", support: "candidate" },
    { id: "frp", name: "Paraná (FRP)", baseUrl: "https://frp.cvg.utn.edu.ar", support: "candidate" },
    { id: "frra", name: "Rafaela (FRRa)", baseUrl: "https://frra.cvg.utn.edu.ar", support: "candidate" },
    { id: "frrq", name: "Reconquista (FRRq)", baseUrl: "https://frrq.cvg.utn.edu.ar", support: "candidate" },
    { id: "frre", name: "Resistencia (FRRE)", baseUrl: "https://frre.cvg.utn.edu.ar", support: "verified" },
    { id: "frro", name: "Rosario (FRRo)", baseUrl: "https://frro.cvg.utn.edu.ar", support: "candidate" },
    { id: "frsfco", name: "San Francisco (FRSFco)", baseUrl: "https://frsfco.cvg.utn.edu.ar", support: "candidate" },
    { id: "frsn", name: "San Nicolás (FRSN)", baseUrl: "https://frsn.cvg.utn.edu.ar", sso: MICROSOFT_SSO, support: "candidate" },
    { id: "frsr", name: "San Rafael (FRSR)", baseUrl: "https://campus.frsr.utn.edu.ar/moodle", support: "candidate" },
    { id: "frsc", name: "Santa Cruz (FRSC)", baseUrl: "https://frsc.cvg.utn.edu.ar", support: "candidate" },
    { id: "frsf", name: "Santa Fe (FRSF)", baseUrl: "https://campusvirtual.frsf.utn.edu.ar", support: "candidate" },
    // Sin el servicio habilitado.
    { id: "frtdf", name: "Tierra del Fuego (FRTDF)", baseUrl: "https://cvg.frtdf.utn.edu.ar", support: "unsupported" },
    { id: "frtl", name: "Trenque Lauquen (FRTL)", baseUrl: "https://frtl.cvg.utn.edu.ar", support: "candidate" },
    { id: "frt", name: "Tucumán (FRT)", baseUrl: "https://frt.cvg.utn.edu.ar", support: "verified" },
    // No es una regional sino el aula de la Tecnicatura en Programación a distancia del SIED.
    { id: "tup", name: "Tecnicatura en Programación (SIED)", baseUrl: "https://tup.sied.utn.edu.ar", support: "verified" },
    // Sin el servicio habilitado.
    { id: "frvt", name: "Venado Tuerto (FRVT)", baseUrl: "https://frvt.cvg.utn.edu.ar", support: "unsupported" },

    // Facultades y dependencias de la UNC, relevadas con requests públicos (sin credenciales) el
    // 2026-10-25 (`relevamiento-aulas.md`): todas tienen el servicio móvil habilitado. Solo FCEFyN está
    // `verified`; las demás comparten el IdP, así que se espera que anden igual, pero nadie entró.
    {
        // `verified` el 2026-10-25 con una cuenta real: login por CAS, cursos, secciones, foro con sus
        // discusiones y lectura de archivos (HTML y un PDF de 464 páginas) contra Moodle 4.5.8+.
        id: "unc-fcefyn",
        name: "Ciencias Exactas, Físicas y Naturales (FCEFyN)",
        baseUrl: "https://fcefyn.aulavirtual.unc.edu.ar",
        sso: UNC_SSO,
        support: "verified",
        university: "unc",
    },
    // Las tres que no fuerzan SSO (FAMAF, Psicología, FCQ) tienen el servicio móvil habilitado y
    // declaran `typeoflogin: 1` (login en la app, con usuario y contraseña) en
    // `tool_mobile_get_public_config`, así que el login directo de Moodle debería alcanzarles; FCEFyN,
    // en cambio, declara 3 (navegador embebido) porque entra por SAML. Confirmado el 2026-10-25 con
    // `lib/ajax/service-nologin.php`, sin credenciales.
    {
        id: "unc-famaf",
        name: "Matemática, Astronomía, Física y Computación (FAMAF)",
        baseUrl: "https://famaf.aulavirtual.unc.edu.ar",
        support: "candidate",
        university: "unc",
    },
    // Mismo caso que FAMAF: entra por el login directo de Moodle y el SSO es opcional.
    {
        id: "unc-psicologia",
        name: "Psicología (FP)",
        baseUrl: "https://psicologia.aulavirtual.unc.edu.ar",
        support: "candidate",
        university: "unc",
    },
    {
        id: "unc-derecho",
        name: "Derecho (FD)",
        baseUrl: "https://derecho.aulavirtual.unc.edu.ar",
        sso: UNC_SSO,
        support: "candidate",
        university: "unc",
    },
    // Existe también campusvirtual.fcm.unc.edu.ar, pero es WordPress: no es el aula virtual.
    {
        id: "unc-medicina",
        name: "Ciencias Médicas (FCM)",
        baseUrl: "https://fcm.aulavirtual.unc.edu.ar",
        sso: UNC_SSO,
        support: "candidate",
        university: "unc",
    },
    {
        id: "unc-odontologia",
        name: "Odontología (FO)",
        baseUrl: "https://odontologia.aulavirtual.unc.edu.ar",
        sso: UNC_SSO,
        support: "candidate",
        university: "unc",
    },
    {
        id: "unc-economicas",
        name: "Ciencias Económicas (FCE)",
        baseUrl: "https://eco.aulavirtual.unc.edu.ar",
        sso: UNC_SSO,
        support: "candidate",
        university: "unc",
    },
    {
        id: "unc-humanidades",
        name: "Filosofía y Humanidades (FFyH)",
        baseUrl: "https://ffyh.aulavirtual.unc.edu.ar",
        sso: UNC_SSO,
        support: "candidate",
        university: "unc",
    },
    {
        id: "unc-arquitectura",
        name: "Arquitectura, Urbanismo y Diseño (FAUD)",
        baseUrl: "https://faud.aulavirtual.unc.edu.ar",
        sso: UNC_SSO,
        support: "candidate",
        university: "unc",
    },
    // Hay un aula aparte para el Dpto. Cultural: cultural.lenguas.aulavirtual.unc.edu.ar.
    {
        id: "unc-lenguas",
        name: "Lenguas (FL)",
        baseUrl: "https://lenguas.aulavirtual.unc.edu.ar",
        sso: UNC_SSO,
        support: "candidate",
        university: "unc",
    },
    {
        id: "unc-agropecuarias",
        name: "Ciencias Agropecuarias (FCA)",
        baseUrl: "https://fca.aulavirtual.unc.edu.ar",
        sso: UNC_SSO,
        support: "candidate",
        university: "unc",
    },
    // Única que vive fuera de aulavirtual.unc.edu.ar: instancia propia, sin el SSO central y sin ningún
    // proveedor de identidad declarado, así que entra solo con el login directo de Moodle.
    {
        id: "unc-quimica",
        name: "Ciencias Químicas (FCQ)",
        baseUrl: "https://distancia.fcq.unc.edu.ar",
        support: "candidate",
        university: "unc",
    },
    {
        id: "unc-artes",
        name: "Artes (FA)",
        baseUrl: "https://artes.aulavirtual.unc.edu.ar",
        sso: UNC_SSO,
        support: "candidate",
        university: "unc",
    },
    // Acceso exclusivo con email institucional @mi.unc.edu.ar según el relevamiento.
    {
        id: "unc-sociales",
        name: "Ciencias Sociales (FCS)",
        baseUrl: "https://sociales.aulavirtual.unc.edu.ar",
        sso: UNC_SSO,
        support: "candidate",
        university: "unc",
    },
    {
        id: "unc-comunicacion",
        name: "Ciencias de la Comunicación (FCC)",
        baseUrl: "https://fcc.aulavirtual.unc.edu.ar",
        sso: UNC_SSO,
        support: "candidate",
        university: "unc",
    },
    // No es una facultad sino un colegio preuniversitario, pero tiene aula propia en el mismo esquema.
    {
        id: "unc-monserrat",
        name: "Colegio Nacional de Monserrat (CNM)",
        baseUrl: "https://monserrat.aulavirtual.unc.edu.ar",
        sso: UNC_SSO,
        support: "candidate",
        university: "unc",
    },
];

/** FCEFyN: es la facultad de la usuaria de este fork y la única validada end-to-end hasta ahora. */
const DEFAULT_REGIONAL = "unc-fcefyn";

/** `UTN_REGIONAL` no está en el registro: sin cortar acá, las credenciales irían al SSO de otra institución. */
export class UnknownRegionalError extends Error {
    name = "UnknownRegionalError";
    constructor(regional: string) {
        super(
            `"${regional}" no es una regional conocida. Las válidas son: ${availableRegionals().map((r) => r.id).join(", ")}. ` +
                "Si tu campus no está en la lista, borrá UTN_REGIONAL y definí UTN_AULA_BASE_URL con la URL del aula " +
                "(y UTN_SSO_HOST si entra por SSO: el host del Keycloak, login.microsoftonline.com si es Office 365, " +
                "o autenticar.unc.edu.ar si es el CAS de la UNC).",
        );
    }
}

/** Su aula no tiene el servicio habilitado o entra por un SSO que no sabemos usar: ni se intenta entrar. */
export class UnsupportedRegionalError extends Error {
    name = "UnsupportedRegionalError";
    constructor(readonly regional: Regional) {
        super(
            `Todavía no hay soporte para ${regional.name}: su aula no tiene habilitado el servicio que usa ` +
                "UTN-MCP o entra por un login que todavía no sabemos usar.",
        );
    }
}

/** El aula de UTN_AULA_BASE_URL, para un campus que no está en el registro. */
function customRegional(): Regional | undefined {
    const raw = process.env.UTN_AULA_BASE_URL?.trim();
    if (!raw) return undefined;
    const baseUrl = raw.replace(/\/+$/, "");
    const host = new URL(baseUrl).host;
    const ssoHost = process.env.UTN_SSO_HOST?.trim();
    const sso: Sso | undefined = !ssoHost
        ? undefined
        : ssoHost === MICROSOFT_SSO.host
          ? MICROSOFT_SSO
          : ssoHost === UNC_SSO.host
            ? UNC_SSO
            : { provider: "keycloak", host: ssoHost };
    return { id: host, name: host, baseUrl, sso, support: "verified" };
}

/**
 * Las que se pueden elegir al iniciar sesión: el catálogo y, si está definida, la de UTN_AULA_BASE_URL.
 * `verifiedIds` son las `candidate` que ya se verificaron en el servidor (las guarda el store).
 */
export function availableRegionals(verifiedIds: Iterable<string> = []): Regional[] {
    const verified = new Set(verifiedIds);
    const custom = customRegional();
    return [...REGIONALS, ...(custom ? [custom] : [])].map((r) =>
        r.support === "candidate" && verified.has(r.id) ? { ...r, support: "verified" } : r,
    );
}

/** La regional con ese id; si no está entre las disponibles, `UnknownRegionalError`. */
export function findRegional(id: string): Regional {
    const wanted = id.trim().toLowerCase();
    const found = availableRegionals().find((r) => r.id === wanted);
    if (!found) throw new UnknownRegionalError(id);
    return found;
}

/**
 * La que viene elegida si nadie dice otra: la de UTN_REGIONAL; si no, la de UTN_AULA_BASE_URL; si no,
 * FCEFyN. Es la de quien usa UTN_USER/UTN_PASS sin `utn-mcp login`, y la opción por defecto al elegir.
 */
export function defaultRegional(): Regional {
    const fromEnv = process.env.UTN_REGIONAL?.trim();
    if (fromEnv) return findRegional(fromEnv);
    return customRegional() ?? findRegional(DEFAULT_REGIONAL);
}
