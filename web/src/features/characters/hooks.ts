import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  ChangePortraitInput,
  DuplicateCharacterInput,
  ImportCharacterInput,
  ImportCharacterMdInput,
  UpdateHpInput,
  UpdateSpellSlotInput,
} from "@dnd-manager/shared";
import { charactersApi } from "./api";
import { GROUPS_QUERY_KEY, groupDetailKey } from "../groups/hooks";

export const MY_CHARACTERS_QUERY_KEY = ["me", "characters"] as const;
export const characterKey = (id: string) => ["characters", id] as const;

export function useCharacter(id: string) {
  return useQuery({
    queryKey: characterKey(id),
    queryFn: () => charactersApi.get(id),
    enabled: !!id,
  });
}

export function useMyCharacters() {
  return useQuery({ queryKey: MY_CHARACTERS_QUERY_KEY, queryFn: charactersApi.listMine });
}

export function useDuplicateCharacter(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: DuplicateCharacterInput) => charactersApi.duplicate(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MY_CHARACTERS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: GROUPS_QUERY_KEY });
    },
  });
}

export function useImportCharacter(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ImportCharacterInput) => charactersApi.import(groupId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: groupDetailKey(groupId) });
    },
  });
}

export function useImportCharacterMd(id: string, groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ImportCharacterMdInput) => charactersApi.importMd(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: characterKey(id) });
      queryClient.invalidateQueries({ queryKey: groupDetailKey(groupId) });
    },
  });
}

export function useCharacterImages(id: string) {
  return useQuery({
    queryKey: [...characterKey(id), "images"],
    queryFn: () => charactersApi.listImages(id),
    enabled: !!id,
  });
}

export function useUploadCharacterImage(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => charactersApi.uploadImage(id, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: characterKey(id) });
      queryClient.invalidateQueries({ queryKey: [...characterKey(id), "images"] });
    },
  });
}

export function useChangePortrait(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ChangePortraitInput) => charactersApi.changePortrait(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: characterKey(id) }),
  });
}

export function useUpdateHp(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateHpInput) => charactersApi.updateHp(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: characterKey(id) }),
  });
}

export function useResetHp(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => charactersApi.resetHp(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: characterKey(id) }),
  });
}

export function useResetGroupHp(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => charactersApi.resetGroupHp(groupId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: groupDetailKey(groupId) }),
  });
}

export function useUpdateSpellSlot(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateSpellSlotInput) => charactersApi.updateSpellSlot(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: characterKey(id) }),
  });
}

export function useDeleteCharacter(id: string, groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => charactersApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: groupDetailKey(groupId) });
      queryClient.invalidateQueries({ queryKey: MY_CHARACTERS_QUERY_KEY });
    },
  });
}

export function useDeleteCharacterImage(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (assetId: string) => charactersApi.deleteImage(id, assetId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: characterKey(id) });
      queryClient.invalidateQueries({ queryKey: [...characterKey(id), "images"] });
    },
  });
}
