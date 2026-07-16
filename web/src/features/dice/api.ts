import type { CreateRollInput, DiceRollDto } from "@dnd-manager/shared";
import { apiFetch } from "../../lib/api";

export const diceApi = {
  list: (groupId: string) => apiFetch<DiceRollDto[]>(`/groups/${groupId}/rolls`),
  create: (groupId: string, input: CreateRollInput) =>
    apiFetch<DiceRollDto>(`/groups/${groupId}/rolls`, {
      method: "POST",
      body: JSON.stringify(input),
    }),
};
