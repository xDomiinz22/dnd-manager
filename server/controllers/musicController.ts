import type { RequestHandler } from "express";
import { addTrackSchema, createPlaylistSchema, renamePlaylistSchema } from "@dnd-manager/shared";
import * as musicService from "../services/musicService";

export const getGroupMusicHandler: RequestHandler = async (req, res, next) => {
  try {
    const music = await musicService.getGroupMusic(req.userId!, req.params.groupId!);
    res.json(music);
  } catch (err) {
    next(err);
  }
};

export const createPlaylistHandler: RequestHandler = async (req, res, next) => {
  try {
    const input = createPlaylistSchema.parse(req.body);
    const playlist = await musicService.createPlaylist(req.params.groupId!, input.name);
    res.status(201).json(playlist);
  } catch (err) {
    next(err);
  }
};

export const renamePlaylistHandler: RequestHandler = async (req, res, next) => {
  try {
    const input = renamePlaylistSchema.parse(req.body);
    const playlist = await musicService.renamePlaylist(
      req.params.playlistId!,
      req.params.groupId!,
      input.name,
    );
    res.json(playlist);
  } catch (err) {
    next(err);
  }
};

export const deletePlaylistHandler: RequestHandler = async (req, res, next) => {
  try {
    await musicService.deletePlaylist(req.params.playlistId!, req.params.groupId!);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
};

export const addTrackHandler: RequestHandler = async (req, res, next) => {
  try {
    const input = addTrackSchema.parse(req.body);
    const track = await musicService.addTrack(
      req.params.playlistId!,
      req.params.groupId!,
      input.title,
      input.url,
    );
    res.status(201).json(track);
  } catch (err) {
    next(err);
  }
};

export const deleteTrackHandler: RequestHandler = async (req, res, next) => {
  try {
    await musicService.deleteTrack(req.params.trackId!, req.params.groupId!);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
};
