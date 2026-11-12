import { inMemory, splitText, type ParsedDocument } from "./index.js";
import { listZip, readEntry } from "./zip.js";

/**
 * docx, pptx, xlsx, odt, odp y ods son zips de XML. Sacar el texto es leer unos pocos XML; no
 * hace falta una librería de Office para eso.
 */

export type OfficeFormat = "docx" | "pptx" | "xlsx" | "odt" | "odp" | "ods";

/** Tope por entrada descomprimida: un XML de texto de más que esto es un zip malicioso o no es un documento. */
const MAX_ENTRY_BYTES = 50 * 1024 * 1024;

const OOXML_MARKERS: Record<"docx" | "pptx" | "xlsx", string> = {
    docx: "word/document.xml",
    pptx: "ppt/presentation.xml",
    xlsx: "xl/workbook.xml",
};

/** El "mimetype" de un ODF (LibreOffice/OpenOffice) es una entrada fija del zip, sin comprimir. */
const ODF_MIMETYPES: Record<string, "odt" | "odp" | "ods"> = {
    "application/vnd.oasis.opendocument.text": "odt",
    "application/vnd.oasis.opendocument.presentation": "odp",
    "application/vnd.oasis.opendocument.spreadsheet": "ods",
};

/** XML de las entradas del zip que hacen falta, por ruta. */
type Xmls = Record<string, string>;

/** Mira la lista de entradas del zip; para ODF hace falta además leer la entrada "mimetype". */
export function detectOfficeFormat(bytes: Uint8Array): OfficeFormat | null {
    const entries = listZip(bytes);
    const names = new Set(entries.map((e) => e.name));

    const ooxml = (Object.keys(OOXML_MARKERS) as (keyof typeof OOXML_MARKERS)[]).find((f) => names.has(OOXML_MARKERS[f]));
    if (ooxml) return ooxml;

    const mimetypeEntry = entries.find((e) => e.name === "mimetype");
    if (!mimetypeEntry) return null;
    const mimetype = new TextDecoder().decode(readEntry(bytes, mimetypeEntry, MAX_ENTRY_BYTES)).trim();
    return ODF_MIMETYPES[mimetype] ?? null;
}

export function openOffice(bytes: Uint8Array, format: OfficeFormat): ParsedDocument {
    const decoder = new TextDecoder();
    const zip: Xmls = Object.fromEntries(
        listZip(bytes)
            .filter((e) => isNeeded(format, e.name))
            .map((e) => [e.name, decoder.decode(readEntry(bytes, e, MAX_ENTRY_BYTES))]),
    );

    switch (format) {
        case "docx":
            return inMemory("docx", "fragmento", splitText(xmlText(read(zip, "word/document.xml"), "w")).map((text) => ({ text })));

        case "pptx":
            return inMemory(
                "pptx",
                "diapositiva",
                Object.keys(zip)
                    .filter((p) => /^ppt\/slides\/slide\d+\.xml$/.test(p))
                    .sort((a, b) => slideNumber(a) - slideNumber(b))
                    .map((p) => ({ text: xmlText(read(zip, p), "a") || "(diapositiva sin texto)" })),
            );

        case "xlsx":
            return inMemory(
                "xlsx",
                "fragmento",
                sheets(zip).flatMap(({ name, text }) => {
                    const chunks = splitText(text);
                    return chunks.map((t, i) => ({
                        title: chunks.length > 1 ? `hoja "${name}" (${i + 1}/${chunks.length})` : `hoja "${name}"`,
                        text: t,
                    }));
                }),
            );

        case "odt":
            return inMemory("odt", "fragmento", splitText(odfParagraphs(read(zip, "content.xml")).join("\n")).map((text) => ({ text })));

        case "odp":
            return inMemory(
                "odp",
                "diapositiva",
                [...read(zip, "content.xml").matchAll(/<draw:page\b[^>]*>([\s\S]*?)<\/draw:page>/g)].map(([, body]) => ({
                    text: odfParagraphs(body).join("\n") || "(diapositiva sin texto)",
                })),
            );

        case "ods":
            return inMemory(
                "ods",
                "fragmento",
                odsSheets(read(zip, "content.xml")).flatMap(({ name, text }) => {
                    const chunks = splitText(text);
                    return chunks.map((t, i) => ({
                        title: chunks.length > 1 ? `hoja "${name}" (${i + 1}/${chunks.length})` : `hoja "${name}"`,
                        text: t,
                    }));
                }),
            );
    }
}

function isNeeded(format: OfficeFormat, name: string): boolean {
    switch (format) {
        case "docx":
            return name === "word/document.xml";
        case "pptx":
            return /^ppt\/slides\/slide\d+\.xml$/.test(name);
        case "xlsx":
            return name === "xl/workbook.xml" || name === "xl/sharedStrings.xml" ||
                name === "xl/_rels/workbook.xml.rels" || name.startsWith("xl/worksheets/");
        case "odt":
        case "odp":
        case "ods":
            return name === "content.xml";
    }
}

const read = (zip: Xmls, path: string) => zip[path] ?? "";
const slideNumber = (path: string) => Number(path.match(/(\d+)\.xml$/)?.[1]);

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
const decodeEntities = (s: string) =>
    s.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (m, e: string) =>
        e[0] !== "#" ? (ENTITIES[e] ?? m) : String.fromCodePoint(e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : Number(e.slice(1))),
    );

