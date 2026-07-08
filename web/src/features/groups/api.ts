import type {
  CreateGroupInput,
  GroupDetail,
  GroupSummary,
  JoinGroupInput,
} from "@dnd-manager/shared";
import { apiFetch } from "../../lib/api";

export const groupsApi = {
  list: () => apiFetch<GroupSummary[]>("/groups"),
  create: (input: CreateGroupInput) =>
    apiFetch<GroupSummary>("/groups", { method: "POST", body: JSON.stringify(input) }),
  detail: (id: string) => apiFetch<GroupDetail>(`/groups/${id}`),
  join: (input: JoinGroupInput) =>
    apiFetch<GroupSummary>("/groups/join", { method: "POST", body: JSON.stringify(input) }),
  regenerateCode: (id: string) =>
    apiFetch<{ inviteCode: string }>(`/groups/${id}/regenerate-code`, { method: "POST" }),
  removeMember: (groupId: string, userId: string) =>
    apiFetch<void>(`/groups/${groupId}/members/${userId}`, { method: "DELETE" }),
};
