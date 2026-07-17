import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { CreateRollInput } from "@dnd-manager/shared";
import { diceApi } from "./api";

export function useCreateRoll(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateRollInput) => diceApi.create(groupId, input),
    // La tirada siempre queda mencionada en el chat (ver diceService.createGroupRoll:
    // ahora exige sesión activa), así que refrescamos sus mensajes al momento en vez
    // de esperar al siguiente poll de 3s.
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["groups", groupId, "session", "messages"] }),
  });
}
