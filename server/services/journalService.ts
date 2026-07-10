import { randomUUID } from "node:crypto";
import type {
  CreateJournalPageInput,
  Journal,
  JournalImportPayload,
  JournalPageView,
  JournalTreeNode,
  UpdateJournalPageInput,
} from "@dnd-manager/shared";
import { Prisma } from "@prisma/client";
import type { JournalEntry } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { resolveAssetUrl } from "./assetUrl";
import { getCharacterOrThrow } from "./characterService";
import { getMembership, resolveCharacterAccess } from "./authorization";
import { AppError } from "../errors/AppError";

type Tx = Prisma.TransactionClient;
// Import destructivo: timeout generoso para vaults grandes (createMany en
// bloque, no debería acercarse a esto, pero da margen bajo maxDuration=60s de Vercel).
const IMPORT_TRANSACTION_TIMEOUT_MS = 20_000;

const WIKILINK_PATTERN = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;

function extractWikiLinks(bodyMarkdown: string): { title: string; label: string | null }[] {
  const links: { title: string; label: string | null }[] = [];
  for (const match of bodyMarkdown.matchAll(WIKILINK_PATTERN)) {
    const title = match[1]?.trim();
    if (!title) continue;
    links.push({ title, label: match[2]?.trim() ?? null });
  }
  return links;
}

/**
 * Recalcula los JournalPageLink salientes de una página a partir de su
 * bodyMarkdown, resolviendo cada [[Título]]/[[Título|Alias]] contra las demás
 * páginas del mismo JournalEntry (por título, sin distinguir mayúsculas).
 * Los enlaces sin destino simplemente no generan fila (quedan como texto
 * plano al renderizar).
 */
async function syncPageLinks(db: Tx, pageId: string, journalEntryId: string, bodyMarkdown: string) {
  await db.journalPageLink.deleteMany({ where: { fromPageId: pageId } });

  const links = extractWikiLinks(bodyMarkdown);
  if (links.length === 0) return;

  const siblings = await db.journalPage.findMany({
    where: { journalEntryId },
    select: { id: true, title: true },
  });
  const byTitle = new Map(siblings.map((p) => [p.title.toLowerCase(), p.id]));

  const rows = new Map<string, { fromPageId: string; toPageId: string; label: string | null }>();
  for (const link of links) {
    const toPageId = byTitle.get(link.title.toLowerCase());
    if (!toPageId || toPageId === pageId || rows.has(toPageId)) continue;
    rows.set(toPageId, { fromPageId: pageId, toPageId, label: link.label });
  }

  if (rows.size > 0) {
    await db.journalPageLink.createMany({ data: [...rows.values()] });
  }
}

function buildTree(
  pages: { id: string; title: string; order: number; parentId: string | null }[],
): JournalTreeNode[] {
  const byParent = new Map<string | null, typeof pages>();
  for (const page of pages) {
    const list = byParent.get(page.parentId) ?? [];
    list.push(page);
    byParent.set(page.parentId, list);
  }
  function build(parentId: string | null): JournalTreeNode[] {
    return (byParent.get(parentId) ?? [])
      .sort((a, b) => a.order - b.order)
      .map((p) => ({ id: p.id, title: p.title, order: p.order, children: build(p.id) }));
  }
  return build(null);
}

async function toJournal(entry: JournalEntry): Promise<Journal> {
  const pages = await prisma.journalPage.findMany({
    where: { journalEntryId: entry.id },
    select: { id: true, title: true, order: true, parentId: true },
  });
  return { id: entry.id, title: entry.title, pages: buildTree(pages) };
}

async function loadPageView(pageId: string): Promise<JournalPageView> {
  const page = await prisma.journalPage.findUnique({
    where: { id: pageId },
    include: {
      assets: { include: { asset: true }, orderBy: { order: "asc" } },
      linksIn: { include: { fromPage: { select: { id: true, title: true } } } },
    },
  });
  if (!page) throw new AppError(404, "PAGE_NOT_FOUND", "Página no encontrada");

  return {
    id: page.id,
    journalEntryId: page.journalEntryId,
    parentId: page.parentId,
    title: page.title,
    bodyMarkdown: page.bodyMarkdown,
    order: page.order,
    foundryId: page.foundryId,
    assets: page.assets.map((pa) => ({
      assetId: pa.assetId,
      url: resolveAssetUrl(pa.asset),
      mime: pa.asset.mime,
      kind: pa.asset.kind,
      originalName: pa.asset.originalName,
      order: pa.order,
    })),
    backlinks: page.linksIn.map((l) => ({
      pageId: l.fromPage.id,
      title: l.fromPage.title,
      label: l.label,
    })),
    createdAt: page.createdAt.toISOString(),
    updatedAt: page.updatedAt.toISOString(),
  };
}

