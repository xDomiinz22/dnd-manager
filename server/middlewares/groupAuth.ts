import type { RequestHandler } from "express";
import { getMembership } from "../services/authorization";
import { AppError } from "../errors/AppError";

export const requireGroupMember: RequestHandler = async (req, _res, next) => {
  try {
    const groupId = (req.params.id ?? req.params.groupId) as string;
    const membership = await getMembership(groupId, req.userId!);
    if (!membership) {
      throw new AppError(403, "NOT_GROUP_MEMBER", "No perteneces a este grupo");
    }
    req.groupMembership = membership;
    next();
  } catch (err) {
    next(err);
  }
};

export const requireGroupMaster: RequestHandler = async (req, _res, next) => {
  try {
    const groupId = (req.params.id ?? req.params.groupId) as string;
    const membership = await getMembership(groupId, req.userId!);
    if (!membership) {
      throw new AppError(403, "NOT_GROUP_MEMBER", "No perteneces a este grupo");
    }
    if (membership.role !== "MASTER") {
      throw new AppError(403, "NOT_GROUP_MASTER", "Solo el Master puede hacer esto");
    }
    req.groupMembership = membership;
    next();
  } catch (err) {
    next(err);
  }
};

/** Master siempre puede gestionar la música del grupo; un jugador solo si tiene `canEditMusic`. */
export const requireGroupMusicEdit: RequestHandler = async (req, _res, next) => {
  try {
    const groupId = (req.params.id ?? req.params.groupId) as string;
    const membership = await getMembership(groupId, req.userId!);
    if (!membership) {
      throw new AppError(403, "NOT_GROUP_MEMBER", "No perteneces a este grupo");
    }
    if (membership.role !== "MASTER" && !membership.canEditMusic) {
      throw new AppError(
        403,
        "NOT_ALLOWED",
        "No tienes permiso para gestionar la música de este grupo",
      );
    }
    req.groupMembership = membership;
    next();
  } catch (err) {
    next(err);
  }
};
