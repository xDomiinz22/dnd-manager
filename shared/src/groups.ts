import { z } from "zod";

export const groupRoleSchema = z.enum(["MASTER", "PLAYER"]);
export type GroupRoleValue = z.infer<typeof groupRoleSchema>;

export const createGroupSchema = z.object({
  name: z.string().trim().min(1, "El nombre no puede estar vacío").max(100),
});
export type CreateGroupInput = z.infer<typeof createGroupSchema>;

export const joinGroupSchema = z.object({
  inviteCode: z.string().trim().min(4, "El código debe tener al menos 4 caracteres").max(12),
});
export type JoinGroupInput = z.infer<typeof joinGroupSchema>;

export const groupSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  role: groupRoleSchema,
  memberCount: z.number(),
  createdAt: z.string(),
});
export type GroupSummary = z.infer<typeof groupSummarySchema>;

export const groupMemberSummarySchema = z.object({
  userId: z.string(),
  username: z.string(),
  avatarUrl: z.string().nullable(),
  role: groupRoleSchema,
});
export type GroupMemberSummary = z.infer<typeof groupMemberSummarySchema>;

// Roster de personajes embebido en el detalle de grupo. Miembros ajenos solo
// ven nombre + foto (regla de negocio); el Master y el dueño ven el resto.
export const characterRosterEntrySchema = z.object({
  id: z.string(),
  name: z.string(),
  portraitUrl: z.string().nullable(),
  ownerId: z.string().nullable(),
  ownerUsername: z.string().nullable(),
  level: z.number().nullable(),
  className: z.string().nullable(),
});
export type CharacterRosterEntry = z.infer<typeof characterRosterEntrySchema>;

export const groupDetailSchema = z.object({
  id: z.string(),
  name: z.string(),
  inviteCode: z.string(),
  role: groupRoleSchema,
  master: z.object({ id: z.string(), username: z.string() }),
  members: z.array(groupMemberSummarySchema),
  characters: z.array(characterRosterEntrySchema),
  createdAt: z.string(),
});
export type GroupDetail = z.infer<typeof groupDetailSchema>;