async function assertJournalReadAccess(entry: JournalEntry, userId: string): Promise<void> {
  if (entry.scope === "GROUP") {
    const membership = entry.groupId ? await getMembership(entry.groupId, userId) : null;
    if (!membership) throw new AppError(403, "NOT_GROUP_MEMBER", "No perteneces a este grupo");
    return;
  }
  const character = entry.characterId ? await getCharacterOrThrow(entry.characterId) : null;
  const access = character ? await resolveCharacterAccess(userId, character) : "NONE";
  if (access !== "FULL") {
    throw new AppError(
      403,
      "NOT_ALLOWED",
      "Solo el dueño del personaje o el Master ven este diario",
    );
  }
}

// ---- Import destructivo del journal de grupo ----

/**
 * Import destructivo: hace todo el guardado en bloque (createMany) en vez de
 * página por página. Con vaults reales de decenas/cientos de páginas, el
 * enfoque anterior (crear + actualizar padre + resolver links de cada página
 * en su propia query, secuencial) fácilmente superaba el timeout por defecto
 * de 5s de las transacciones interactivas de Prisma y fallaba con un error
 * genérico justo al terminar de subir los assets. Los ids reales y los
 * wiki-links se resuelven aquí en memoria (ya tenemos todas las páginas del
 * payload) para no depender de round-trips a la DB por página.
 */
export async function importGroupJournal(
  groupId: string,
  payload: JournalImportPayload,
): Promise<Journal> {
  const group = await prisma.group.findUnique({ where: { id: groupId } });
  if (!group) throw new AppError(404, "GROUP_NOT_FOUND", "Grupo no encontrado");

  const assetIds = [...new Set(payload.pages.flatMap((p) => p.assetIds))];
  if (assetIds.length > 0) {
    const found = await prisma.asset.count({ where: { id: { in: assetIds } } });
    if (found !== assetIds.length) {
      throw new AppError(422, "INVALID_ASSET_ID", "Algún asset referenciado no existe");
    }
  }

  const tempToReal = new Map(payload.pages.map((p) => [p.tempId, randomUUID()]));
  const byTitle = new Map(
    payload.pages.map((p) => [p.title.toLowerCase(), tempToReal.get(p.tempId)!]),
  );

  const pageRows = payload.pages.map((page) => ({
    id: tempToReal.get(page.tempId)!,
    title: page.title,
    bodyMarkdown: page.bodyMarkdown,
    order: page.order,
    foundryId: page.foundryId ?? null,
    parentId: page.parentTempId ? (tempToReal.get(page.parentTempId) ?? null) : null,
  }));

  const assetRows = payload.pages.flatMap((page) =>
    page.assetIds.map((assetId, order) => ({
      pageId: tempToReal.get(page.tempId)!,
      assetId,
      order,
    })),
  );

  const linkRows: { fromPageId: string; toPageId: string; label: string | null }[] = [];
  for (const page of payload.pages) {
    const fromPageId = tempToReal.get(page.tempId)!;
    const seen = new Set<string>();
    for (const link of extractWikiLinks(page.bodyMarkdown)) {
      const toPageId = byTitle.get(link.title.toLowerCase());
      if (!toPageId || toPageId === fromPageId || seen.has(toPageId)) continue;
      seen.add(toPageId);
      linkRows.push({ fromPageId, toPageId, label: link.label });
    }
  }

  const entryId = await prisma.$transaction(
    async (tx) => {
      await tx.journalEntry.deleteMany({ where: { groupId } });
      const entry = await tx.journalEntry.create({
        data: { scope: "GROUP", title: payload.title, groupId },
      });

      await tx.journalPage.createMany({
        data: pageRows.map((page) => ({ ...page, journalEntryId: entry.id })),
      });
      if (assetRows.length > 0) {
        await tx.journalPageAsset.createMany({ data: assetRows });
      }
      if (linkRows.length > 0) {
        await tx.journalPageLink.createMany({ data: linkRows });
      }

      return entry.id;
    },
    { timeout: IMPORT_TRANSACTION_TIMEOUT_MS },
  );

  const entry = await prisma.journalEntry.findUniqueOrThrow({ where: { id: entryId } });
  return toJournal(entry);
}

// ---- Lectura ----

export async function getGroupJournal(groupId: string): Promise<Journal> {
  const entry = await prisma.journalEntry.findUnique({ where: { groupId } });
  if (!entry) throw new AppError(404, "JOURNAL_NOT_FOUND", "Este grupo todavía no tiene diario");
  return toJournal(entry);
}

export async function getCharacterJournal(characterId: string): Promise<Journal> {
  const entry = await prisma.journalEntry.findUnique({ where: { characterId } });
  if (!entry)
    throw new AppError(404, "JOURNAL_NOT_FOUND", "Este personaje todavía no tiene diario");
  return toJournal(entry);
}

export async function getJournalPage(pageId: string, userId: string): Promise<JournalPageView> {
  const page = await prisma.journalPage.findUnique({
    where: { id: pageId },
    include: { journalEntry: true },
  });
  if (!page) throw new AppError(404, "PAGE_NOT_FOUND", "Página no encontrada");
  await assertJournalReadAccess(page.journalEntry, userId);
  return loadPageView(pageId);
}

// ---- CRUD páginas de grupo (abierto a cualquier miembro) ----

