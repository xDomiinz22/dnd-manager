import { Router, raw } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { getAssetRawHandler, listAssetsHandler, uploadAssetHandler } from "../controllers/assetController";

export const assetsRouter = Router();

// Subida en una sola petición: los bytes van en el body (Content-Type = mime real).
// Evita el patrón de dos fases (token + PUT + confirm) que no sobrevive entre
// invocaciones serverless distintas cuando no hay un storage externo de por medio.
assetsRouter.post("/assets", requireAuth, raw({ type: "*/*", limit: "4mb" }), uploadAssetHandler);
assetsRouter.get("/assets", requireAuth, listAssetsHandler);
// Pública (como sería una URL de Blob): así <img src> puede cargarla sin cabecera Authorization.
assetsRouter.get("/assets/:id/raw", getAssetRawHandler);
