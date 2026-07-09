import type {
  CreateJournalPageInput,
  Journal,
  JournalImportPayload,
  JournalPageView,
  UpdateJournalPageInput,
} from "@dnd-manager/shared";
import { apiFetch } from "../../lib/api";

export const journalApi = {
  getGroupJournal: (groupId: string) => apiFetch<Journal>(`/groups/${groupId}/journal`),
  importGroupJournal: (groupId: string, input: JournalImportPayload) =>
    apiFetch<Journal>(`/groups/${groupId}/journal/import`, {
      method: "POST",
      body: JSON.stringify(input),
    }),
  createGroupPage: (groupId: string, input: CreateJournalPageInput) =>
    apiFetch<JournalPageView>(`/groups/${groupId}/journal/pages`, {
      method: "POST",
      body: JSON.stringify(input),
    }),
  updateGroupPage: (groupId: string, pageId: string, input: UpdateJournalPageInput) =>
    apiFetch<JournalPageView>(`/groups/${groupId}/journal/pages/${pageId}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  deleteGroupPage: (groupId: string, pageId: string) =>
    apiFetch<void>(`/groups/${groupId}/journal/pages/${pageId}`, { method: "DELETE" }),

  getCharacterJournal: (characterId: string) =>
    apiFetch<Journal>(`/characters/${characterId}/journal`),
  createCharacterPage: (characterId: string, input: CreateJournalPageInput) =>
    apiFetch<JournalPageView>(`/characters/${characterId}/journal/pages`, {
      method: "POST",
      body: JSON.stringify(input),
    }),
  updateCharacterPage: (characterId: string, pageId: string, input: UpdateJournalPageInput) =>
    apiFetch<JournalPageView>(`/characters/${characterId}/journal/pages/${pageId}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  deleteCharacterPage: (characterId: string, pageId: string) =>
    apiFetch<void>(`/characters/${characterId}/journal/pages/${pageId}`, { method: "DELETE" }),

  getPage: (pageId: string) => apiFetch<JournalPageView>(`/journal/pages/${pageId}`),
};
