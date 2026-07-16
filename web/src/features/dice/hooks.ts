import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateRollInput } from "@dnd-manager/shared";
import { diceApi } from "./api";

const groupRollsKey = (groupId: string) => ["groups", groupId, "rolls"] as const;

// Sin websockets en el proyecto: mientras el log está abierto se refresca
// solo (polling), suficiente para una lista de mesa en directo sin montar
// infraestructura de tiempo real para una app de este tamaño.
const POLL_INTERVAL_MS = 4000;

export function useGroupRolls(groupId: string, { poll = false }: { poll?: boolean } = {}) {
  return useQuery({
    queryKey: groupRollsKey(groupId),
    queryFn: () => diceApi.list(groupId),
    enabled: !!groupId,
    refetchInterval: poll ? POLL_INTERVAL_MS : false,
  });
}

export function useCreateRoll(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateRollInput) => diceApi.create(groupId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: groupRollsKey(groupId) }),
  });
}
