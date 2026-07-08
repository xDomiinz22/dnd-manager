import { z } from "zod";

export const assetKindSchema = z.enum(["IMAGE", "PDF", "OTHER"]);
export type AssetKindValue = z.infer<typeof assetKindSchema>;

export const assetSchema = z.object({
  id: z.string(),
  url: z.string(),
  kind: assetKindSchema,
  mime: z.string(),
  size: z.number(),
  originalName: z.string().nullable(),
  createdAt: z.string(),
});
export type Asset = z.infer<typeof assetSchema>;
