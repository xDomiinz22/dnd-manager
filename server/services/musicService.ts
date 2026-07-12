import type { GroupMember } from "@prisma/client";
import type {
  GroupMusic,
  MusicPlaylist as MusicPlaylistDto,
  MusicTrack as MusicTrackDto,
} from "@dnd-manager/shared";
import { extractYoutubeId } from "@dnd-manager/shared";
import { prisma } from "../../lib/prisma";
import { getMembership } from "./authorization";
import { AppError } from "../errors/AppError";

const TRACK_INCLUDE = { addedBy: { select: { username: true } } } as const;

type TrackWithAdder = {
  id: string;
  title: string;
  youtubeId: string;
  order: number;
  loop: boolean;
  addedByUserId: string | null;
  addedBy: { username: string } | null;
};

function toTrackDto(track: TrackWithAdder): MusicTrackDto {
  return {
    id: track.id,
    title: track.title,
    youtubeId: track.youtubeId,
    order: track.order,
    loop: track.loop,
    addedByUserId: track.addedByUserId,
    addedByUsername: track.addedBy?.username ?? null,
  };
}

function toPlaylistDto(playlist: {
  id: string;
  name: string;
  order: number;
  openToAll: boolean;
  tracks: TrackWithAdder[];
}): MusicPlaylistDto {
  return {
    id: playlist.id,
    name: playlist.name,
    order: playlist.order,
    openToAll: playlist.openToAll,
    tracks: playlist.tracks.map(toTrackDto),
  };
}

export async function getGroupMusic(userId: string, groupId: string): Promise<GroupMusic> {
  const membership = await getMembership(groupId, userId);
  if (!membership) throw new AppError(403, "NOT_GROUP_MEMBER", "No perteneces a este grupo");

  const playlists = await prisma.musicPlaylist.findMany({
    where: { groupId },
    include: { tracks: { orderBy: { order: "asc" }, include: TRACK_INCLUDE } },
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

export async function createPlaylist(
  groupId: string,
  name: string,
  openToAll = false,
): Promise<MusicPlaylistDto> {
  const count = await prisma.musicPlaylist.count({ where: { groupId } });
  const playlist = await prisma.musicPlaylist.create({
    data: { groupId, name, order: count, openToAll },
    include: { tracks: { include: TRACK_INCLUDE } },
  });
  return toPlaylistDto(playlist);
}

export async function setPlaylistOpenToAll(
  playlistId: string,
  groupId: string,
  openToAll: boolean,
): Promise<MusicPlaylistDto> {
  await getPlaylistOrThrow(playlistId, groupId);
  const playlist = await prisma.musicPlaylist.update({
    where: { id: playlistId },
    data: { openToAll },
    include: { tracks: { orderBy: { order: "asc" }, include: TRACK_INCLUDE } },
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
    include: { tracks: { orderBy: { order: "asc" }, include: TRACK_INCLUDE } },
  });
  return toPlaylistDto(playlist);
}

export async function deletePlaylist(playlistId: string, groupId: string): Promise<void> {
  await getPlaylistOrThrow(playlistId, groupId);
  await prisma.musicPlaylist.delete({ where: { id: playlistId } });
}

function canManageMusic(membership: GroupMember): boolean {
  return membership.role === "MASTER" || membership.canEditMusic;
}

export async function addTrack(
  playlistId: string,
  groupId: string,
  title: string,
  url: string,
  userId: string,
  membership: GroupMember,
): Promise<MusicTrackDto> {
  const playlist = await getPlaylistOrThrow(playlistId, groupId);
  if (!canManageMusic(membership) && !playlist.openToAll) {
    throw new AppError(403, "NOT_ALLOWED", "No tienes permiso para añadir tracks a esta lista");
  }
  const youtubeId = extractYoutubeId(url);
  if (!youtubeId) {
    throw new AppError(422, "INVALID_YOUTUBE_URL", "Ese enlace no es un vídeo de YouTube válido");
  }
  const count = await prisma.musicTrack.count({ where: { playlistId } });
  const track = await prisma.musicTrack.create({
    data: { playlistId, title, youtubeId, order: count, addedByUserId: userId },
    include: TRACK_INCLUDE,
  });
  return toTrackDto(track);
}

export async function deleteTrack(
  trackId: string,
  groupId: string,
  userId: string,
  membership: GroupMember,
): Promise<void> {
  const track = await prisma.musicTrack.findUnique({
    where: { id: trackId },
    include: { playlist: true },
  });
  if (!track || track.playlist.groupId !== groupId) {
    throw new AppError(404, "TRACK_NOT_FOUND", "Track no encontrado");
  }
  if (!canManageMusic(membership) && track.addedByUserId !== userId) {
    throw new AppError(403, "NOT_ALLOWED", "No tienes permiso para borrar este track");
  }
  await prisma.musicTrack.delete({ where: { id: trackId } });
}

export async function setTrackLoop(
  trackId: string,
  groupId: string,
  loop: boolean,
): Promise<MusicTrackDto> {
  const track = await prisma.musicTrack.findUnique({
    where: { id: trackId },
    include: { playlist: true },
  });
  if (!track || track.playlist.groupId !== groupId) {
    throw new AppError(404, "TRACK_NOT_FOUND", "Track no encontrado");
  }
  const updated = await prisma.musicTrack.update({
    where: { id: trackId },
    data: { loop },
    include: TRACK_INCLUDE,
  });
  return toTrackDto(updated);
}
