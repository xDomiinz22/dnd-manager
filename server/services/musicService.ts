import type {
  GroupMusic,
  MusicPlaylist as MusicPlaylistDto,
  MusicTrack as MusicTrackDto,
} from "@dnd-manager/shared";
import { extractYoutubeId } from "@dnd-manager/shared";
import { prisma } from "../../lib/prisma";
import { getMembership } from "./authorization";
import { AppError } from "../errors/AppError";

function toTrackDto(track: {
  id: string;
  title: string;
  youtubeId: string;
  order: number;
}): MusicTrackDto {
  return { id: track.id, title: track.title, youtubeId: track.youtubeId, order: track.order };
}

function toPlaylistDto(playlist: {
  id: string;
  name: string;
  order: number;
  tracks: { id: string; title: string; youtubeId: string; order: number }[];
}): MusicPlaylistDto {
  return {
    id: playlist.id,
    name: playlist.name,
    order: playlist.order,
    tracks: playlist.tracks.map(toTrackDto),
  };
}

export async function getGroupMusic(userId: string, groupId: string): Promise<GroupMusic> {
  const membership = await getMembership(groupId, userId);
  if (!membership) throw new AppError(403, "NOT_GROUP_MEMBER", "No perteneces a este grupo");

  const playlists = await prisma.musicPlaylist.findMany({
    where: { groupId },
    include: { tracks: { orderBy: { order: "asc" } } },
    orderBy: { order: "asc" },
  });

  return {
    canEdit: membership.role === "MASTER" || membership.canEditMusic,
    playlists: playlists.map(toPlaylistDto),
  };
}

async function getPlaylistOrThrow(playlistId: string, groupId: string) {
  const playlist = await prisma.musicPlaylist.findUnique({ where: { id: playlistId } });
  if (!playlist || playlist.groupId !== groupId) {
    throw new AppError(404, "PLAYLIST_NOT_FOUND", "Lista no encontrada");
  }
  return playlist;
}

export async function createPlaylist(groupId: string, name: string): Promise<MusicPlaylistDto> {
  const count = await prisma.musicPlaylist.count({ where: { groupId } });
  const playlist = await prisma.musicPlaylist.create({
    data: { groupId, name, order: count },
    include: { tracks: true },
  });
  return toPlaylistDto(playlist);
}

export async function renamePlaylist(
  playlistId: string,
  groupId: string,
  name: string,
): Promise<MusicPlaylistDto> {
  await getPlaylistOrThrow(playlistId, groupId);
  const playlist = await prisma.musicPlaylist.update({
    where: { id: playlistId },
    data: { name },
    include: { tracks: { orderBy: { order: "asc" } } },
  });
  return toPlaylistDto(playlist);
}

export async function deletePlaylist(playlistId: string, groupId: string): Promise<void> {
  await getPlaylistOrThrow(playlistId, groupId);
  await prisma.musicPlaylist.delete({ where: { id: playlistId } });
}

export async function addTrack(
  playlistId: string,
  groupId: string,
  title: string,
  url: string,
): Promise<MusicTrackDto> {
  await getPlaylistOrThrow(playlistId, groupId);
  const youtubeId = extractYoutubeId(url);
  if (!youtubeId) {
    throw new AppError(422, "INVALID_YOUTUBE_URL", "Ese enlace no es un vídeo de YouTube válido");
  }
  const count = await prisma.musicTrack.count({ where: { playlistId } });
  const track = await prisma.musicTrack.create({
    data: { playlistId, title, youtubeId, order: count },
  });
  return toTrackDto(track);
}

export async function deleteTrack(trackId: string, groupId: string): Promise<void> {
  const track = await prisma.musicTrack.findUnique({
    where: { id: trackId },
    include: { playlist: true },
  });
  if (!track || track.playlist.groupId !== groupId) {
    throw new AppError(404, "TRACK_NOT_FOUND", "Track no encontrado");
  }
  await prisma.musicTrack.delete({ where: { id: trackId } });
}
