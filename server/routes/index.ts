import { Router } from "express";
import { healthRouter } from "./health";
import { authRouter } from "./auth";
import { meRouter } from "./me";
import { groupsRouter } from "./groups";
import { assetsRouter } from "./assets";
import { charactersRouter } from "./characters";

export const apiRouter = Router();

apiRouter.use(healthRouter);
apiRouter.use(authRouter);
apiRouter.use(meRouter);
apiRouter.use(groupsRouter);
apiRouter.use(assetsRouter);
apiRouter.use(charactersRouter);
