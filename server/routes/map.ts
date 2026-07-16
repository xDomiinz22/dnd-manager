import { Router, raw } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { requireGroupMaster, requireGroupMember } from "../middlewares/groupAuth";
import {
  createMapPinHandler,
  deleteMapPinHandler,
  getGroupMapHandler,
  updateMapPinHandler,
  uploadGroupMapHandler,
} from "../controllers/mapController";

export const mapRouter = Router();

// Lectura abierta a cualquier miembro; subir mapa y gestionar pines, solo Master.
mapRouter.get("/groups/:groupId/map", requireAuth, requireGroupMember, getGroupMapHandler);
mapRouter.post(
  "/groups/:groupId/map",
  requireAuth,
  requireGroupMaster,
  raw({ type: "*/*", limit: "4mb" }),
  uploadGroupMapHandler,
);
mapRouter.post("/groups/:groupId/map/pins", requireAuth, requireGroupMaster, createMapPinHandler);
mapRouter.patch(
  "/groups/:groupId/map/pins/:pinId",
  requireAuth,
  requireGroupMaster,
  updateMapPinHandler,
);
mapRouter.delete(
  "/groups/:groupId/map/pins/:pinId",
  requireAuth,
  requireGroupMaster,
  deleteMapPinHandler,
);
