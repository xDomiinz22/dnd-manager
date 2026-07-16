import { Router } from "express";
import { healthRouter } from "./health";
import { authRouter } from "./auth";
import { meRouter } from "./me";
import { groupsRouter } from "./groups";
import { assetsRouter } from "./assets";
import { charactersRouter } from "./characters";
import { journalRouter } from "./journal";
import { musicRouter } from "./music";
import { mapRouter } from "./map";
import { diceRouter } from "./dice";
import { chatRouter } from "./chat";

export const apiRouter = Router();

apiRouter.use(healthRouter);
apiRouter.use(authRouter);
apiRouter.use(meRouter);
apiRouter.use(groupsRouter);
apiRouter.use(assetsRouter);
apiRouter.use(charactersRouter);
apiRouter.use(journalRouter);
apiRouter.use(musicRouter);
apiRouter.use(mapRouter);
apiRouter.use(diceRouter);
apiRouter.use(chatRouter);
