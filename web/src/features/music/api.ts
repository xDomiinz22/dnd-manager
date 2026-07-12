import type {
  AddTrackInput,
  CreatePlaylistInput,
  GroupMusic,
  MusicPlaylist,
  MusicTrack,
  RenamePlaylistInput,
} from "@dnd-manager/shared";
import { apiFetch } from "../../lib/api";

export const musicApi = {
  get: (groupId: string) => apiFetch<GroupMusic>(`/groups/${groupId}/music`),
  createPlaylist: (groupId: string, input: CreatePlaylistInput) =>
    apiFetch<MusicPlaylist>(`/groups/${groupId}/music/playlists`, {
      method: "POST",
      body: JSON.stringify(input),
    }),
  renamePlaylist: (groupId: string, playlistId: string, input: RenamePlaylistInput) =>
    apiFetch<MusicPlaylist>(`/groups/${groupId}/music/playlists/${playlistId}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  deletePlaylist: (groupId: string, playlistId: string) =>
    apiFetch<void>(`/groups/${groupId}/music/playlists/${playlistId}`, { method: "DELETE" }),
  addTrack: (groupId: string, playlistId: string, input: AddTrackInput) =>
    apiFetch<MusicTrack>(`/groups/${groupId}/music/playlists/${playlistId}/tracks`, {
      method: "POST",
      body: JSON.stringify(input),
    }),
  deleteTrack: (groupId: string, trackId: string) =>
    apiFetch<void>(`/groups/${groupId}/music/tracks/${trackId}`, { method: "DELETE" }),
};
