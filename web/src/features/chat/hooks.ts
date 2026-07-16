import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { SendChatMessageInput } from "@dnd-manager/shared";
import { chatApi } from "./api";

const sessionKey = (groupId: string) => ["groups", groupId, "session"] as const;
const messagesKey = (groupId: string) => ["groups", groupId, "session", "messages"] as const;

// Igual que el log de tiradas: sin websockets, se refresca por polling
// mientras la página de chat está abierta.
const POLL_INTERVAL_MS = 3000;

export function useChatSession(groupId: string) {
  return useQuery({
    queryKey: sessionKey(groupId),
    queryFn: () => chatApi.getSession(groupId),
    enabled: !!groupId,
    refetchInterval: POLL_INTERVAL_MS,
  });
}

export function useChatMessages(groupId: string, { enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: messagesKey(groupId),
    queryFn: () => chatApi.listMessages(groupId),
    enabled: !!groupId && enabled,
    refetchInterval: enabled ? POLL_INTERVAL_MS : false,
  });
}

export function useStartSession(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => chatApi.startSession(groupId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sessionKey(groupId) });
      queryClient.invalidateQueries({ queryKey: messagesKey(groupId) });
    },
  });
}

export function useEndSession(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => chatApi.endSession(groupId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sessionKey(groupId) });
      queryClient.setQueryData(messagesKey(groupId), []);
    },
  });
}

export function useSendChatMessage(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SendChatMessageInput) => chatApi.sendMessage(groupId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: messagesKey(groupId) }),
  });
}
