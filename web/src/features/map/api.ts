import type { CreateMapPinInput, GroupMap, UpdateMapPinInput } from "@dnd-manager/shared";
import { apiFetch } from "../../lib/api";

export const mapApi = {
  get: (groupId: string) => apiFetch<GroupMap | null>(`/groups/${groupId}/map`),
  upload: (groupId: string, file: File) =>
    apiFetch<GroupMap>(`/groups/${groupId}/map?name=${encodeURIComponent(file.name)}`, {
      method: "POST",
      headers: { "Content-Type": file.type || "application/octet-stream" },
      body: file,
    }),
  createPin: (groupId: string, input: CreateMapPinInput) =>
    apiFetch<GroupMap>(`/groups/${groupId}/map/pins`, {
      method: "POST",
      body: JSON.stringify(input),
    }),
  updatePin: (groupId: string, pinId: string, input: UpdateMapPinInput) =>
    apiFetch<GroupMap>(`/groups/${groupId}/map/pins/${pinId}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  deletePin: (groupId: string, pinId: string) =>
    apiFetch<GroupMap>(`/groups/${groupId}/map/pins/${pinId}`, { method: "DELETE" }),
};
