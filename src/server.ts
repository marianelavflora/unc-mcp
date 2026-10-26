import { McpServer } from "@modelcontextprotocol/server";
import type { AulaSession } from "./aula-virtual/client/session.js";
import { registerAulaVirtualTools } from "./aula-virtual/tools.js";
import type { FileSource } from "./shared/uploads.js";

/**
 * Un servidor MCP para un usuario. Las entradas STDIO y HTTP lo crean por conexión o por request.
 * `files`: de dónde salen los archivos que el usuario sube a una plataforma.
 */
export function createServer(aula: AulaSession, files: FileSource): McpServer {
    const server = new McpServer({
        name: "UNC-MCP",
        version: "0.9.0",
    });

    registerAulaVirtualTools(server, aula, files);

    return server;
}
