import type { RequestHandler } from "express";
import { createMapPinSchema, updateMapPinSchema, updateMapMetaSchema } from "@dnd-manager/shared";
import * as mapService from "../services/mapService";
import { AppError } from "../errors/AppError";

export const listGroupMapsHandler: RequestHandler = async (req, res, next) => {
  try {
    const maps = await mapService.listGroupMaps(req.params.groupId as string);
    res.json(maps);
  } catch (err) {
    next(err);
  }
};

export const getGroupMapHandler: RequestHandler = async (req, res, next) => {
  try {
    const map = await mapService.getGroupMap(
      req.params.groupId as string,
      req.params.mapId as string,
    );
    res.json(map);
  } catch (err) {
    next(err);
  }
};

function requireUploadBody(req: Parameters<RequestHandler>[0]): Buffer {
  if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
    throw new AppError(400, "INVALID_UPLOAD", "Cuerpo de subida vacío");
  }
  return req.body;
}

export const createMapHandler: RequestHandler = async (req, res, next) => {
  try {
    const body = requireUploadBody(req);
    const originalName = typeof req.query.name === "string" ? req.query.name : null;
    const title =
      typeof req.query.title === "string" && req.query.title.trim()
        ? req.query.title.trim()
        : "Mapa sin título";
    const continent =
      typeof req.query.continent === "string" && req.query.continent.trim()
        ? req.query.continent.trim()
        : null;

    const map = await mapService.createMap(
      req.params.groupId as string,
      req.userId!,
      body,
      originalName,
      title,
      continent,
    );
    res.status(201).json(map);
  } catch (err) {
    next(err);
  }
};

export const updateMapMetaHandler: RequestHandler = async (req, res, next) => {
  try {
    const input = updateMapMetaSchema.parse(req.body);
    const map = await mapService.updateMapMeta(
      req.params.groupId as string,
      req.params.mapId as string,
      input,
    );
    res.json(map);
  } catch (err) {
    next(err);
  }
};

export const replaceMapImageHandler: RequestHandler = async (req, res, next) => {
  try {
    const body = requireUploadBody(req);
    const originalName = typeof req.query.name === "string" ? req.query.name : null;

    const map = await mapService.replaceMapImage(
      req.params.groupId as string,
      req.params.mapId as string,
      req.userId!,
      body,
      originalName,
    );
    res.status(201).json(map);
  } catch (err) {
    next(err);
  }
};

export const deleteMapHandler: RequestHandler = async (req, res, next) => {
  try {
    await mapService.deleteMap(req.params.groupId as string, req.params.mapId as string);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
};

export const createMapPinHandler: RequestHandler = async (req, res, next) => {
  try {
    const input = createMapPinSchema.parse(req.body);
    const map = await mapService.createMapPin(
      req.params.groupId as string,
      req.params.mapId as string,
      input,
    );
    res.status(201).json(map);
  } catch (err) {
    next(err);
  }
};

export const updateMapPinHandler: RequestHandler = async (req, res, next) => {
  try {
    const input = updateMapPinSchema.parse(req.body);
    const map = await mapService.updateMapPin(
      req.params.groupId as string,
      req.params.mapId as string,
      req.params.pinId as string,
      input,
    );
    res.json(map);
  } catch (err) {
    next(err);
  }
};

export const deleteMapPinHandler: RequestHandler = async (req, res, next) => {
  try {
    const map = await mapService.deleteMapPin(
      req.params.groupId as string,
      req.params.mapId as string,
      req.params.pinId as string,
    );
    res.json(map);
  } catch (err) {
    next(err);
  }
};
