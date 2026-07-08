import type { RequestHandler } from "express";
import { getMembership } from "../services/authorization";
import { AppError } from "../errors/AppError";

export const requireGroupMember: RequestHandler = async (req, _res, next) => {
  try {
    const groupId = req.params.id ?? req.params.groupId!;
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
    const groupId = req.params.id ?? req.params.groupId!;
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
