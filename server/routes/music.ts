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
  setPlaylistOpenToAllHandler,
  setTrackLoopHandler,
  updateTrackHandler,
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
musicRouter.patch(
  "/groups/:groupId/music/playlists/:playlistId/open-to-all",
  requireAuth,
  requireGroupMusicEdit,
  setPlaylistOpenToAllHandler,
);
musicRouter.post(
  "/groups/:groupId/music/playlists/:playlistId/tracks",
  requireAuth,
  requireGroupMember,
  addTrackHandler,
);
musicRouter.patch(
  "/groups/:groupId/music/tracks/:trackId",
  requireAuth,
  requireGroupMember,
  updateTrackHandler,
);
musicRouter.delete(
  "/groups/:groupId/music/tracks/:trackId",
  requireAuth,
  requireGroupMember,
  deleteTrackHandler,
);
musicRouter.patch(
  "/groups/:groupId/music/tracks/:trackId/loop",
  requireAuth,
  requireGroupMember,
  setTrackLoopHandler,
);
