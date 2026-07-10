import JSZip from "jszip";
import yaml from "js-yaml";
import { parseBracketLinkContent, type JournalImportPayload } from "@dnd-manager/shared";
import { apiFetch } from "../../lib/api";

/**
 * gray-matter depende de Buffer (global de Node) y no funciona en el
 * navegador; este parser cubre el mismo caso (frontmatter YAML entre `---`)
 * usando solo js-yaml, que es puro JS.
 */
function parseFrontmatter(raw: string): { data: Record<string, unknown>; content: string } {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { data: {}, content: raw };
  const data = (yaml.load(match[1] ?? "") as Record<string, unknown> | undefined) ?? {};
  return { data, content: match[2] ?? "" };
}

export interface ParsedJournalPage {
  tempId: string;
  parentTempId: string | null;
  title: string;
  bodyMarkdown: string;
  order: number;
  foundryId: string | null;
  assetFileNames: string[];
}

export interface ParsedJournalZip {
  title: string;
  pages: ParsedJournalPage[];
  assetFiles: Map<string, JSZip.JSZipObject>;
}

/** Obsidian escapa unicode en nombres de archivo como `#U00f3` (= "ó"). */
function decodeObsidianUnicode(name: string): string {
  return name.replace(/#U([0-9a-fA-F]{4,6})/g, (_, hex: string) =>
    String.fromCodePoint(parseInt(hex, 16)),
  );
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function stripDuplicateTitleHeading(content: string, title: string): string {
  return content.replace(new RegExp(`^#\\s*${escapeRegExp(title)}\\s*\\n+`), "").trim();
}

// Lazy hasta el primer `]]`: un nombre de archivo real puede traer un `]` suelto
// (p.ej. "... [Edge]-182.png"), así que no se puede excluir `]` del contenido.
const EMBED_PATTERN = /!\[\[([\s\S]+?)\]\]/g;

function extractEmbedFileNames(body: string): string[] {
  const names: string[] = [];
  for (const match of body.matchAll(EMBED_PATTERN)) {
    const name = parseBracketLinkContent(match[1] ?? "").target;
    if (name) names.push(name);
  }
  return names;
}

interface TocEntry {
  title: string;
  parentTitle: string | null;
}

/** Deriva la jerarquía del TOC a partir de la indentación de `- [[Página]]`. */
function parseToc(markdown: string): TocEntry[] {
  const lines = markdown.split(/\r?\n/);
  const stack: { title: string; indent: number }[] = [];
  const result: TocEntry[] = [];

  for (const rawLine of lines) {
    const match = rawLine.match(/^(\s*)-\s*\[\[([\s\S]+?)\]\]/);
    if (!match) continue;
    const indent = (match[1] ?? "").replace(/\t/g, "    ").length;
    const title = parseBracketLinkContent(match[2]!).target;

    while (stack.length > 0 && stack[stack.length - 1]!.indent >= indent) stack.pop();
    const parentTitle = stack.length > 0 ? stack[stack.length - 1]!.title : null;
    stack.push({ title, indent });
    result.push({ title, parentTitle });
  }
  return result;
}

/**
 * Parsea un .zip exportado de Obsidian (carpeta con un índice `<Carpeta>/<Carpeta>.md`
 * cuyo TOC anida wiki-links, más un directorio de assets). Todo ocurre en el
 * navegador; el resultado solo referencia nombres de archivo de assets, que se
 * suben después con `uploadJournalAssets`.
 */
export async function parseJournalZip(file: File | Blob): Promise<ParsedJournalZip> {
  const zip = await JSZip.loadAsync(file);

  const topFolders = new Set<string>();
  zip.forEach((relativePath) => {
    const [first, ...rest] = relativePath.split("/");
    if (first && rest.length > 0) topFolders.add(first);
  });

  let indexFolder: string | null = null;
  for (const folder of topFolders) {
    if (zip.file(`${folder}/${folder}.md`)) {
      indexFolder = folder;
      break;
    }
  }
  if (!indexFolder) {
    throw new Error(
      'No se encontró la página índice: se espera una carpeta con un .md del mismo nombre (p.ej. "Diario general/Diario general.md").',
    );
  }

  const assetFiles = new Map<string, JSZip.JSZipObject>();
  zip.forEach((relativePath, entry) => {
    if (entry.dir || relativePath.startsWith(`${indexFolder}/`)) return;
    const baseName = relativePath.split("/").pop()!;
    assetFiles.set(baseName, entry);
    assetFiles.set(decodeObsidianUnicode(baseName), entry);
  });

  const indexEntry = zip.file(`${indexFolder}/${indexFolder}.md`)!;
  const indexRaw = await indexEntry.async("string");
  const indexParsed = parseFrontmatter(indexRaw);
  const rootTitle = (indexParsed.data.title as string | undefined)?.trim() || indexFolder;
  const tocEntries = parseToc(indexParsed.content);
  const titleToParent = new Map(tocEntries.map((e) => [e.title, e.parentTitle]));

  let tempCounter = 0;
  const titleToTempId = new Map<string, string>();
  function tempIdFor(title: string): string {
    let id = titleToTempId.get(title);
    if (!id) {
      id = `p${tempCounter++}`;
      titleToTempId.set(title, id);
    }
    return id;
  }

  const pages: ParsedJournalPage[] = [];
  const rootTempId = tempIdFor(rootTitle);
  const rootBody = stripDuplicateTitleHeading(indexParsed.content, rootTitle);
  pages.push({
    tempId: rootTempId,
    parentTempId: null,
    title: rootTitle,
    bodyMarkdown: rootBody,
    order: 0,
    foundryId: (indexParsed.data.foundryId as string | undefined) ?? null,
    assetFileNames: extractEmbedFileNames(rootBody),
  });

  const pageFilePaths = Object.keys(zip.files).filter(
    (path) =>
      path.startsWith(`${indexFolder}/`) &&
      path.endsWith(".md") &&
      path !== `${indexFolder}/${indexFolder}.md`,
  );

  let order = 0;
  for (const path of pageFilePaths) {
    const raw = await zip.file(path)!.async("string");
    const parsed = parseFrontmatter(raw);
    const fileBaseTitle = path.split("/").pop()!.replace(/\.md$/, "");
    const title = (parsed.data.title as string | undefined)?.trim() || fileBaseTitle;

    const tempId = tempIdFor(title);
    const parentTitle = titleToParent.get(title) ?? null;
    const parentTempId = parentTitle ? tempIdFor(parentTitle) : rootTempId;
    const body = stripDuplicateTitleHeading(parsed.content, title);

    pages.push({
      tempId,
      parentTempId,
      title,
      bodyMarkdown: body,
      order: order++,
      foundryId: (parsed.data.foundryId as string | undefined) ?? null,
      assetFileNames: extractEmbedFileNames(body),
    });
  }

  return { title: rootTitle, pages, assetFiles };
}

function guessMime(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    gif: "image/gif",
    pdf: "application/pdf",
  };
  return map[ext] ?? "application/octet-stream";
}

