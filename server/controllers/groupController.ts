import type { RequestHandler } from "express";
import {
  createGroupSchema,
  joinGroupSchema,
  updateMemberMusicPermissionSchema,
  updateMemberRoleSchema,
} from "@dnd-manager/shared";
import * as groupService from "../services/groupService";
import { AppError } from "../errors/AppError";

export const createGroupHandler: RequestHandler = async (req, res, next) => {
  try {
    const input = createGroupSchema.parse(req.body);
    const group = await groupService.createGroup(req.userId!, input.name);
    res.status(201).json(group);
  } catch (err) {
    next(err);
  }
};

export const listGroupsHandler: RequestHandler = async (req, res, next) => {
  try {
    const groups = await groupService.listGroupsForUser(req.userId!);
    res.json(groups);
  } catch (err) {
    next(err);
  }
};

export const getGroupDetailHandler: RequestHandler = async (req, res, next) => {
  try {
    const group = await groupService.getGroupDetail(req.userId!, req.params.id as string);
    res.json(group);
  } catch (err) {
    next(err);
  }
};

export const joinGroupHandler: RequestHandler = async (req, res, next) => {
  try {
    const input = joinGroupSchema.parse(req.body);
    const group = await groupService.joinGroup(req.userId!, input.inviteCode);
    res.json(group);
  } catch (err) {
    next(err);
  }
};

export const regenerateInviteCodeHandler: RequestHandler = async (req, res, next) => {
  try {
    const inviteCode = await groupService.regenerateInviteCode(req.params.id as string);
    res.json({ inviteCode });
  } catch (err) {
    next(err);
  }
};

export const removeMemberHandler: RequestHandler = async (req, res, next) => {
  try {
    const membership = req.groupMembership;
    if (!membership) throw new AppError(500, "INTERNAL_ERROR", "Missing group membership context");
    await groupService.removeMember(
      req.params.id as string,
      req.params.userId as string,
      req.userId!,
      membership.role,
    );
    res.status(204).end();
  } catch (err) {
    next(err);
  }
};

export const setMemberMusicPermissionHandler: RequestHandler = async (req, res, next) => {
  try {
    const input = updateMemberMusicPermissionSchema.parse(req.body);
    await groupService.setMemberMusicPermission(
      req.params.id as string,
      req.params.userId as string,
      input.canEditMusic,
    );
    res.status(204).end();
  } catch (err) {
    next(err);
  }
};

export const setMemberRoleHandler: RequestHandler = async (req, res, next) => {
  try {
    const input = updateMemberRoleSchema.parse(req.body);
    await groupService.setMemberRole(
      req.params.id as string,
      req.params.userId as string,
      input.role,
    );
    res.status(204).end();
  } catch (err) {
    next(err);
  }
};
