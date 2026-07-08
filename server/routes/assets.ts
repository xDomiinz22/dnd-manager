import { Router, raw } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import {
  confirmAssetHandler,
  getUploadTokenHandler,
  listAssetsHandler,
  localUploadHandler,
} from "../controllers/assetController";

export const assetsRouter = Router();

assetsRouter.post("/assets/upload-token", requireAuth, getUploadTokenHandler);
assetsRouter.post("/assets/confirm", requireAuth, confirmAssetHandler);
assetsRouter.get("/assets", requireAuth, listAssetsHandler);
assetsRouter.put(
  "/assets/local-upload/*",
  requireAuth,
  raw({ type: "*/*", limit: "20mb" }),
  localUploadHandler,
);
