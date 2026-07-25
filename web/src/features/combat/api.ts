import type {
  AddParticipantsInput,
  ApplyCombatEffectInput,
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
  applyEffect: (groupId: string, participantId: string, input: ApplyCombatEffectInput) =>
    apiFetch<CombatEncounterView>(
      `/groups/${groupId}/combat/participants/${participantId}/effects`,
      { method: "POST", body: JSON.stringify(input) },
    ),
  removeEffect: (groupId: string, participantId: string, effectId: string) =>
    apiFetch<CombatEncounterView>(
      `/groups/${groupId}/combat/participants/${participantId}/effects/${effectId}`,
      { method: "DELETE" },
    ),
};
