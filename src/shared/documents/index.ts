import { htmlToText } from "../html.js";
import { detectOfficeFormat, openOffice } from "./office.js";
import { openPdf } from "./pdf.js";

/**
 * Lectura de archivos para el modelo: un documento se parte en unidades (páginas, diapositivas,
 * fragmentos) que se piden de a una, así quien lee decide cuánto entra en una respuesta.
 */

export type Part =
    | { title?: string; text: string }
    | { title?: string; image: Uint8Array; mimeType: string };

export interface ParsedDocument {
    format: string;
    /** Cómo se llama cada parte: "página", "diapositiva", "fragmento"... */
    unit: string;
    total: number;
    /** Numerada desde 1. */
    part(n: number): Promise<Part>;
    close(): Promise<void>;
}

export class UnsupportedFormat extends Error {
    constructor(readonly format: string) {
        super(`No sé leer archivos ${format}.`);
        this.name = "UnsupportedFormat";
    }
}

/** Tamaño de cada fragmento cuando un texto largo viene de una sola pieza (un docx, un html). */
export const CHUNK_SIZE = 15_000;

const IMAGE_SIGNATURES: [number[], string][] = [
    [[0x89, 0x50, 0x4e, 0x47], "image/png"],
    [[0xff, 0xd8, 0xff], "image/jpeg"],
    [[0x47, 0x49, 0x46, 0x38], "image/gif"],
];

const hasSignature = (bytes: Uint8Array, signature: number[]) => signature.every((b, i) => bytes[i] === b);

/** Reconoce el formato por los primeros bytes; el nombre solo se usa para los de texto plano. */
export async function openDocument(bytes: Uint8Array, name: string): Promise<ParsedDocument> {
    if (hasSignature(bytes, [0x25, 0x50, 0x44, 0x46])) return openPdf(bytes);

    for (const [signature, mimeType] of IMAGE_SIGNATURES) {
        if (hasSignature(bytes, signature)) return inMemory("imagen", "imagen", [{ image: bytes, mimeType }]);
    }

    if (hasSignature(bytes, [0x50, 0x4b, 0x03, 0x04])) {
        const format = detectOfficeFormat(bytes);
        if (!format) throw new UnsupportedFormat("comprimidos (.zip)");
        return openOffice(bytes, format);
    }

    if (hasSignature(bytes, [0xd0, 0xcf, 0x11, 0xe0])) {
        throw new UnsupportedFormat("de Office viejo (.doc, .xls, .ppt, .pps)");
    }

    const extension = name.toLowerCase().match(/\.(\w+)$/)?.[1] ?? "";

    // Texto con marcado propio: decodifica como UTF-8 igual, pero mostrarlo tal cual es
    // puro ruido de sintaxis. Necesita su propio parser, no alcanza con sumarlo abajo.
    if (extension === "rtf") throw new UnsupportedFormat(`.${extension}`);

    try {
        // Cualquier otra extensión vale si el contenido decodifica limpio como UTF-8: así se leen
        // no solo .txt/.csv/.md, sino código fuente de cátedra (.cpp, .c, .py, .asm, .hex, .hs...)
        // que Moodle también sirve como mimetype text/plain. Si no decodifica, es binario de verdad.
        const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
        const plain = extension.startsWith("htm") ? htmlToText(text) : text;
        return inMemory(extension || "txt", "fragmento", splitText(plain).map((t) => ({ text: t })));
    } catch {
        throw new UnsupportedFormat(extension ? `.${extension}` : "de este tipo");
    }
}

/** Un documento que ya está entero en memoria. */
export function inMemory(format: string, unit: string, parts: Part[]): ParsedDocument {
    return {
        format,
        unit,
        total: parts.length,
        part: async (n) => parts[n - 1],
        close: async () => {},
    };
}

/** Corta un texto largo en pedazos de hasta `max` caracteres, prefiriendo cortar en un salto de línea. */
export function splitText(text: string, max = CHUNK_SIZE): string[] {
    const chunks: string[] = [];
    let rest = text.trim();
    while (rest.length > max) {
        const cut = rest.lastIndexOf("\n", max);
        const end = cut > max / 2 ? cut : max;
        chunks.push(rest.slice(0, end).trim());
        rest = rest.slice(end).trim();
    }
    if (rest || chunks.length === 0) chunks.push(rest);
    return chunks;
}
