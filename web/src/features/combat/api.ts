import type {
  AddParticipantsInput,
  CombatEncounterView,
  RollInitiativeInput,
} from "@dnd-manager/shared";
import { apiFetch } from "../../lib/api";

export const combatApi = {
  get: (groupId: string) => apiFetch<CombatEncounterView>(`/groups/${groupId}/combat`),
  start: (groupId: string, input: AddParticipantsInput) =>
    apiFetch<CombatEncounterView>(`/groups/${groupId}/combat`, {
      method: "POST",
      body: JSON.stringify(input),
    }),
  rollInitiative: (groupId: string, input: RollInitiativeInput) =>
    apiFetch<CombatEncounterView>(`/groups/${groupId}/combat/roll-initiative`, {
      method: "POST",
      body: JSON.stringify(input),
    }),
  lockOrder: (groupId: string) =>
    apiFetch<CombatEncounterView>(`/groups/${groupId}/combat/lock-order`, { method: "POST" }),
  nextTurn: (groupId: string) =>
    apiFetch<CombatEncounterView>(`/groups/${groupId}/combat/next-turn`, { method: "POST" }),
  addParticipants: (groupId: string, input: AddParticipantsInput) =>
    apiFetch<CombatEncounterView>(`/groups/${groupId}/combat/participants`, {
      method: "POST",
      body: JSON.stringify(input),
    }),
  removeParticipant: (groupId: string, participantId: string) =>
    apiFetch<CombatEncounterView>(`/groups/${groupId}/combat/participants/${participantId}`, {
      method: "DELETE",
    }),
  end: (groupId: string) => apiFetch<void>(`/groups/${groupId}/combat`, { method: "DELETE" }),
};
