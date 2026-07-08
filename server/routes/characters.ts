import { Router } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { requireGroupMaster } from "../middlewares/groupAuth";
import { requireCharacterMaster, requireCharacterMasterOrOwner } from "../middlewares/characterAuth";
import {
  changePortraitHandler,
  importCharacterHandler,
  importCharacterMdHandler,
  reassignOwnerHandler,
} from "../controllers/characterController";

export const charactersRouter = Router();

charactersRouter.post(
  "/groups/:groupId/characters/import",
  requireAuth,
  requireGroupMaster,
  importCharacterHandler,
);
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
