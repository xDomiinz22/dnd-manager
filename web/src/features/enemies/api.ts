import type {
  CreateEnemyInput,
  EnemyListItem,
  ImportEnemyInput,
  ImportEnemyMdInput,
  UpdateEnemyInput,
  UploadEnemyImageResponse,
} from "@dnd-manager/shared";
import type { Asset } from "@dnd-manager/shared";
import { apiFetch } from "../../lib/api";

export const enemiesApi = {
  list: (groupId: string) => apiFetch<EnemyListItem[]>(`/groups/${groupId}/enemies`),
  get: (groupId: string, enemyId: string) =>
    apiFetch<EnemyListItem>(`/groups/${groupId}/enemies/${enemyId}`),
  create: (groupId: string, input: CreateEnemyInput) =>
    apiFetch<EnemyListItem>(`/groups/${groupId}/enemies`, {
      method: "POST",
      body: JSON.stringify(input),
    }),
  import: (groupId: string, input: ImportEnemyInput) =>
    apiFetch<EnemyListItem>(`/groups/${groupId}/enemies/import`, {
      method: "POST",
      body: JSON.stringify(input),
    }),
  importMd: (groupId: string, enemyId: string, input: ImportEnemyMdInput) =>
    apiFetch<EnemyListItem>(`/groups/${groupId}/enemies/${enemyId}/import-md`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  update: (groupId: string, enemyId: string, input: UpdateEnemyInput) =>
    apiFetch<EnemyListItem>(`/groups/${groupId}/enemies/${enemyId}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  remove: (groupId: string, enemyId: string) =>
    apiFetch<void>(`/groups/${groupId}/enemies/${enemyId}`, { method: "DELETE" }),
  listImages: (groupId: string, enemyId: string) =>
    apiFetch<Asset[]>(`/groups/${groupId}/enemies/${enemyId}/images`),
  uploadImage: (groupId: string, enemyId: string, file: File) =>
    apiFetch<UploadEnemyImageResponse>(
      `/groups/${groupId}/enemies/${enemyId}/images?name=${encodeURIComponent(file.name)}`,
      {
        method: "POST",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      },
    ),
  deleteImage: (groupId: string, enemyId: string, assetId: string) =>
    apiFetch<void>(`/groups/${groupId}/enemies/${enemyId}/images/${assetId}`, {
      method: "DELETE",
    }),
};