function assetKindFor(mime: string): "IMAGE" | "PDF" | "OTHER" {
  if (mime.startsWith("image/")) return "IMAGE";
  if (mime === "application/pdf") return "PDF";
  return "OTHER";
}

export interface ZipImportProgress {
  uploadedAssets: number;
  totalAssets: number;
}

/**
 * Sube cada asset embebido referenciado por las páginas (una sola vez aunque
 * se repita en varias) y arma el payload estructurado que espera
 * POST /groups/:id/journal/import. Los embeds que no se puedan subir se dejan
 * como texto plano en vez de romper todo el import.
 */
export async function buildJournalImportPayload(
  parsed: ParsedJournalZip,
  onProgress?: (progress: ZipImportProgress) => void,
): Promise<JournalImportPayload> {
  const uploadedIdByFileName = new Map<string, string | null>();
  const uniqueFileNames = new Set(parsed.pages.flatMap((p) => p.assetFileNames));
  let uploaded = 0;

  async function uploadOnce(fileName: string): Promise<string | null> {
    if (uploadedIdByFileName.has(fileName)) return uploadedIdByFileName.get(fileName)!;

    const entry = parsed.assetFiles.get(fileName);
    if (!entry) {
      uploadedIdByFileName.set(fileName, null);
      return null;
    }

    try {
      const blob = await entry.async("blob");
      const mime = guessMime(fileName);
      const kind = assetKindFor(mime);
      const asset = await apiFetch<{ id: string }>(
        `/assets?kind=${kind}&name=${encodeURIComponent(fileName)}`,
        { method: "POST", headers: { "Content-Type": mime }, body: blob },
      );
      uploadedIdByFileName.set(fileName, asset.id);
      return asset.id;
    } catch {
      uploadedIdByFileName.set(fileName, null);
      return null;
    } finally {
      uploaded += 1;
      onProgress?.({ uploadedAssets: uploaded, totalAssets: uniqueFileNames.size });
    }
  }

  const pages: JournalImportPayload["pages"] = [];
  for (const page of parsed.pages) {
    const assetIds: string[] = [];
    let bodyMarkdown = page.bodyMarkdown;

    for (const fileName of page.assetFileNames) {
      const assetId = await uploadOnce(fileName);
      if (assetId) {
        assetIds.push(assetId);
        bodyMarkdown = bodyMarkdown.replace(
          new RegExp(`!\\[\\[${escapeRegExp(fileName)}(?:\\|[^\\]]+)?\\]\\]`, "g"),
          `![[asset:${assetId}]]`,
        );
      }
    }

    pages.push({
      tempId: page.tempId,
      parentTempId: page.parentTempId,
      title: page.title,
      bodyMarkdown,
      order: page.order,
      foundryId: page.foundryId,
      assetIds,
    });
  }

  return { title: parsed.title, pages };
}
