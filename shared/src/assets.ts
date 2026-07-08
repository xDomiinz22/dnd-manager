import { z } from "zod";

export const assetKindSchema = z.enum(["IMAGE", "PDF", "OTHER"]);
export type AssetKindValue = z.infer<typeof assetKindSchema>;

export const uploadTokenRequestSchema = z.object({
  mime: z.string().min(1),
  name: z.string().min(1),
  kind: assetKindSchema,
});
export type UploadTokenRequest = z.infer<typeof uploadTokenRequestSchema>;

export const uploadTokenResponseSchema = z.object({
  key: z.string(),
  uploadUrl: z.string(),
  uploadMethod: z.enum(["PUT", "POST"]),
});
export type UploadTokenResponse = z.infer<typeof uploadTokenResponseSchema>;

export const confirmAssetSchema = z.object({
  key: z.string().min(1),
  mime: z.string().min(1),
  size: z.number().int().positive(),
  kind: assetKindSchema,
  originalName: z.string().optional(),
});
export type ConfirmAssetInput = z.infer<typeof confirmAssetSchema>;

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
