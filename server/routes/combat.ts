import { Router } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { requireGroupMaster, requireGroupMember } from "../middlewares/groupAuth";
import {
  addParticipantsHandler,
  endCombatHandler,
  getCombatHandler,
  lockOrderHandler,
  nextTurnHandler,
  removeParticipantHandler,
  rollInitiativeHandler,
  startCombatHandler,
} from "../controllers/combatController";

export const combatRouter = Router();

combatRouter.get("/groups/:groupId/combat", requireAuth, requireGroupMember, getCombatHandler);
combatRouter.post("/groups/:groupId/combat", requireAuth, requireGroupMaster, startCombatHandler);
combatRouter.post(
  "/groups/:groupId/combat/roll-initiative",
  requireAuth,
  requireGroupMember,
  rollInitiativeHandler,
);
combatRouter.post(
  "/groups/:groupId/combat/lock-order",
  requireAuth,
  requireGroupMaster,
  lockOrderHandler,
);
combatRouter.post(
  "/groups/:groupId/combat/next-turn",
  requireAuth,
  requireGroupMaster,
  nextTurnHandler,
);
combatRouter.post(
  "/groups/:groupId/combat/participants",
  requireAuth,
  requireGroupMaster,
  addParticipantsHandler,
);
combatRouter.delete(
  "/groups/:groupId/combat/participants/:participantId",
  requireAuth,
  requireGroupMaster,
  removeParticipantHandler,
);
combatRouter.delete("/groups/:groupId/combat", requireAuth, requireGroupMaster, endCombatHandler);
