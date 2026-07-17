import type { CreateRollInput, DiceRollDto } from "@dnd-manager/shared";
import { apiFetch } from "../../lib/api";

export const diceApi = {
  create: (groupId: string, input: CreateRollInput) =>
    apiFetch<DiceRollDto>(`/groups/${groupId}/rolls`, {
      method: "POST",
      body: JSON.stringify(input),
    }),
};
