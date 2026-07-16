import { Router } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { requireGroupMember } from "../middlewares/groupAuth";
import { createGroupRollHandler, listGroupRollsHandler } from "../controllers/diceController";

export const diceRouter = Router();

diceRouter.get("/groups/:groupId/rolls", requireAuth, requireGroupMember, listGroupRollsHandler);
diceRouter.post("/groups/:groupId/rolls", requireAuth, requireGroupMember, createGroupRollHandler);
