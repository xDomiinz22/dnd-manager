import { Router, raw } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { requireGroupMaster, requireGroupMember } from "../middlewares/groupAuth";
import {
  createMapHandler,
  createMapPinHandler,
  deleteMapHandler,
  deleteMapPinHandler,
  getGroupMapHandler,
  listGroupMapsHandler,
  replaceMapImageHandler,
  updateMapMetaHandler,
  updateMapPinHandler,
} from "../controllers/mapController";

export const mapRouter = Router();

// Lectura abierta a cualquier miembro; crear/editar/borrar mapas y gestionar
// pines, solo Master.
mapRouter.get("/groups/:groupId/maps", requireAuth, requireGroupMember, listGroupMapsHandler);
mapRouter.post(
  "/groups/:groupId/maps",
  requireAuth,
  requireGroupMaster,
  raw({ type: "*/*", limit: "4mb" }),
  createMapHandler,
);
mapRouter.get("/groups/:groupId/maps/:mapId", requireAuth, requireGroupMember, getGroupMapHandler);
mapRouter.patch(
  "/groups/:groupId/maps/:mapId",
  requireAuth,
  requireGroupMaster,
  updateMapMetaHandler,
);
mapRouter.post(
  "/groups/:groupId/maps/:mapId/image",
  requireAuth,
  requireGroupMaster,
  raw({ type: "*/*", limit: "4mb" }),
  replaceMapImageHandler,
);
mapRouter.delete("/groups/:groupId/maps/:mapId", requireAuth, requireGroupMaster, deleteMapHandler);
mapRouter.post(
  "/groups/:groupId/maps/:mapId/pins",
  requireAuth,
  requireGroupMaster,
  createMapPinHandler,
);
mapRouter.patch(
  "/groups/:groupId/maps/:mapId/pins/:pinId",
  requireAuth,
  requireGroupMaster,
  updateMapPinHandler,
);
mapRouter.delete(
  "/groups/:groupId/maps/:mapId/pins/:pinId",
  requireAuth,
  requireGroupMaster,
  deleteMapPinHandler,
);
