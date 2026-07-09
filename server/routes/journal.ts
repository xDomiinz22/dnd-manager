import { Router } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { requireGroupMaster, requireGroupMember } from "../middlewares/groupAuth";
import { requireCharacterMasterOrOwner } from "../middlewares/characterAuth";
import {
  createCharacterJournalPageHandler,
  createGroupJournalPageHandler,
  deleteCharacterJournalPageHandler,
  deleteGroupJournalPageHandler,
  getCharacterJournalHandler,
  getGroupJournalHandler,
  getJournalPageHandler,
  importGroupJournalHandler,
  updateCharacterJournalPageHandler,
  updateGroupJournalPageHandler,
} from "../controllers/journalController";

export const journalRouter = Router();

// Diario de grupo: import destructivo solo Master; lectura y páginas abiertas a cualquier miembro.
journalRouter.post(
  "/groups/:groupId/journal/import",
  requireAuth,
  requireGroupMaster,
  importGroupJournalHandler,
);
journalRouter.get(
  "/groups/:groupId/journal",
  requireAuth,
  requireGroupMember,
  getGroupJournalHandler,
);
journalRouter.post(
  "/groups/:groupId/journal/pages",
  requireAuth,
  requireGroupMember,
  createGroupJournalPageHandler,
);
journalRouter.patch(
  "/groups/:groupId/journal/pages/:pageId",
  requireAuth,
  requireGroupMember,
  updateGroupJournalPageHandler,
);
journalRouter.delete(
  "/groups/:groupId/journal/pages/:pageId",
  requireAuth,
  requireGroupMember,
  deleteGroupJournalPageHandler,
);

// Diario personal: dueño del PJ o Master del grupo.
journalRouter.get(
  "/characters/:characterId/journal",
  requireAuth,
  requireCharacterMasterOrOwner,
  getCharacterJournalHandler,
);
journalRouter.post(
  "/characters/:characterId/journal/pages",
  requireAuth,
  requireCharacterMasterOrOwner,
  createCharacterJournalPageHandler,
);
journalRouter.patch(
  "/characters/:characterId/journal/pages/:pageId",
  requireAuth,
  requireCharacterMasterOrOwner,
  updateCharacterJournalPageHandler,
);
journalRouter.delete(
  "/characters/:characterId/journal/pages/:pageId",
  requireAuth,
  requireCharacterMasterOrOwner,
  deleteCharacterJournalPageHandler,
);

// Página individual (resuelve el permiso según el scope del journal al que pertenece).
journalRouter.get("/journal/pages/:id", requireAuth, getJournalPageHandler);
