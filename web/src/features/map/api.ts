import type {
  CreateMapPinInput,
  GroupMap,
  MapSummary,
  UpdateMapMetaInput,
  UpdateMapPinInput,
} from "@dnd-manager/shared";
import { apiFetch } from "../../lib/api";

export const mapApi = {
  list: (groupId: string) => apiFetch<MapSummary[]>(`/groups/${groupId}/maps`),
  get: (groupId: string, mapId: string) => apiFetch<GroupMap>(`/groups/${groupId}/maps/${mapId}`),
  create: (groupId: string, file: File, title: string, continent: string | null) => {
    const params = new URLSearchParams({ name: file.name, title });
    if (continent) params.set("continent", continent);
    return apiFetch<GroupMap>(`/groups/${groupId}/maps?${params.toString()}`, {
      method: "POST",
      headers: { "Content-Type": file.type || "application/octet-stream" },
      body: file,
    });
  },
  updateMeta: (groupId: string, mapId: string, input: UpdateMapMetaInput) =>
    apiFetch<MapSummary>(`/groups/${groupId}/maps/${mapId}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  replaceImage: (groupId: string, mapId: string, file: File) =>
    apiFetch<GroupMap>(
      `/groups/${groupId}/maps/${mapId}/image?name=${encodeURIComponent(file.name)}`,
      {
        method: "POST",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      },
    ),
  delete: (groupId: string, mapId: string) =>
    apiFetch<void>(`/groups/${groupId}/maps/${mapId}`, { method: "DELETE" }),
  createPin: (groupId: string, mapId: string, input: CreateMapPinInput) =>
    apiFetch<GroupMap>(`/groups/${groupId}/maps/${mapId}/pins`, {
      method: "POST",
      body: JSON.stringify(input),
    }),
  updatePin: (groupId: string, mapId: string, pinId: string, input: UpdateMapPinInput) =>
    apiFetch<GroupMap>(`/groups/${groupId}/maps/${mapId}/pins/${pinId}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  deletePin: (groupId: string, mapId: string, pinId: string) =>
    apiFetch<GroupMap>(`/groups/${groupId}/maps/${mapId}/pins/${pinId}`, { method: "DELETE" }),
};
