import { z } from "zod";

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
  characterName: z.string().nullable(),
  label: z.string(),
  formula: z.string(),
  total: z.number(),
});
export type ChatRollMention = z.infer<typeof chatRollMentionSchema>;

export const chatMessageSchema = z.object({
  id: z.string(),
  kind: z.enum(["TEXT", "ROLL"]),
  userId: z.string(),
  username: z.string(),
  text: z.string().nullable(),
  roll: chatRollMentionSchema.nullable(),
  createdAt: z.string(),
});
export type ChatMessageDto = z.infer<typeof chatMessageSchema>;

export const chatMessageListSchema = z.array(chatMessageSchema);
