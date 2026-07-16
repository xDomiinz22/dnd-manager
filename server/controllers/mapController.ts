import type { RequestHandler } from "express";
import { createMapPinSchema, updateMapPinSchema } from "@dnd-manager/shared";
import * as mapService from "../services/mapService";
import { AppError } from "../errors/AppError";

export const getGroupMapHandler: RequestHandler = async (req, res, next) => {
  try {
    const map = await mapService.getGroupMap(req.params.groupId as string);
    res.json(map);
  } catch (err) {
    next(err);
  }
};

export const uploadGroupMapHandler: RequestHandler = async (req, res, next) => {
  try {
    if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
      throw new AppError(400, "INVALID_UPLOAD", "Cuerpo de subida vacío");
    }
    const originalName = typeof req.query.name === "string" ? req.query.name : null;

    const map = await mapService.uploadGroupMap(
      req.params.groupId as string,
      req.userId!,
      req.body,
      originalName,
    );
    res.status(201).json(map);
  } catch (err) {
    next(err);
  }
};

export const createMapPinHandler: RequestHandler = async (req, res, next) => {
  try {
    const input = createMapPinSchema.parse(req.body);
    const map = await mapService.createMapPin(req.params.groupId as string, input);
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
      req.params.pinId as string,
    );
    res.json(map);
  } catch (err) {
    next(err);
  }
};
