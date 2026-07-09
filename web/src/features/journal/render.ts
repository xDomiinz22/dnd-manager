import { marked } from "marked";
import DOMPurify from "dompurify";
import type { Journal, JournalPageAssetView, JournalTreeNode } from "@dnd-manager/shared";

/** Prefijo de href interno para que un click en un wiki-link navegue con React Router en vez de recargar. */
export const JOURNAL_PAGE_LINK_PREFIX = "journal-page:";

export function buildTitleIndex(journal: Journal | undefined): Map<string, string> {
  const index = new Map<string, string>();
  function walk(nodes: JournalTreeNode[]) {
    for (const node of nodes) {
      index.set(node.title.trim().toLowerCase(), node.id);
      walk(node.children);
    }
  }
  if (journal) walk(journal.pages);
  return index;
}

/**
 * Convierte los marcadores propios (`![[asset:ID]]`, `[[Título|Alias]]`) en
 * markdown estándar antes de pasarlo por `marked`. Los wiki-links sin destino
 * conocido quedan como texto plano (sin corchetes).
 */
function resolveMarkers(
  bodyMarkdown: string,
  assets: JournalPageAssetView[],
  titleToId: Map<string, string>,
): string {
  let text = bodyMarkdown.replace(/!\[\[asset:([a-zA-Z0-9_-]+)\]\]/g, (_, assetId: string) => {
    const asset = assets.find((a) => a.assetId === assetId);
    if (!asset) return "";
    const alt = asset.originalName ?? "";
    if (asset.kind === "IMAGE") return `![${alt}](${asset.url})`;
    return `[${alt || "archivo adjunto"}](${asset.url})`;
  });

  text = text.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, title: string, alias?: string) => {
    const label = (alias ?? title).trim();
    const id = titleToId.get(title.trim().toLowerCase());
    if (!id) return label;
    // Fragmento en vez de esquema propio: DOMPurify descarta hrefs con
    // esquemas no reconocidos (p.ej. "journal-page:ID"), pero un "#..." es
    // una URI relativa estándar que siempre deja pasar.
    return `[${label}](#${JOURNAL_PAGE_LINK_PREFIX}${id})`;
  });

  return text;
}

export function renderJournalHtml(
  bodyMarkdown: string,
  assets: JournalPageAssetView[],
  titleToId: Map<string, string>,
): string {
  const resolved = resolveMarkers(bodyMarkdown, assets, titleToId);
  const html = marked.parse(resolved, { async: false }) as string;
  return DOMPurify.sanitize(html);
}
