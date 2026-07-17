import { Router } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { requireGroupMember } from "../middlewares/groupAuth";
import { createGroupRollHandler } from "../controllers/diceController";

export const diceRouter = Router();

diceRouter.post("/groups/:groupId/rolls", requireAuth, requireGroupMember, createGroupRollHandler);
