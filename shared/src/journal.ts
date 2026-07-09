import { z } from "zod";

// ---- Import (cliente -> servidor): JSON estructurado ya resuelto en el navegador ----
// Los wiki-links [[Título]] se dejan tal cual en bodyMarkdown; el servidor los
// resuelve a JournalPageLink una vez que conoce los títulos de todas las
// páginas insertadas (evita tener que resolver tempIds de enlaces en el
// navegador, y permite que los enlaces se mantengan correctos si el título
// de una página cambia más adelante).
export const journalImportPageSchema = z.object({
  tempId: z.string(),
  parentTempId: z.string().nullable(),
  title: z.string().min(1),
  bodyMarkdown: z.string(),
  order: z.number().int(),
  foundryId: z.string().nullable().optional(),
  assetIds: z.array(z.string()),
});
export type JournalImportPage = z.infer<typeof journalImportPageSchema>;

export const journalImportPayloadSchema = z.object({
  title: z.string().min(1),
  pages: z.array(journalImportPageSchema).min(1),
});
export type JournalImportPayload = z.infer<typeof journalImportPayloadSchema>;

// ---- Árbol de páginas ----
export interface JournalTreeNode {
  id: string;
  title: string;
  order: number;
  children: JournalTreeNode[];
}
export const journalTreeNodeSchema: z.ZodType<JournalTreeNode> = z.lazy(() =>
  z.object({
    id: z.string(),
    title: z.string(),
    order: z.number(),
    children: z.array(journalTreeNodeSchema),
  }),
);

export const journalSchema = z.object({
  id: z.string(),
  title: z.string(),
  pages: z.array(journalTreeNodeSchema),
});
export type Journal = z.infer<typeof journalSchema>;

// ---- Página resuelta ----
export const journalPageAssetSchema = z.object({
  assetId: z.string(),
  url: z.string(),
  mime: z.string(),
  kind: z.enum(["IMAGE", "PDF", "OTHER"]),
  originalName: z.string().nullable(),
  order: z.number(),
});
export type JournalPageAssetView = z.infer<typeof journalPageAssetSchema>;

export const journalBacklinkSchema = z.object({
  pageId: z.string(),
  title: z.string(),
  label: z.string().nullable(),
});
export type JournalBacklink = z.infer<typeof journalBacklinkSchema>;

export const journalPageViewSchema = z.object({
  id: z.string(),
  journalEntryId: z.string(),
  parentId: z.string().nullable(),
  title: z.string(),
  bodyMarkdown: z.string(),
  order: z.number(),
  foundryId: z.string().nullable(),
  assets: z.array(journalPageAssetSchema),
  backlinks: z.array(journalBacklinkSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type JournalPageView = z.infer<typeof journalPageViewSchema>;

// ---- CRUD de páginas ----
export const createJournalPageSchema = z.object({
  title: z.string().min(1),
  bodyMarkdown: z.string().default(""),
  parentId: z.string().nullable().optional(),
  order: z.number().optional(),
});
export type CreateJournalPageInput = z.infer<typeof createJournalPageSchema>;

export const updateJournalPageSchema = z.object({
  title: z.string().min(1).optional(),
  bodyMarkdown: z.string().optional(),
  parentId: z.string().nullable().optional(),
  order: z.number().optional(),
});
export type UpdateJournalPageInput = z.infer<typeof updateJournalPageSchema>;
