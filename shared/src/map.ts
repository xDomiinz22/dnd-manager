import { z } from "zod";

export const mapPinSchema = z.object({
  id: z.string(),
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  title: z.string(),
  journalPageId: z.string().nullable(),
  order: z.number(),
});
export type MapPin = z.infer<typeof mapPinSchema>;

export const groupMapSchema = z.object({
  imageUrl: z.string(),
  width: z.number(),
  height: z.number(),
  updatedAt: z.string(),
  pins: z.array(mapPinSchema),
});
export type GroupMap = z.infer<typeof groupMapSchema>;

export const createMapPinSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  title: z.string().trim().min(1, "El título no puede estar vacío").max(120),
  journalPageId: z.string().nullable().optional(),
});
export type CreateMapPinInput = z.infer<typeof createMapPinSchema>;

export const updateMapPinSchema = z.object({
  x: z.number().min(0).max(1).optional(),
  y: z.number().min(0).max(1).optional(),
  title: z.string().trim().min(1, "El título no puede estar vacío").max(120).optional(),
  journalPageId: z.string().nullable().optional(),
});
export type UpdateMapPinInput = z.infer<typeof updateMapPinSchema>;
