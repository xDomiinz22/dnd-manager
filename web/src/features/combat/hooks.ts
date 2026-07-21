import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AddParticipantsInput, RollInitiativeInput } from "@dnd-manager/shared";
import { combatApi } from "./api";

const combatKey = (groupId: string) => ["groups", groupId, "combat"] as const;
const messagesKey = (groupId: string) => ["groups", groupId, "session", "messages"] as const;

// Igual que el chat/log de tiradas: sin websockets, se refresca por polling.
const POLL_INTERVAL_MS = 3000;

export function useCombatEncounter(
  groupId: string,
  { enabled = true }: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: combatKey(groupId),
    queryFn: () => combatApi.get(groupId),
    enabled: !!groupId && enabled,
    refetchInterval: enabled ? POLL_INTERVAL_MS : false,
  });
}

function invalidateCombatAndChat(queryClient: ReturnType<typeof useQueryClient>, groupId: string) {
  queryClient.invalidateQueries({ queryKey: combatKey(groupId) });
  queryClient.invalidateQueries({ queryKey: messagesKey(groupId) });
}

export function useStartCombat(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AddParticipantsInput) => combatApi.start(groupId, input),
    onSuccess: () => invalidateCombatAndChat(queryClient, groupId),
  });
}

export function useRollInitiative(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: RollInitiativeInput) => combatApi.rollInitiative(groupId, input),
    onSuccess: () => invalidateCombatAndChat(queryClient, groupId),
  });
}

export function useLockOrder(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => combatApi.lockOrder(groupId),
    onSuccess: () => invalidateCombatAndChat(queryClient, groupId),
  });
}

export function useNextTurn(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => combatApi.nextTurn(groupId),
    onSuccess: () => invalidateCombatAndChat(queryClient, groupId),
  });
}

export function useAddCombatParticipants(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AddParticipantsInput) => combatApi.addParticipants(groupId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: combatKey(groupId) }),
  });
}

export function useRemoveCombatParticipant(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (participantId: string) => combatApi.removeParticipant(groupId, participantId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: combatKey(groupId) }),
  });
}

export function useEndCombat(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => combatApi.end(groupId),
    onSuccess: () => invalidateCombatAndChat(queryClient, groupId),
  });
}
