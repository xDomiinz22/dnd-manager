import type {
  CharacterFull,
  CharacterListItem,
  CharacterView,
  DuplicateCharacterInput,
  ImportCharacterInput,
  ImportCharacterMdInput,
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
};
