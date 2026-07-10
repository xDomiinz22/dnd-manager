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
  // Los .md de fichas Foundry rondan ~200 KB, pero el import de journal manda
  // el texto de TODAS las páginas del vault en un solo POST; 4mb da margen
  // para vaults grandes sin acercarse al límite de ~4.5 MB del body en
  // funciones serverless de Vercel (ese sí es un límite duro de la plataforma).
  app.use(express.json({ limit: "4mb" }));
  app.use(cookieParser());

  app.use("/api", apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
