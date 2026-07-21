import { Router, raw } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { requireGroupMaster, requireGroupMember } from "../middlewares/groupAuth";
import { requireEnemyMaster } from "../middlewares/enemyAuth";
import {
  createQuickEnemyHandler,
  deleteEnemyHandler,
  deleteEnemyImageHandler,
  getEnemyHandler,
  importEnemyHandler,
  importEnemyMdHandler,
  listEnemiesHandler,
  listEnemyImagesHandler,
  updateEnemyHandler,
  uploadEnemyImageHandler,
} from "../controllers/enemyController";

export const enemiesRouter = Router();

enemiesRouter.get("/groups/:groupId/enemies", requireAuth, requireGroupMember, listEnemiesHandler);
enemiesRouter.post(
  "/groups/:groupId/enemies",
  requireAuth,
  requireGroupMaster,
  createQuickEnemyHandler,
);
enemiesRouter.post(
  "/groups/:groupId/enemies/import",
  requireAuth,
  requireGroupMaster,
  importEnemyHandler,
);
enemiesRouter.get(
  "/groups/:groupId/enemies/:enemyId",
  requireAuth,
  requireGroupMember,
  getEnemyHandler,
);
enemiesRouter.patch(
  "/groups/:groupId/enemies/:enemyId",
  requireAuth,
  requireEnemyMaster,
  updateEnemyHandler,
);
enemiesRouter.patch(
  "/groups/:groupId/enemies/:enemyId/import-md",
  requireAuth,
  requireEnemyMaster,
  importEnemyMdHandler,
);
enemiesRouter.delete(
  "/groups/:groupId/enemies/:enemyId",
  requireAuth,
  requireEnemyMaster,
  deleteEnemyHandler,
);
enemiesRouter.post(
  "/groups/:groupId/enemies/:enemyId/images",
  requireAuth,
  requireEnemyMaster,
  raw({ type: "*/*", limit: "4mb" }),
  uploadEnemyImageHandler,
);
enemiesRouter.get(
  "/groups/:groupId/enemies/:enemyId/images",
  requireAuth,
  requireGroupMember,
  listEnemyImagesHandler,
);
enemiesRouter.delete(
  "/groups/:groupId/enemies/:enemyId/images/:assetId",
  requireAuth,
  requireEnemyMaster,
  deleteEnemyImageHandler,
);
