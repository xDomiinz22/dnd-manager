import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AddTrackInput, CreatePlaylistInput, RenamePlaylistInput } from "@dnd-manager/shared";
import { musicApi } from "./api";

export const groupMusicKey = (groupId: string) => ["groups", groupId, "music"] as const;

export function useGroupMusic(groupId: string) {
  return useQuery({
    queryKey: groupMusicKey(groupId),
    queryFn: () => musicApi.get(groupId),
    enabled: !!groupId,
  });
}

export function useCreatePlaylist(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePlaylistInput) => musicApi.createPlaylist(groupId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: groupMusicKey(groupId) }),
  });
}

export function useRenamePlaylist(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ playlistId, input }: { playlistId: string; input: RenamePlaylistInput }) =>
      musicApi.renamePlaylist(groupId, playlistId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: groupMusicKey(groupId) }),
  });
}

export function useDeletePlaylist(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (playlistId: string) => musicApi.deletePlaylist(groupId, playlistId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: groupMusicKey(groupId) }),
  });
}

export function useAddTrack(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ playlistId, input }: { playlistId: string; input: AddTrackInput }) =>
      musicApi.addTrack(groupId, playlistId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: groupMusicKey(groupId) }),
  });
}

export function useDeleteTrack(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (trackId: string) => musicApi.deleteTrack(groupId, trackId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: groupMusicKey(groupId) }),
  });
}
