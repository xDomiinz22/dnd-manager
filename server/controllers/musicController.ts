import type { RequestHandler } from "express";
import {
  addTrackSchema,
  createPlaylistSchema,
  moveTrackSchema,
  renamePlaylistSchema,
  reorderTracksSchema,
  setPlaylistOpenSchema,
  setTrackLoopSchema,
  updateTrackSchema,
} from "@dnd-manager/shared";
import * as musicService from "../services/musicService";

export const getGroupMusicHandler: RequestHandler = async (req, res, next) => {
  try {
    const music = await musicService.getGroupMusic(req.userId!, req.params.groupId as string);
    res.json(music);
  } catch (err) {
    next(err);
  }
};

export const createPlaylistHandler: RequestHandler = async (req, res, next) => {
  try {
    const input = createPlaylistSchema.parse(req.body);
    const playlist = await musicService.createPlaylist(
      req.params.groupId as string,
      input.name,
      input.openToAll,
    );
    res.status(201).json(playlist);
  } catch (err) {
    next(err);
  }
};

export const setPlaylistOpenToAllHandler: RequestHandler = async (req, res, next) => {
  try {
    const input = setPlaylistOpenSchema.parse(req.body);
    const playlist = await musicService.setPlaylistOpenToAll(
      req.params.playlistId as string,
      req.params.groupId as string,
      input.openToAll,
    );
    res.json(playlist);
  } catch (err) {
    next(err);
  }
};

export const renamePlaylistHandler: RequestHandler = async (req, res, next) => {
  try {
    const input = renamePlaylistSchema.parse(req.body);
    const playlist = await musicService.renamePlaylist(
      req.params.playlistId as string,
      req.params.groupId as string,
      input.name,
    );
    res.json(playlist);
  } catch (err) {
    next(err);
  }
};

export const deletePlaylistHandler: RequestHandler = async (req, res, next) => {
  try {
    await musicService.deletePlaylist(
      req.params.playlistId as string,
      req.params.groupId as string,
    );
    res.status(204).end();
  } catch (err) {
    next(err);
  }
};

export const addTrackHandler: RequestHandler = async (req, res, next) => {
  try {
    const input = addTrackSchema.parse(req.body);
    const track = await musicService.addTrack(
      req.params.playlistId as string,
      req.params.groupId as string,
      input.title,
      input.url,
      req.userId!,
      req.groupMembership!,
    );
    res.status(201).json(track);
  } catch (err) {
    next(err);
  }
};

export const updateTrackHandler: RequestHandler = async (req, res, next) => {
  try {
    const input = updateTrackSchema.parse(req.body);
    const track = await musicService.updateTrack(
      req.params.trackId as string,
      req.params.groupId as string,
      input.title,
      input.url,
      req.userId!,
      req.groupMembership!,
    );
    res.json(track);
  } catch (err) {
    next(err);
  }
};

export const deleteTrackHandler: RequestHandler = async (req, res, next) => {
  try {
    await musicService.deleteTrack(
      req.params.trackId as string,
      req.params.groupId as string,
      req.userId!,
      req.groupMembership!,
    );
    res.status(204).end();
  } catch (err) {
    next(err);
  }
};

export const moveTrackHandler: RequestHandler = async (req, res, next) => {
  try {
    const input = moveTrackSchema.parse(req.body);
    const track = await musicService.moveTrack(
      req.params.trackId as string,
      req.params.groupId as string,
      input.playlistId,
      req.userId!,
      req.groupMembership!,
    );
    res.json(track);
  } catch (err) {
    next(err);
  }
};

export const reorderTracksHandler: RequestHandler = async (req, res, next) => {
  try {
    const input = reorderTracksSchema.parse(req.body);
    const tracks = await musicService.reorderTracks(
      req.params.playlistId as string,
      req.params.groupId as string,
      input.trackIds,
    );
    res.json(tracks);
  } catch (err) {
    next(err);
  }
};

export const setTrackLoopHandler: RequestHandler = async (req, res, next) => {
  try {
    const input = setTrackLoopSchema.parse(req.body);
    const track = await musicService.setTrackLoop(
      req.params.trackId as string,
      req.params.groupId as string,
      input.loop,
    );
    res.json(track);
  } catch (err) {
    next(err);
  }
};
