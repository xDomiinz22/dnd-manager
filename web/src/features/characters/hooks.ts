import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  DuplicateCharacterInput,
  ImportCharacterInput,
  ImportCharacterMdInput,
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
