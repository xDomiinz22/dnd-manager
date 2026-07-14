import { z } from "zod";

export const musicTrackSchema = z.object({
  id: z.string(),
  title: z.string(),
  youtubeId: z.string(),
  order: z.number(),
  loop: z.boolean(),
  addedByUserId: z.string().nullable(),
  addedByUsername: z.string().nullable(),
});
export type MusicTrack = z.infer<typeof musicTrackSchema>;

export const musicPlaylistSchema = z.object({
  id: z.string(),
  name: z.string(),
  order: z.number(),
  openToAll: z.boolean(),
  tracks: z.array(musicTrackSchema),
});
export type MusicPlaylist = z.infer<typeof musicPlaylistSchema>;

// `canEdit` ya viene resuelto por el servidor (Master o `GroupMember.canEditMusic`)
// para que el frontend no tenga que conocer la regla de permisos.
export const groupMusicSchema = z.object({
  canEdit: z.boolean(),
  playlists: z.array(musicPlaylistSchema),
});
export type GroupMusic = z.infer<typeof groupMusicSchema>;

export const createPlaylistSchema = z.object({
  name: z.string().trim().min(1, "El nombre no puede estar vacío").max(80),
  openToAll: z.boolean().optional(),
});
export type CreatePlaylistInput = z.infer<typeof createPlaylistSchema>;

export const renamePlaylistSchema = z.object({
  name: z.string().trim().min(1, "El nombre no puede estar vacío").max(80),
});
export type RenamePlaylistInput = z.infer<typeof renamePlaylistSchema>;

export const addTrackSchema = z.object({
  title: z.string().trim().min(1, "El título no puede estar vacío").max(150),
  url: z.string().trim().min(1, "Pega un enlace de YouTube"),
});
export type AddTrackInput = z.infer<typeof addTrackSchema>;

export const updateTrackSchema = addTrackSchema;
export type UpdateTrackInput = z.infer<typeof updateTrackSchema>;

export const updateMemberMusicPermissionSchema = z.object({
  canEditMusic: z.boolean(),
});
export type UpdateMemberMusicPermissionInput = z.infer<typeof updateMemberMusicPermissionSchema>;

export const setPlaylistOpenSchema = z.object({
  openToAll: z.boolean(),
});
export type SetPlaylistOpenInput = z.infer<typeof setPlaylistOpenSchema>;

export const setTrackLoopSchema = z.object({
  loop: z.boolean(),
});
export type SetTrackLoopInput = z.infer<typeof setTrackLoopSchema>;

export const reorderTracksSchema = z.object({
  trackIds: z.array(z.string()).min(1),
});
export type ReorderTracksInput = z.infer<typeof reorderTracksSchema>;

export const moveTrackSchema = z.object({
  playlistId: z.string(),
});
export type MoveTrackInput = z.infer<typeof moveTrackSchema>;

// Regex puro (nada de `URL`/`URLSearchParams`) para que funcione igual en
// Node y en el navegador sin depender de qué libs ambiente tenga cada lado.
const YOUTUBE_URL_PATTERNS = [
  /youtu\.be\/([a-zA-Z0-9_-]{11})/,
  /[?&]v=([a-zA-Z0-9_-]{11})/,
  /youtube\.com\/(?:embed|shorts)\/([a-zA-Z0-9_-]{11})/,
];

/**
 * Extrae el ID de 11 caracteres de un enlace de YouTube en cualquiera de sus
 * formatos habituales (watch?v=, youtu.be/, /embed/, /shorts/), ignorando
 * parámetros extra (&t=, &list=...). Devuelve null si no es un enlace de
 * YouTube reconocible.
 */
export function extractYoutubeId(url: string): string | null {
  const trimmed = url.trim();
  if (!/youtube\.com|youtu\.be/.test(trimmed)) return null;

  for (const pattern of YOUTUBE_URL_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match) return match[1]!;
  }

  return null;
}