/**
 * Texto de un XML de Word (`w`) o PowerPoint (`a`), recorriendo los tags en orden: texto de los nodos
 * de texto, salto de línea al cerrar un párrafo, y las tablas como filas con celdas separadas por " | ".
 */
function xmlText(xml: string, ns: "w" | "a"): string {
    let out = "";
    let inText = false;
    let cellDepth = 0;
    for (const [, closing, tag, , selfClosing, chars] of xml.matchAll(/<(\/?)([\w:]+)((?:[^>"]|"[^"]*")*?)(\/?)>|([^<]+)/g)) {
        if (chars !== undefined) {
            if (inText) out += decodeEntities(chars);
        } else if (tag === `${ns}:t`) {
            inText = !closing && !selfClosing;
        } else if (tag === `${ns}:tc` && !selfClosing) {
            cellDepth += closing ? -1 : 1;
            if (closing) out += " | ";
        } else if (tag === `${ns}:tr` && closing) {
            out += "\n";
        } else if (tag === `${ns}:p` && closing) {
            out += cellDepth ? " " : "\n";
        } else if (tag === `${ns}:tab`) {
            out += " ";
        } else if (tag === `${ns}:br`) {
            out += cellDepth ? " " : "\n";
        }
    }
    return out
        .split("\n")
        .map((l) => l.replace(/\s+/g, " ").replace(/\s*\|\s*$/, "").trim())
        .filter((l, i, all) => l !== "|" && (l !== "" || all[i - 1] !== ""))
        .join("\n")
        .trim();
}

/** Cada hoja como filas de celdas separadas por tabs, en el orden del libro. */
function sheets(zip: Xmls): { name: string; text: string }[] {
    const sharedStrings = [...read(zip, "xl/sharedStrings.xml").matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) =>
        decodeEntities([...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => t[1]).join("")),
    );
    const rels = Object.fromEntries(
        [...read(zip, "xl/_rels/workbook.xml.rels").matchAll(/<Relationship [^>]*>/g)].map(([tag]) => [
            tag.match(/Id="([^"]+)"/)?.[1],
            tag.match(/Target="([^"]+)"/)?.[1],
        ]),
    );

    return [...read(zip, "xl/workbook.xml").matchAll(/<sheet [^>]*>/g)].map(([tag]) => {
        const name = decodeEntities(tag.match(/name="([^"]*)"/)?.[1] ?? "");
        const target = rels[tag.match(/r:id="([^"]+)"/)?.[1] ?? ""] ?? "";
        const path = target.replace(/^\//, "").replace(/^(xl\/)?/, "xl/");
        const rows = [...read(zip, path).matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)].map((row) =>
            [...row[1].matchAll(/<c ([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)]
                .map(([, attrs, body = ""]) => {
                    const type = attrs.match(/\bt="(\w+)"/)?.[1];
                    if (type === "s") return sharedStrings[Number(body.match(/<v>(\d+)<\/v>/)?.[1])] ?? "";
                    if (type === "inlineStr") return decodeEntities(body.match(/<t[^>]*>([\s\S]*?)<\/t>/)?.[1] ?? "");
                    return decodeEntities(body.match(/<v>([\s\S]*?)<\/v>/)?.[1] ?? "");
                })
                .join("\t")
                .replace(/\t+$/, ""),
        );
        return { name, text: rows.filter(Boolean).join("\n") || "(hoja vacía)" };
    });
}

/**
 * Párrafos de un fragmento de ODF (odt/odp/ods): cada `<text:p>`/`<text:h>` es uno, sacando las
 * etiquetas internas (`text:span`, `text:a`...) y con `text:tab`/`text:line-break` como su espacio.
 */
function odfParagraphs(xml: string): string[] {
    return [...xml.matchAll(/<text:(?:p|h)\b[^>]*>([\s\S]*?)<\/text:(?:p|h)>/g)]
        .map(([, inner]) =>
            decodeEntities(
                inner
                    .replace(/<text:tab\b[^>]*\/>/g, "\t")
                    .replace(/<text:line-break\s*\/>/g, "\n")
                    .replace(/<[^>]+>/g, ""),
            ).trim(),
        )
        .filter(Boolean);
}

/** Cada `<table:table>` de un ods como filas de celdas separadas por tabs, en el orden del libro. */
function odsSheets(contentXml: string): { name: string; text: string }[] {
    return [...contentXml.matchAll(/<table:table\b([^>]*)>([\s\S]*?)<\/table:table>/g)].map(([, attrs, body]) => {
        const name = decodeEntities(attrs.match(/table:name="([^"]*)"/)?.[1] ?? "");
        const rows = [...body.matchAll(/<table:table-row\b[^>]*>([\s\S]*?)<\/table:table-row>/g)]
            .map(([, rowBody]) =>
                [...rowBody.matchAll(/<table:table-cell\b[^>]*?(?:\/>|>([\s\S]*?)<\/table:table-cell>)/g)]
                    .map(([, cellBody = ""]) => odfParagraphs(cellBody).join(" "))
                    .join("\t")
                    .replace(/\t+$/, ""),
            )
            .filter(Boolean);
        return { name, text: rows.join("\n") || "(hoja vacía)" };
    });
}
