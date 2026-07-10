import { Router, raw } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { requireGroupMaster } from "../middlewares/groupAuth";
import {
  requireCharacterMaster,
  requireCharacterMasterOrOwner,
} from "../middlewares/characterAuth";
import {
  changePortraitHandler,
  deleteCharacterImageHandler,
  duplicateCharacterHandler,
  getCharacterViewHandler,
  importCharacterHandler,
  importCharacterMdHandler,
  listCharacterImagesHandler,
  listMyCharactersHandler,
  reassignOwnerHandler,
  updateHpHandler,
  uploadCharacterImageHandler,
} from "../controllers/characterController";

export const charactersRouter = Router();

charactersRouter.get("/me/characters", requireAuth, listMyCharactersHandler);

charactersRouter.post(
  "/groups/:groupId/characters/import",
  requireAuth,
  requireGroupMaster,
  importCharacterHandler,
);
charactersRouter.get("/characters/:id", requireAuth, getCharacterViewHandler);
charactersRouter.patch(
  "/characters/:id/import-md",
  requireAuth,
  requireCharacterMaster,
  importCharacterMdHandler,
);
charactersRouter.patch(
  "/characters/:id/owner",
  requireAuth,
  requireCharacterMaster,
  reassignOwnerHandler,
);
charactersRouter.patch(
  "/characters/:id/portrait",
  requireAuth,
  requireCharacterMasterOrOwner,
  changePortraitHandler,
);
charactersRouter.patch(
  "/characters/:id/hp",
  requireAuth,
  requireCharacterMasterOrOwner,
  updateHpHandler,
);
charactersRouter.post("/characters/:id/duplicate", requireAuth, duplicateCharacterHandler);

charactersRouter.post(
  "/characters/:id/images",
  requireAuth,
  requireCharacterMasterOrOwner,
  raw({ type: "*/*", limit: "4mb" }),
  uploadCharacterImageHandler,
);
charactersRouter.get(
  "/characters/:id/images",
  requireAuth,
  requireCharacterMasterOrOwner,
  listCharacterImagesHandler,
);
charactersRouter.delete(
  "/characters/:id/images/:assetId",
  requireAuth,
  requireCharacterMasterOrOwner,
  deleteCharacterImageHandler,
);
