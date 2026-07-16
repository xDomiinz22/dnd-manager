import { Router } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { requireGroupMaster, requireGroupMember } from "../middlewares/groupAuth";
import {
  endSessionHandler,
  getSessionHandler,
  listMessagesHandler,
  sendMessageHandler,
  startSessionHandler,
} from "../controllers/chatController";

export const chatRouter = Router();

chatRouter.get("/groups/:groupId/session", requireAuth, requireGroupMember, getSessionHandler);
chatRouter.post(
  "/groups/:groupId/session/start",
  requireAuth,
  requireGroupMaster,
  startSessionHandler,
);
chatRouter.post("/groups/:groupId/session/end", requireAuth, requireGroupMaster, endSessionHandler);
chatRouter.get(
  "/groups/:groupId/session/messages",
  requireAuth,
  requireGroupMember,
  listMessagesHandler,
);
chatRouter.post(
  "/groups/:groupId/session/messages",
  requireAuth,
  requireGroupMember,
  sendMessageHandler,
);
