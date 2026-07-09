import type { RequestHandler } from "express";
import { getCharacterOrThrow } from "../services/characterService";
import { getMembership } from "../services/authorization";
import { AppError } from "../errors/AppError";

export const requireCharacterMaster: RequestHandler = async (req, _res, next) => {
  try {
    const character = await getCharacterOrThrow(req.params.id ?? req.params.characterId!);
    const membership = await getMembership(character.groupId, req.userId!);
    if (!membership || membership.role !== "MASTER") {
      throw new AppError(403, "NOT_GROUP_MASTER", "Solo el Master del grupo puede hacer esto");
    }
    req.character = character;
    next();
  } catch (err) {
    next(err);
  }
};

export const requireCharacterMasterOrOwner: RequestHandler = async (req, _res, next) => {
  try {
    const character = await getCharacterOrThrow(req.params.id ?? req.params.characterId!);
    if (character.ownerId === req.userId) {
      req.character = character;
      next();
      return;
    }
    const membership = await getMembership(character.groupId, req.userId!);
    if (!membership || membership.role !== "MASTER") {
      throw new AppError(
        403,
        "NOT_ALLOWED",
        "Solo el Master del grupo o el dueño del personaje pueden hacer esto",
      );
    }
    req.character = character;
    next();
  } catch (err) {
    next(err);
  }
};
