# Cómo instalar UNC-MCP, paso a paso (apto para todo público)

Con esto vas a poder preguntarle a Claude cosas como *"¿qué subieron esta semana en Análisis?"* o *"resumime el apunte de la unidad 2"*, y Claude va a ir a buscarlo a tu aula virtual.

No hace falta saber programar. Son 4 pasos y tardás unos 10 minutos la primera vez. Si te trabás, al final hay una sección de [problemas comunes](#si-algo-no-anda).

---

## Antes de empezar: qué necesitás

- ✅ Una compu con **Windows** o **Mac**.
- ✅ Tu **mail de la UNC** (`algo@mi.unc.edu.ar`) y su contraseña: los mismos con los que entrás al aula virtual.
- ✅ Tener **cuenta en el aula virtual de tu facultad**. Si entrás normalmente desde el navegador, la tenés.
- ✅ **Claude Desktop** (la app de Claude para la compu) o **Claude Code**. Si no tenés ninguno, bajá Claude Desktop de [claude.ai/download](https://claude.ai/download) e iniciá sesión.

> 🔒 **Tu contraseña queda en tu compu**, guardada en el gestor de contraseñas del sistema. Nunca se la pases a nadie ni la pegues en un chat, tampoco en el de Claude.

---

## Paso 1: instalar Node.js

Node.js es el programa que hace funcionar a UNC-MCP. Se instala una sola vez.

1. Entrá a [nodejs.org](https://nodejs.org).
2. Tocá el botón grande que dice **LTS** y bajá el instalador.
3. Abrilo y apretá **Siguiente** en todo, sin cambiar nada.

## Paso 2: abrir la terminal y comprobar que está Node

La terminal es una ventana donde escribís comandos en vez de hacer clic. No se rompe nada.

- **Windows**: apretá la tecla **Windows**, escribí **`cmd`** y abrí **"Símbolo del sistema"**. (Usá ese y no PowerShell: con PowerShell a veces aparece un error de permisos.)
- **Mac**: apretá **Cmd + Espacio**, escribí **`Terminal`** y apretá Enter.

> ⚠️ Si la terminal ya estaba abierta antes de instalar Node, **cerrala y abrila de nuevo**.

Escribí esto y apretá **Enter**:

```
node -v
```

Tiene que aparecer algo como `v22.11.0`, y el primer número tiene que ser **20 o más**. Si aparece, seguí. Si dice *"no se reconoce como un comando"*, mirá [problemas comunes](#si-algo-no-anda).

## Paso 3: iniciar sesión con tu cuenta de la UNC

En la misma terminal, copiá y pegá esto (en `cmd` se pega con clic derecho) y apretá **Enter**:

```
npx -y unc-mcp login
```

Ojo: es **unc**-mcp, con C. El `utn-mcp` (con T) es el de la UTN y no tiene las facultades de la UNC.

La primera vez **tarda un ratito** porque lo descarga. Es normal: no cierres la ventana.

Después te va a aparecer esto:

1. **Una lista de facultades.** Movete con las **flechitas ↑ ↓** del teclado hasta la tuya y apretá **Enter**. Las de la UNC están arriba de todo.
2. **`Mail institucional de la UNC (@mi.unc.edu.ar):`** escribí tu mail completo y apretá **Enter**.
3. **`Contraseña:`** escribí tu contraseña y apretá **Enter**. **Mientras escribís no se ve nada**: es a propósito, para que nadie la espíe.

Si al final dice **"Listo: ya podés usar el servidor MCP"**, ¡salió! 🎉 Esto se hace una sola vez.

## Paso 4: conectarlo a Claude

Elegí el caso que te toca.

### Si usás Claude Desktop (la app)

1. Abrí Claude Desktop.
2. Andá a **Settings** (Configuración) → **Developer** (Desarrollador) → **Edit Config** (Editar configuración). Se abre una carpeta con un archivo llamado `claude_desktop_config.json`. Abrilo con el **Bloc de notas** (Windows) o con **TextEdit** (Mac).
3. Borrá todo lo que tenga y pegá esto:

   **En Windows:**
   ```json
   {
     "mcpServers": {
       "unc": {
         "command": "cmd",
         "args": ["/c", "npx", "-y", "unc-mcp"]
       }
     }
   }
   ```

   **En Mac:**
   ```json
   {
     "mcpServers": {
       "unc": {
         "command": "npx",
         "args": ["-y", "unc-mcp"]
       }
     }
   }
   ```

   > Si el archivo ya tenía cosas adentro (otros servidores en `mcpServers`), no lo borres entero: agregá solo el bloque `"unc": { ... }` dentro de `mcpServers`, con una coma separándolo de lo anterior.

4. Guardá el archivo.
5. **Cerrá Claude Desktop del todo** (no alcanza con la X):
   - **Windows**: buscá el iconito de Claude abajo a la derecha, al lado del reloj, clic derecho → **Salir**.
   - **Mac**: con Claude abierto, apretá **Cmd + Q**.
6. Abrí Claude Desktop de nuevo.

### Si usás Claude Code

En la terminal, pegá esto y apretá **Enter**:

```
claude mcp add unc -- npx -y unc-mcp
```

---

## ¡A probarlo!

Abrí un chat nuevo en Claude y preguntale:

> **¿Qué materias tengo en el aula virtual?**

Si te lista tus materias, ya está todo andando. Algunas ideas para seguir:

- *"¿Qué avisaron en el foro de novedades de Física esta semana?"*
- *"Resumime el PDF de la unidad 3 de Álgebra."*
- *"¿Cuándo vence el TP2 y ya lo entregué?"*

Cuando le pidas algo que **escribe** en el aula (publicar en un foro, entregar una tarea, mandar un mensaje), Claude te va a mostrar lo que va a hacer y esperar que le digas que sí.

---

## Si algo no anda

**"`node` no se reconoce como un comando interno o externo"**
Falta instalar ese programa, o la terminal se abrió antes de instalarlo. Cerrá la terminal, abrila de nuevo y probá otra vez. Si sigue, repetí el Paso 1.

**"La ejecución de scripts está deshabilitada en este sistema"**
Estás en PowerShell. Cerralo y usá **Símbolo del sistema** (`cmd`), como dice el Paso 2.

**"Flujo de login inesperado" o "no tiene una cuenta en Moodle"**
Tu usuario de la UNC está bien, pero **no tenés cuenta en el aula de la facultad que elegiste**. Cada facultad deja entrar solo a sus alumnos y docentes. Revisá haber elegido tu facultad en la lista.

**"El aula rechazó usuario o contraseña"**
Revisá que el mail sea el completo (`@mi.unc.edu.ar`) y que la contraseña sea la misma que usás en el aula. Volvé a hacer el Paso 3.

**"Hace falta iniciar sesión"** (te lo dice Claude)
La sesión venció. Volvé a hacer el Paso 3 y listo.

**Claude no muestra nada del aula**
- Fijate que hayas cerrado Claude Desktop **del todo** (Paso 4, punto 5) y vuelto a abrir.
- Revisá que el archivo de configuración haya quedado igual al del ejemplo: cualquier coma o comilla de más lo rompe.

**Tengo instalado también el `utn-mcp` original (el de la UTN)**
Los dos guardan la sesión en el mismo lugar, así que el último `login` que hagas pisa al otro. Usá uno solo.

**Nada de esto me sirvió**
Abrí un [issue](https://github.com/marianelavflora/unc-mcp/issues) contando qué hiciste y qué error te apareció (**sin poner tu contraseña**).

---

## ¿Funciona en mi facultad?

| Facultad | Estado |
|---|---|
| Ciencias Exactas, Físicas y Naturales (FCEFyN) | ✅ Probada y andando |
| Derecho, Ciencias Médicas, Odontología, Ciencias Económicas, Filosofía y Humanidades, Arquitectura (FAUD), Lenguas, Ciencias Agropecuarias, Artes, Ciencias Sociales, Ciencias de la Comunicación, Colegio Monserrat | 🟡 Todavía sin probar, pero entran con el mismo login de la UNC, así que muy probablemente anden |
| FAMAF, Psicología, Ciencias Químicas | 🔴 Probablemente no anden todavía: usan otro tipo de login |

**Si sos de una facultad 🟡 y te anduvo (o no), contanos en un [issue](https://github.com/marianelavflora/unc-mcp/issues).** Así la marcamos como probada para el resto.
