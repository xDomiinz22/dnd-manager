import type { RequestHandler } from "express";
import { createRollSchema } from "@dnd-manager/shared";
import * as diceService from "../services/diceService";

export const listGroupRollsHandler: RequestHandler = async (req, res, next) => {
  try {
    const limit = Number(req.query.limit) || undefined;
    const rolls = await diceService.listGroupRolls(req.params.groupId as string, limit);
    res.json(rolls);
  } catch (err) {
    next(err);
  }
};

export const createGroupRollHandler: RequestHandler = async (req, res, next) => {
  try {
    const input = createRollSchema.parse(req.body);
    const roll = await diceService.createGroupRoll(
      req.params.groupId as string,
      req.userId!,
      input,
    );
    res.status(201).json(roll);
  } catch (err) {
    next(err);
  }
};
