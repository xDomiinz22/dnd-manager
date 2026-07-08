import { Router } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { requireGroupMember, requireGroupMaster } from "../middlewares/groupAuth";
import {
  createGroupHandler,
  getGroupDetailHandler,
  joinGroupHandler,
  listGroupsHandler,
  regenerateInviteCodeHandler,
  removeMemberHandler,
} from "../controllers/groupController";

export const groupsRouter = Router();

groupsRouter.post("/groups", requireAuth, createGroupHandler);
groupsRouter.get("/groups", requireAuth, listGroupsHandler);
groupsRouter.post("/groups/join", requireAuth, joinGroupHandler);
groupsRouter.get("/groups/:id", requireAuth, requireGroupMember, getGroupDetailHandler);
groupsRouter.post(
  "/groups/:id/regenerate-code",
  requireAuth,
  requireGroupMaster,
  regenerateInviteCodeHandler,
);
groupsRouter.delete(
  "/groups/:id/members/:userId",
  requireAuth,
  requireGroupMember,
  removeMemberHandler,
);