async function getOrCreateGroupJournalEntry(groupId: string): Promise<JournalEntry> {
  const existing = await prisma.journalEntry.findUnique({ where: { groupId } });
  if (existing) return existing;
  const group = await prisma.group.findUnique({ where: { id: groupId } });
  if (!group) throw new AppError(404, "GROUP_NOT_FOUND", "Grupo no encontrado");
  return prisma.journalEntry.create({
    data: { scope: "GROUP", title: `Diario de ${group.name}`, groupId },
  });
}

export async function createGroupJournalPage(
  groupId: string,
  input: CreateJournalPageInput,
): Promise<JournalPageView> {
  const entry = await getOrCreateGroupJournalEntry(groupId);
  const page = await prisma.journalPage.create({
    data: {
      journalEntryId: entry.id,
      title: input.title,
      bodyMarkdown: input.bodyMarkdown,
      parentId: input.parentId ?? null,
      order: input.order ?? 0,
    },
  });
  await syncPageLinks(prisma, page.id, entry.id, page.bodyMarkdown);
  return loadPageView(page.id);
}

async function getPageOrThrow(pageId: string) {
  const page = await prisma.journalPage.findUnique({ where: { id: pageId } });
  if (!page) throw new AppError(404, "PAGE_NOT_FOUND", "Página no encontrada");
  return page;
}

async function assertPageBelongsToEntry(pageId: string, journalEntryId: string) {
  const page = await getPageOrThrow(pageId);
  if (page.journalEntryId !== journalEntryId) {
    throw new AppError(404, "PAGE_NOT_FOUND", "Página no encontrada en este diario");
  }
  return page;
}

/** Al borrar una página, sus hijas se reengachan al abuelo en vez de perderse. */
async function reparentChildren(pageId: string, newParentId: string | null) {
  await prisma.journalPage.updateMany({
    where: { parentId: pageId },
    data: { parentId: newParentId },
  });
}

export async function updateGroupJournalPage(
  groupId: string,
  pageId: string,
  input: UpdateJournalPageInput,
): Promise<JournalPageView> {
  const entry = await getOrCreateGroupJournalEntry(groupId);
  await assertPageBelongsToEntry(pageId, entry.id);

  const updated = await prisma.journalPage.update({
    where: { id: pageId },
    data: {
      title: input.title,
      bodyMarkdown: input.bodyMarkdown,
      parentId: input.parentId,
      order: input.order,
    },
  });

  if (input.bodyMarkdown !== undefined || input.title !== undefined) {
    await syncPageLinks(prisma, pageId, entry.id, updated.bodyMarkdown);
  }
  return loadPageView(pageId);
}

export async function deleteGroupJournalPage(groupId: string, pageId: string): Promise<void> {
  const entry = await getOrCreateGroupJournalEntry(groupId);
  const page = await assertPageBelongsToEntry(pageId, entry.id);
  await reparentChildren(pageId, page.parentId);
  await prisma.journalPage.delete({ where: { id: pageId } });
}

// ---- CRUD páginas de personaje (dueño del PJ o Master del grupo) ----

async function getOrCreateCharacterJournalEntry(characterId: string): Promise<JournalEntry> {
  const existing = await prisma.journalEntry.findUnique({ where: { characterId } });
  if (existing) return existing;
  const character = await getCharacterOrThrow(characterId);
  return prisma.journalEntry.create({
    data: { scope: "CHARACTER", title: character.name, characterId },
  });
}

export async function createCharacterJournalPage(
  characterId: string,
  input: CreateJournalPageInput,
): Promise<JournalPageView> {
  const entry = await getOrCreateCharacterJournalEntry(characterId);
  const page = await prisma.journalPage.create({
    data: {
      journalEntryId: entry.id,
      title: input.title,
      bodyMarkdown: input.bodyMarkdown,
      parentId: input.parentId ?? null,
      order: input.order ?? 0,
    },
  });
  await syncPageLinks(prisma, page.id, entry.id, page.bodyMarkdown);
  return loadPageView(page.id);
}

export async function updateCharacterJournalPage(
  characterId: string,
  pageId: string,
  input: UpdateJournalPageInput,
): Promise<JournalPageView> {
  const entry = await getOrCreateCharacterJournalEntry(characterId);
  await assertPageBelongsToEntry(pageId, entry.id);

  const updated = await prisma.journalPage.update({
    where: { id: pageId },
    data: {
      title: input.title,
      bodyMarkdown: input.bodyMarkdown,
      parentId: input.parentId,
      order: input.order,
    },
  });

  if (input.bodyMarkdown !== undefined || input.title !== undefined) {
    await syncPageLinks(prisma, pageId, entry.id, updated.bodyMarkdown);
  }
  return loadPageView(pageId);
}

export async function deleteCharacterJournalPage(
  characterId: string,
  pageId: string,
): Promise<void> {
  const entry = await getOrCreateCharacterJournalEntry(characterId);
  const page = await assertPageBelongsToEntry(pageId, entry.id);
  await reparentChildren(pageId, page.parentId);
  await prisma.journalPage.delete({ where: { id: pageId } });
}
