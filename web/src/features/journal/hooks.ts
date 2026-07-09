import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CreateJournalPageInput,
  JournalImportPayload,
  UpdateJournalPageInput,
} from "@dnd-manager/shared";
import { journalApi } from "./api";

const groupJournalKey = (groupId: string) => ["journal", "group", groupId] as const;
const characterJournalKey = (characterId: string) => ["journal", "character", characterId] as const;
const pageKey = (pageId: string) => ["journal", "page", pageId] as const;

export function useGroupJournal(groupId: string) {
  return useQuery({
    queryKey: groupJournalKey(groupId),
    queryFn: () => journalApi.getGroupJournal(groupId),
    retry: false,
  });
}

export function useImportGroupJournal(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: JournalImportPayload) => journalApi.importGroupJournal(groupId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: groupJournalKey(groupId) }),
  });
}

export function useCreateGroupPage(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateJournalPageInput) => journalApi.createGroupPage(groupId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: groupJournalKey(groupId) }),
  });
}

export function useUpdateGroupPage(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ pageId, input }: { pageId: string; input: UpdateJournalPageInput }) =>
      journalApi.updateGroupPage(groupId, pageId, input),
    onSuccess: (page) => {
      queryClient.invalidateQueries({ queryKey: groupJournalKey(groupId) });
      queryClient.invalidateQueries({ queryKey: pageKey(page.id) });
    },
  });
}

export function useDeleteGroupPage(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (pageId: string) => journalApi.deleteGroupPage(groupId, pageId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: groupJournalKey(groupId) }),
  });
}

export function useCharacterJournal(characterId: string) {
  return useQuery({
    queryKey: characterJournalKey(characterId),
    queryFn: () => journalApi.getCharacterJournal(characterId),
    retry: false,
  });
}

export function useCreateCharacterPage(characterId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateJournalPageInput) =>
      journalApi.createCharacterPage(characterId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: characterJournalKey(characterId) }),
  });
}

export function useUpdateCharacterPage(characterId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ pageId, input }: { pageId: string; input: UpdateJournalPageInput }) =>
      journalApi.updateCharacterPage(characterId, pageId, input),
    onSuccess: (page) => {
      queryClient.invalidateQueries({ queryKey: characterJournalKey(characterId) });
      queryClient.invalidateQueries({ queryKey: pageKey(page.id) });
    },
  });
}

export function useDeleteCharacterPage(characterId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (pageId: string) => journalApi.deleteCharacterPage(characterId, pageId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: characterJournalKey(characterId) }),
  });
}

export function useJournalPage(pageId: string | null) {
  return useQuery({
    queryKey: pageKey(pageId ?? ""),
    queryFn: () => journalApi.getPage(pageId!),
    enabled: !!pageId,
  });
}
