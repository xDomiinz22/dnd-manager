import type { ChatMessageDto, ChatSession, SendChatMessageInput } from "@dnd-manager/shared";
import { apiFetch } from "../../lib/api";

export const chatApi = {
  getSession: (groupId: string) => apiFetch<ChatSession>(`/groups/${groupId}/session`),
  startSession: (groupId: string) =>
    apiFetch<ChatSession>(`/groups/${groupId}/session/start`, { method: "POST" }),
  endSession: (groupId: string) =>
    apiFetch<void>(`/groups/${groupId}/session/end`, { method: "POST" }),
  listMessages: (groupId: string) =>
    apiFetch<ChatMessageDto[]>(`/groups/${groupId}/session/messages`),
  sendMessage: (groupId: string, input: SendChatMessageInput) =>
    apiFetch<ChatMessageDto>(`/groups/${groupId}/session/messages`, {
      method: "POST",
      body: JSON.stringify(input),
    }),
};
