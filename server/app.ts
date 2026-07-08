import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { apiRouter } from "./routes";
import { errorHandler, notFoundHandler } from "./middlewares/errorHandler";

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: process.env.NODE_ENV === "production" ? false : true,
      credentials: true,
    }),
  );
  // Los .md de fichas Foundry rondan ~200 KB; 2mb da margen sin acercarse
  // al límite de ~4.5 MB del body en funciones serverless de Vercel.
  app.use(express.json({ limit: "2mb" }));
  app.use(cookieParser());

  app.use("/api", apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
