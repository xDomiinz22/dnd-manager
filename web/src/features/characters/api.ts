import type {
  Asset,
  ChangePortraitInput,
  CharacterFull,
  CharacterListItem,
  CharacterView,
  DuplicateCharacterInput,
  ImportCharacterInput,
  ImportCharacterMdInput,
  UpdateHpInput,
  UpdateSpellSlotInput,
  UploadCharacterImageResponse,
} from "@dnd-manager/shared";
import { apiFetch } from "../../lib/api";

export const charactersApi = {
  get: (id: string) => apiFetch<CharacterView>(`/characters/${id}`),
  listMine: () => apiFetch<CharacterListItem[]>("/me/characters"),
  duplicate: (id: string, input: DuplicateCharacterInput) =>
    apiFetch<CharacterFull>(`/characters/${id}/duplicate`, {
      method: "POST",
      body: JSON.stringify(input),
    }),
  import: (groupId: string, input: ImportCharacterInput) =>
    apiFetch<CharacterFull>(`/groups/${groupId}/characters/import`, {
      method: "POST",
      body: JSON.stringify(input),
    }),
  importMd: (id: string, input: ImportCharacterMdInput) =>
    apiFetch<CharacterFull>(`/characters/${id}/import-md`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  changePortrait: (id: string, input: ChangePortraitInput) =>
    apiFetch<CharacterFull>(`/characters/${id}/portrait`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  updateHp: (id: string, input: UpdateHpInput) =>
    apiFetch<CharacterFull>(`/characters/${id}/hp`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  updateSpellSlot: (id: string, input: UpdateSpellSlotInput) =>
    apiFetch<CharacterFull>(`/characters/${id}/spell-slots`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  remove: (id: string) => apiFetch<void>(`/characters/${id}`, { method: "DELETE" }),
  listImages: (id: string) => apiFetch<Asset[]>(`/characters/${id}/images`),
  uploadImage: (id: string, file: File) =>
    apiFetch<UploadCharacterImageResponse>(
      `/characters/${id}/images?name=${encodeURIComponent(file.name)}`,
      {
        method: "POST",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      },
    ),
  deleteImage: (id: string, assetId: string) =>
    apiFetch<void>(`/characters/${id}/images/${assetId}`, { method: "DELETE" }),
};
