import { Router } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { requireGroupMember, requireGroupMusicEdit } from "../middlewares/groupAuth";
import {
  addTrackHandler,
  createPlaylistHandler,
  deletePlaylistHandler,
  deleteTrackHandler,
  getGroupMusicHandler,
  renamePlaylistHandler,
} from "../controllers/musicController";

export const musicRouter = Router();

musicRouter.get("/groups/:groupId/music", requireAuth, requireGroupMember, getGroupMusicHandler);
musicRouter.post(
  "/groups/:groupId/music/playlists",
  requireAuth,
  requireGroupMusicEdit,
  createPlaylistHandler,
);
musicRouter.patch(
  "/groups/:groupId/music/playlists/:playlistId",
  requireAuth,
  requireGroupMusicEdit,
  renamePlaylistHandler,
);
musicRouter.delete(
  "/groups/:groupId/music/playlists/:playlistId",
  requireAuth,
  requireGroupMusicEdit,
  deletePlaylistHandler,
);
musicRouter.post(
  "/groups/:groupId/music/playlists/:playlistId/tracks",
  requireAuth,
  requireGroupMusicEdit,
  addTrackHandler,
);
musicRouter.delete(
  "/groups/:groupId/music/tracks/:trackId",
  requireAuth,
  requireGroupMusicEdit,
  deleteTrackHandler,
);
