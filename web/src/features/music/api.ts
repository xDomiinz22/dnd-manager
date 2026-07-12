import type {
  AddTrackInput,
  CreatePlaylistInput,
  GroupMusic,
  MusicPlaylist,
  MusicTrack,
  RenamePlaylistInput,
  SetPlaylistOpenInput,
  SetTrackLoopInput,
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
  setPlaylistOpenToAll: (groupId: string, playlistId: string, input: SetPlaylistOpenInput) =>
    apiFetch<MusicPlaylist>(`/groups/${groupId}/music/playlists/${playlistId}/open-to-all`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  setTrackLoop: (groupId: string, trackId: string, input: SetTrackLoopInput) =>
    apiFetch<MusicTrack>(`/groups/${groupId}/music/tracks/${trackId}/loop`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
};
