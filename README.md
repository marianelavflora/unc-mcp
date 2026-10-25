# UNC-MCP — El aula virtual de la UNC, conectada a tu agente.

> 🙌 **Créditos:** este proyecto es un fork de **[utn-mcp](https://github.com/nialvape/utn-mcp)**, creado por **[Joaquín Peñalva](https://github.com/nialvape)**. La idea, el diseño y casi todo el código son suyos: la navegación del aula, la lectura de archivos, los foros, las entregas y el modo HTTP. Este fork solo le suma el login de la UNC y el catálogo de sus facultades. Si te sirve, andá a dejarle una ⭐ al [repo original](https://github.com/nialvape/utn-mcp).

Es un Model Context Protocol server **NO OFICIAL**. Con él podés pedirle a tu agente de preferencia (Claude, ChatGPT, etc.) que busque información y lea los apuntes del aula virtual y, con tu confirmación, que publique en los foros o entregue tareas. Corre en tu computadora o como servidor HTTP con OAuth, para usarlo desde cualquier lado. Las regionales de la UTN del proyecto original siguen estando: las dos universidades conviven en el mismo servidor y en las mismas tools.

**👉 ¿Querés instalarlo? Seguí la [guía paso a paso](INSTALAR.md).** No hace falta saber programar.

> 🛠️ **Soporte para la UNC:** las facultades de la Universidad Nacional de Córdoba las mantenemos nosotras/os en este fork, no el proyecto original. Si algo de la UNC no anda, abrí un [issue acá](https://github.com/marianelavflora/unc-mcp/issues), no en el repo original. Si sos de la UTN, usá directamente [utn-mcp](https://github.com/nialvape/utn-mcp).

## Qué podés pedirle
- *"¿Cuándo es el recuperatorio del primer parcial de Álgebra?"*
- *"¿Qué avisó la profesora de Física esta semana?"*
- *"Resumime la guía de la unidad 3 de Sistemas Operativos."*
- *"Pasame el link para bajar el apunte de calorimetría."*
- *"¿Qué nota me pusieron en el TP1 y qué me corrigieron?"*
- *"Preguntá en el foro de consultas si el parcial incluye la unidad 4."*
- *"Anotame en el grupo 6."*
- *"Agendame el recuperatorio del 14 a las 18."*

El agente recorre el aula como lo harías vos: entra al curso, mira los foros y abre los archivos que hagan falta.

## Tools
| Tool | Qué hace |
|---|---|
| `aula_list_courses` | Lista tus cursos. Es el punto de partida. |
| `aula_open` | Entra a un curso, un módulo, un foro o una discusión. Cada respuesta trae las direcciones de lo que hay adentro y de un nivel más arriba, así el agente navega sin perderse. |
| `aula_read_file` | Lee un archivo del aula, por partes cuando es largo. |
| `aula_get_site_info` | Datos de tu usuario y de tu regional en el aula virtual. |
| `aula_forum_post` | Abre un hilo en un foro o responde en una discusión. |
| `aula_forum_edit_post` | Edita una publicación tuya. |
| `aula_forum_delete_post` | Borra una publicación tuya. |
| `aula_assign_submit` | Entrega una tarea: sube archivos de tu compu, escribe el texto en línea y confirma el envío. |
| `aula_assign_upload_link` | Solo en modo HTTP: un link para subir los archivos de una entrega, que usa el agente con `curl` o vos desde el navegador. |
| `aula_choice_answer` | Responde una elección o te anota en un grupo. |
| `aula_send_message` | Manda un mensaje privado a un docente o compañero. |
| `aula_calendar_add_event` | Agrega un recordatorio a tu calendario del aula. |

Al abrir una tarea, `aula_open` muestra si la entregaste, cuándo vence y la devolución con la nota. Las tools que escriben le piden al agente que te muestre lo que va a hacer y espere tu confirmación.

### Archivos que puede leer
- **PDF**: el texto, página por página. Los **escaneados** se mandan como imagen de cada página, y el agente los lee igual.
- **Word (.docx), PowerPoint (.pptx) y Excel (.xlsx)**: el texto, con las tablas fila por fila.
- **Imágenes** (PNG, JPG, GIF) y texto plano.

Los formatos viejos de Office (.doc, .ppt, .pps), los comprimidos (.zip, .rar) y los videos no se leen. En ese caso el agente te pasa el link para que lo bajes.

### Links de descarga
Cada archivo viene con un link del aula virtual que podés abrir en tu navegador. Funciona con tu sesión del aula (si no estás logueado te manda al login) y **nunca incluye tu token**: ese queda siempre en tu computadora.

## Cómo instalar
Necesitás [Node.js](https://nodejs.org) 20 o superior.

### Si sos de la UNC: instalalo desde este fork
**¿Primera vez con la terminal? Seguí la [guía paso a paso](INSTALAR.md).** Abajo está la versión corta.

El soporte para la UNC todavía no está publicado en npm: `npx -y utn-mcp` baja el `utn-mcp` original, que no tiene las facultades de la UNC. Este fork se instala directo desde GitHub con `npx` (la primera vez tarda un minuto porque lo compila; además necesitás tener [Git](https://git-scm.com) instalado).

> ⏳ **Instalar desde GitHub es temporal.** Es la forma de usarlo mientras el soporte para la UNC no esté publicado como paquete. Cuando lo esté, el comando va a cambiar y lo vamos a avisar acá.

```bash
npx -y github:marianelavflora/unc-mcp login
```
Te muestra la lista: elegí tu facultad (`unc-*`) y entrá con tu mail `@mi.unc.edu.ar` y la contraseña de siempre. Funciona solo si tenés cuenta en el aula virtual de esa facultad.

Después agregalo a tu cliente:

**Claude Code**
```bash
claude mcp add unc -- npx -y github:marianelavflora/unc-mcp
```

**Claude Desktop**: en *Settings → Developer → Edit Config*, agregá dentro de `mcpServers` y reiniciá Claude Desktop por completo:
```json
"unc": {
  "command": "npx",
  "args": ["-y", "github:marianelavflora/unc-mcp"]
}
```
En Windows, si no arranca, usá `"command": "cmd"` y `"args": ["/c", "npx", "-y", "github:marianelavflora/unc-mcp"]`.

En cualquier otro cliente de los de abajo es lo mismo: donde dice `utn-mcp`, poné `github:marianelavflora/unc-mcp`.

Si preferís tenerlo clonado (para desarrollar, o para elegir cuándo actualizar): `git clone https://github.com/marianelavflora/unc-mcp.git`, `npm install` adentro (compila solo) y en el cliente usás `node /ruta/completa/a/unc-mcp/build/index.js`. Para actualizarlo, `git pull` y `npm install`.

Ojo: este fork guarda la sesión en el mismo lugar que el `utn-mcp` original (`%APPDATA%\utn-mcp`, `~/.config/utn-mcp` y el gestor de credenciales). Si usás los dos, el último `login` pisa al otro.

### Si sos de la UTN
No hace falta clonar el repo ni instalar nada a mano: `npx` descarga el paquete solo.

### 1. Iniciar sesión
```bash
npx -y utn-mcp login
```
Te pide tu regional, tu usuario y tu contraseña: los mismos con los que entrás al aula virtual. Si no tenés usuario institucional (por ejemplo, en el curso de ingreso), usá el que te dieron para el aula. En Córdoba (FRC) los alumnos entran con el mail completo (`<legajo>@<especialidad>.frc.utn.edu.ar`), no con el legajo solo; con una cuenta `@frc.utn.edu.ar`, con lo que va antes de la `@`. En Haedo (FRH) y San Nicolás (FRSN) se entra con el mail completo de Office 365 (en FRH, del estilo `<inicial><apellido><3 dígitos del legajo>@alumnos.frh.utn.edu.ar`). Se hace una sola vez: después el servidor renueva la sesión solo.

### 2. Agregarlo a tu cliente

**Claude Code**
```bash
claude mcp add utn -- npx -y utn-mcp
```

**Claude Desktop**: en *Settings → Developer → Edit Config*, agregá dentro de `mcpServers`:
```json
"utn": {
  "command": "npx",
  "args": ["-y", "utn-mcp"]
}
```
En Windows, si no arranca, usá `"command": "cmd"` y `"args": ["/c", "npx", "-y", "utn-mcp"]`. Después reiniciá Claude Desktop por completo.

**Codex**
```bash
codex mcp add utn -- npx -y utn-mcp
```

**Gemini CLI**
```bash
gemini mcp add utn npx -y utn-mcp
```

**OpenClaw**
```bash
openclaw mcp add utn --command npx --arg -y --arg utn-mcp
```

**Hermes**: en `~/.hermes/config.yaml`:
```yaml
mcp_servers:
  utn:
    command: "npx"
    args: ["-y", "utn-mcp"]
```

**Cursor**: en `~/.cursor/mcp.json`:
```json
{
  "mcpServers": {
    "utn": { "command": "npx", "args": ["-y", "utn-mcp"] }
  }
}
```

**VS Code**: en `.vscode/mcp.json` (o con *MCP: Add Server* desde la paleta de comandos):
```json
{
  "servers": {
    "utn": { "type": "stdio", "command": "npx", "args": ["-y", "utn-mcp"] }
  }
}
```

**ChatGPT**: solo se conecta a servidores MCP remotos por HTTPS, así que necesita un servidor en modo HTTP publicado en internet (ver [Hostearlo para otros](#hostearlo-para-otros)). Se agrega como conector desde *Configuración → Apps y conectores*, con el modo desarrollador activado. Los conectores propios están desde el plan Pro, y ahí solo con las herramientas de lectura; para usar también las de escritura (foros, mensajes, entregas) hace falta Business o superior.

**Otros clientes (Windsurf, opencode, etc.)**: cualquier cliente MCP que lance servidores por STDIO sirve con el comando `npx -y utn-mcp`.

### Instalación global (opcional)
Si preferís tener el comando `utn-mcp` siempre disponible:
```bash
npm i -g utn-mcp
utn-mcp login
```
y en la config del cliente usás `"command": "utn-mcp"` sin argumentos.

### Regionales
La regional se elige al iniciar sesión, de una lista con las regionales de la UTN. Buenos Aires (FRBA), Córdoba (FRC), Resistencia (FRRE) y Tucumán (FRT) ya están probadas. También está el aula de la Tecnicatura en Programación a distancia del SIED (TUP). El login se adapta solo: si el aula entra por SSO, sea un Keycloak propio (FRBA), Office 365 (Haedo, FRH, y San Nicolás, FRSN) o el SAML2 central de la UNC (`autenticar.unc.edu.ar`, provider `cas` — recién agregado, todavía en verificación), usa el SSO; si no, el login directo de Moodle. Con Office 365 todavía no se pueden completar cuentas que piden segundo factor (MFA).

La lista puede traer regionales que nadie probó todavía: su aula tiene habilitado el servicio que usa UTN-MCP, así que casi seguro anda. En un servidor hosteado, la primera persona que entra con una de esas la deja verificada para el resto. Las que no tienen el servicio habilitado aparecen como "todavía sin soporte": se pueden elegir, pero el login avisa que por ahora no se puede usar y no manda la contraseña.

Si tu campus no está en la lista, abrí un [issue](https://github.com/nialvape/utn-mcp/issues) con la URL de su aula virtual para sumarlo. Mientras tanto, podés usarlo definiendo en un `.env` en la carpeta desde donde corrés `utn-mcp` (o en el entorno):
```bash
UTN_AULA_BASE_URL=https://tu-campus.utn.edu.ar
# UTN_SSO_HOST=auth.tu-campus.utn.edu.ar  # solo si entra por SSO: Keycloak, o login.microsoftonline.com si es Office 365
```
Aparece como una opción más al iniciar sesión.

`UTN_REGIONAL` (por ejemplo, `UTN_REGIONAL=frt`) elige la que viene marcada por defecto, y es la que se usa si en lugar de `login` definís `UTN_USER` y `UTN_PASS`.

### Facultades de la UNC
Al lado del catálogo de regionales de la UTN, el selector de `login` agrupa también las facultades de la Universidad Nacional de Córdoba (UNC), con ids `unc-*`. Casi todas comparten el mismo SSO: un IdP SAML2 central en `autenticar.unc.edu.ar` (detrás del SAML2 valida usuario y contraseña un Apereo CAS), así que un solo provider (`cas`) cubre la mayoría de las facultades.

| id | Nombre | Base URL | SSO | Soporte |
|---|---|---|---|---|
| unc-fcefyn | Ciencias Exactas, Físicas y Naturales (FCEFyN) | https://fcefyn.aulavirtual.unc.edu.ar | cas (autenticar.unc.edu.ar) | verified |
| unc-famaf | Matemática, Astronomía, Física y Computación (FAMAF) | https://famaf.aulavirtual.unc.edu.ar | - | candidate |
| unc-psicologia | Psicología (FP) | https://psicologia.aulavirtual.unc.edu.ar | - | candidate |
| unc-derecho | Derecho (FD) | https://derecho.aulavirtual.unc.edu.ar | cas (autenticar.unc.edu.ar) | candidate |
| unc-medicina | Ciencias Médicas (FCM) | https://fcm.aulavirtual.unc.edu.ar | cas (autenticar.unc.edu.ar) | candidate |
| unc-odontologia | Odontología (FO) | https://odontologia.aulavirtual.unc.edu.ar | cas (autenticar.unc.edu.ar) | candidate |
| unc-economicas | Ciencias Económicas (FCE) | https://eco.aulavirtual.unc.edu.ar | cas (autenticar.unc.edu.ar) | candidate |
| unc-humanidades | Filosofía y Humanidades (FFyH) | https://ffyh.aulavirtual.unc.edu.ar | cas (autenticar.unc.edu.ar) | candidate |
| unc-arquitectura | Arquitectura, Urbanismo y Diseño (FAUD) | https://faud.aulavirtual.unc.edu.ar | cas (autenticar.unc.edu.ar) | candidate |
| unc-lenguas | Lenguas (FL) | https://lenguas.aulavirtual.unc.edu.ar | cas (autenticar.unc.edu.ar) | candidate |
| unc-agropecuarias | Ciencias Agropecuarias (FCA) | https://fca.aulavirtual.unc.edu.ar | cas (autenticar.unc.edu.ar) | candidate |
| unc-quimica | Ciencias Químicas (FCQ) | https://distancia.fcq.unc.edu.ar | - | candidate |
| unc-artes | Artes (FA) | https://artes.aulavirtual.unc.edu.ar | cas (autenticar.unc.edu.ar) | candidate |
| unc-sociales | Ciencias Sociales (FCS) | https://sociales.aulavirtual.unc.edu.ar | cas (autenticar.unc.edu.ar) | candidate |
| unc-comunicacion | Ciencias de la Comunicación (FCC) | https://fcc.aulavirtual.unc.edu.ar | cas (autenticar.unc.edu.ar) | candidate |
| unc-monserrat | Colegio Nacional de Monserrat (CNM) | https://monserrat.aulavirtual.unc.edu.ar | cas (autenticar.unc.edu.ar) | candidate |

FCEFyN está `verified`: con una cuenta real se recorrió el circuito entero desde el MCP (`login` → CAS en dos pasos → SAML2 → token de Moodle) y después se usaron las tools contra el aula (Moodle 4.5.8+): cursos, secciones y módulos, un foro con sus discusiones y la lectura de archivos, tanto HTML como un PDF de cientos de páginas. Las demás comparten el mismo IdP, así que se espera el mismo resultado, pero nadie entró todavía.

FAMAF, Psicología y Ciencias Químicas no fuerzan el login por SSO (quedan sin SSO en el catálogo), así que entrarían por el login directo de Moodle que el MCP ya tiene. No está confirmado si sus cuentas tienen auth nativo de Moodle o si, como pasó en FCEFyN, el login directo también está bloqueado y son SAML por detrás igual.

Al correr `utn-mcp login`, la lista para elegir agrupa primero las regionales de la UTN y después las facultades de la UNC. Si tu facultad de la UNC no está en el catálogo, se usa el mismo mecanismo que para un campus de la UTN fuera de la lista:
```bash
UTN_AULA_BASE_URL=https://tu-facultad.aulavirtual.unc.edu.ar
UTN_SSO_HOST=autenticar.unc.edu.ar
```
Aparece como una opción más al iniciar sesión.

### Modo HTTP (opcional)
Necesita Node 22.13 o más nuevo. Primero, una vez:
```bash
npx -y utn-mcp login --http
```
Te muestra un token: configurá tu cliente MCP para que mande el header `Authorization: Bearer <token>`. Después:
```bash
npx -y utn-mcp --http --port 3000
```
Levanta el servidor en `http://127.0.0.1:3000/mcp`, solo accesible desde tu propia máquina. Tenés que dejar la terminal abierta mientras lo uses.

En este modo el servidor no lee archivos de tu disco: para entregar, el agente pide un link con `aula_assign_upload_link` y sube ahí los archivos con `curl` si tiene terminal, o te pasa el link para que los elijas desde el navegador.

### Hostearlo para otros
En modo HTTP el servidor también es servidor de autorización OAuth: un cliente MCP (Claude, ChatGPT) que se conecta a `https://tu-dominio/mcp` recibe un 401, descubre el OAuth y abre una página donde el alumno elige su regional y entra con su usuario de la UTN. Cada alumno usa el aula de su regional, aunque sean de regionales distintas. Ese login vincula su aula: la contraseña se usa una sola vez para sacar el token de Moodle y **no se guarda**. Cuando la sesión del aula vence, el agente le pasa el link de `/login` para renovarla, sin reconectar el cliente.

Quién puede entrar lo decidís vos: con `UTN_MCP_ALLOWED_EMAILS` (una lista), o con `UTN_MCP_ACCESS_URL`, que apunta a un servicio tuyo. El servidor le hace `POST` con `{ "email", "usuario", "regional" }` y el header `Authorization: Bearer <UTN_MCP_ACCESS_SECRET>`, y espera `{ "permitido": true }` o `{ "permitido": false, "motivo": "...", "url": "..." }`. Se consulta al conectar y en cada renovación del token (cada hora), así que una baja se aplica sola.

La configuración va en variables de entorno o en un `.env` en la carpeta desde donde lo corrés (copiá [`.env.example`](https://github.com/nialvape/utn-mcp/blob/main/.env.example)):

| Variable | Para qué | Por defecto |
|---|---|---|
| `HOST`, `PORT` | Dónde escucha. | `127.0.0.1`, `3000` |
| `UTN_MCP_PUBLIC_URL` | Dirección pública (`https://mcp.tu-dominio.com`). Es el issuer del OAuth, la base de los links de subida y el único host, además de localhost, que se acepta en `Host` y `Origin`. | `http://127.0.0.1:<PORT>` |
| `UTN_MCP_ACCESS_URL`, `UTN_MCP_ACCESS_SECRET` | Servicio que decide quién puede entrar. | — |
| `UTN_MCP_ALLOWED_EMAILS` | Emails o dominios (`@frba.utn.edu.ar`) habilitados, separados por coma, si no hay `UTN_MCP_ACCESS_URL`. | Entra cualquiera con usuario de la UTN |
| `UTN_MCP_REDIRECT_ALLOW` | Hosts (`app.ejemplo.com`) o esquemas (`miapp:`) extra, separados por coma, a los que puede volver el login de OAuth. Loopback, Claude, ChatGPT, VS Code y Cursor pasan siempre. Cualquier otro host HTTPS (un agente propio, por ejemplo) se acepta, pero el login avisa a dónde vuelve y el alumno tiene que marcar que lo conecta bajo su responsabilidad: es la defensa contra alguien que use tu página de login para quedarse con su sesión. Los hosts de esta lista pasan sin aviso. | — |
| `UTN_MCP_ADMIN_SECRET` | Habilita la API de `/admin` para un panel de cuentas tuyo: `POST /admin/usuarios` (todos los usuarios con sus apps), `/admin/clientes` y `/admin/clientes/revocar` (las apps de un usuario, por email), `/admin/regionales` (las regionales con su soporte) y `/admin/verificar` (entra al aula con usuario y contraseña, como el login de OAuth, y le guarda la sesión). | — |
| `UTN_MCP_LOGIN_URL` | Página donde el usuario renueva su sesión del aula; el agente se la pasa. | `<UTN_MCP_PUBLIC_URL>/login` |
| `UTN_MCP_DB`, `UTN_MCP_KEY` | Base de sesiones y su clave de cifrado (32 bytes en base64). | En la carpeta de config |

Con Docker, detrás de un reverse proxy con HTTPS en la misma máquina (red host, para que el rate limit del login vea la IP real):
```bash
docker build -t utn-mcp .
docker run -d --name utn-mcp --network host --restart unless-stopped \
  -e HOST=127.0.0.1 -e PORT=8100 -e UTN_MCP_PUBLIC_URL=https://mcp.tu-dominio.com \
  -e UTN_MCP_KEY=$(openssl rand -base64 32) -v utn-mcp-data:/data utn-mcp
```
Guardá esa `UTN_MCP_KEY`: sin ella no se pueden descifrar las sesiones guardadas.

## Dónde se guardan tus datos
Instalado en tu computadora, todo queda ahí:
- **Usuario y contraseña**: en el gestor de credenciales del sistema (Windows Credential Manager, Keychain en macOS, Secret Service en Linux).
- **Token del aula virtual**: en `%APPDATA%\utn-mcp\session.json` (Windows) o `~/.config/utn-mcp/session.json` (Linux y macOS).
- **En modo HTTP**: la contraseña no se guarda; la sesión va cifrada en `utn-mcp.db`, en la misma carpeta, con la clave de `store.key` (o la de `UTN_MCP_KEY`). Del token del cliente solo se guarda el hash.

En Linux sin gestor de credenciales (servidores, Docker, WSL) podés definir las variables de entorno `UTN_USER` y `UTN_PASS` en lugar de usar `login`.

Si usás un servidor hosteado por otra persona, tu sesión del aula la guarda ese servidor (cifrada, y sin tu contraseña): revisá su política de privacidad.

## Desarrollo
```bash
git clone https://github.com/nialvape/utn-mcp.git
cd utn-mcp
npm install
npm run login   # una vez
npm run dev     # servidor por STDIO desde src/, con tsx
npm run build   # compila a build/
```

pdf.js no es una dependencia del paquete publicado. Está como `devDependency`, y `npm install` corre el script `prepare`, que copia a `vendor/pdfjs/` solo los archivos que usa el servidor (~4 MB). Así, quien instala `utn-mcp` no baja pdf.js entero ni su canvas nativo opcional (~37 MB). Después, `prepare` también compila a `build/`: así anda la instalación directa desde GitHub (`npx github:...`), que corre `prepare` y no tiene `build/` en el repo. Si instalaste con `--ignore-scripts`, generalo a mano con `npm run prepare`.

## Aviso
Este proyecto no está afiliado ni avalado por la UTN ni por la UNC. Usalo bajo tu responsabilidad.
