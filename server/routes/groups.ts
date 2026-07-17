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
  setDiceThemeHandler,
  setMemberMusicPermissionHandler,
  setMemberRoleHandler,
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
groupsRouter.patch(
  "/groups/:id/members/:userId/music-permission",
  requireAuth,
  requireGroupMaster,
  setMemberMusicPermissionHandler,
);
groupsRouter.patch(
  "/groups/:id/members/:userId/role",
  requireAuth,
  requireGroupMaster,
  setMemberRoleHandler,
);
groupsRouter.patch("/groups/:id/dice-theme", requireAuth, requireGroupMaster, setDiceThemeHandler);
