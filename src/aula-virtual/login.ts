import { ask, askChoice, askHidden } from "../shared/input.js";
import { logger } from "../shared/logger.js";
import { SqliteStore } from "../shared/store/sqlite-store.js";
import { saveCredentials, type Credentials } from "./client/credentials.js";
import { linkAulaAccount } from "./client/link.js";
import { LocalSession } from "./client/local-session.js";
import { availableRegionals, defaultRegional, UNIVERSITY_NAME, universityOf, type Regional } from "./client/regionals.js";

/**
 * `utn-mcp login`: pide la regional, usuario y contraseña una vez, los guarda en el keychain
 * y obtiene el primer token. Después el servidor renueva solo.
 * Con `--http` guarda la sesión en el store y emite el token para el cliente MCP.
 */
export async function runLogin(http: boolean): Promise<void> {
    const regional = await askRegional();
    const username = (await ask(usernamePrompt(regional))).trim();
    if (!username) throw new Error("Falta el usuario.");
    const password = await askHidden("Contraseña: ");
    const credentials: Credentials = { username, password, regional: regional.id };

    let accessToken: string | null = null;
    if (http) accessToken = await loginToStore(regional, credentials);
    else await new LocalSession().login(regional, credentials);

    // Se guardan recién después de comprobar que el aula las aceptó.
    if (await saveCredentials(credentials)) {
        logger.info("Credenciales guardadas en el keychain del sistema.");
    } else {
        logger.warn("No hay keychain disponible: para renovar sin intervención definí UTN_USER, UTN_PASS y UTN_REGIONAL.");
    }

    if (accessToken) {
        logger.info(
            "Listo. Configurá tu cliente MCP con este header; no se vuelve a mostrar:\n\n" +
                `    Authorization: Bearer ${accessToken}\n`,
        );
    } else {
        logger.info("Listo: ya podés usar el servidor MCP.");
    }
}

const SUPPORT_LABEL: Record<Regional["support"], string> = {
    verified: "",
    candidate: " · sin probar todavía",
    unsupported: " · todavía sin soporte",
};

/**
 * Pide el usuario según cómo entra: por el SSO (si sabemos cuál pedir) o, si no tiene uno de los
 * que conocemos, según la universidad. Evita un ternario de tres ramas que sería ilegible.
 */
function usernamePrompt(regional: Regional): string {
    if (regional.sso?.provider === "microsoft") return "Mail de Office 365: ";
    if (regional.sso?.provider === "cas") return "Mail institucional de la UNC (@mi.unc.edu.ar): ";
    return universityOf(regional) === "unc" ? "Usuario de la UNC: " : "Usuario de la UTN: ";
}

/**
 * `askChoice` muestra una lista plana sin encabezados de grupo, así que el agrupe por universidad
 * sale de ordenar por ella (UNC primero) y prefijar cada opción con su nombre.
 */
function groupedByUniversity(regionals: Regional[]): Regional[] {
    const rank = (r: Regional) => (universityOf(r) === "unc" ? 0 : 1);
    return [...regionals].sort((a, b) => rank(a) - rank(b));
}

/** Arranca marcada la de UTN_REGIONAL (o FCEFyN). */
async function askRegional(): Promise<Regional> {
    const regionals = groupedByUniversity(availableRegionals());
    const initial = regionals.findIndex((r) => r.id === defaultRegional().id);
    const labels = regionals.map((r) => `${UNIVERSITY_NAME[universityOf(r)]} · ${r.name}${SUPPORT_LABEL[r.support]}`);
    return regionals[await askChoice("Aula:", labels, Math.max(initial, 0))];
}

/** Crea el usuario si no existe, guarda su sesión del aula y le emite un token que no vence. */
async function loginToStore(regional: Regional, credentials: Credentials): Promise<string> {
    const store = await SqliteStore.open();
    const { userId } = await linkAulaAccount(store, regional, credentials);
    return store.issueToken(userId, { kind: "access", clientId: "local" });
}
