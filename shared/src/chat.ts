import { z } from "zod";
import { dieGroupResultSchema } from "./dice";

export const chatSessionSchema = z
  .object({
    id: z.string(),
    startedAt: z.string(),
  })
  .nullable();
export type ChatSession = z.infer<typeof chatSessionSchema>;

export const sendChatMessageSchema = z.object({
  text: z.string().trim().min(1, "El mensaje no puede estar vacío").max(500),
});
export type SendChatMessageInput = z.infer<typeof sendChatMessageSchema>;

export const chatRollMentionSchema = z.object({
  id: z.string(),
  characterId: z.string().nullable(),
  characterName: z.string().nullable(),
  label: z.string(),
  formula: z.string(),
  rolls: z.array(dieGroupResultSchema),
  modifier: z.number(),
  total: z.number(),
});
export type ChatRollMention = z.infer<typeof chatRollMentionSchema>;

export const chatMessageSchema = z.object({
  id: z.string(),
  kind: z.enum(["TEXT", "ROLL", "COMBAT"]),
  userId: z.string(),
  username: z.string(),
  text: z.string().nullable(),
  roll: chatRollMentionSchema.nullable(),
  // kind === "COMBAT": "STARTED" | "INITIATIVE_LOCKED" | "TURN" | "ENDED".
  combatEvent: z.string().nullable().optional(),
  createdAt: z.string(),
});
export type ChatMessageDto = z.infer<typeof chatMessageSchema>;

export const chatMessageListSchema = z.array(chatMessageSchema);
