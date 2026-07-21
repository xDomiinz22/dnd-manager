import type { RequestHandler } from "express";
import { addParticipantsSchema, rollInitiativeSchema } from "@dnd-manager/shared";
import * as combatService from "../services/combatService";

export const getCombatHandler: RequestHandler = async (req, res, next) => {
  try {
    const encounter = await combatService.getActiveCombat(req.params.groupId as string);
    res.json(encounter);
  } catch (err) {
    next(err);
  }
};

export const startCombatHandler: RequestHandler = async (req, res, next) => {
  try {
    const input = addParticipantsSchema.parse(req.body);
    const encounter = await combatService.startCombat(
      req.params.groupId as string,
      req.userId!,
      input,
    );
    res.status(201).json(encounter);
  } catch (err) {
    next(err);
  }
};

export const rollInitiativeHandler: RequestHandler = async (req, res, next) => {
  try {
    const input = rollInitiativeSchema.parse(req.body);
    const encounter = await combatService.rollInitiative(
      req.params.groupId as string,
      req.userId!,
      input,
    );
    res.json(encounter);
  } catch (err) {
    next(err);
  }
};

export const lockOrderHandler: RequestHandler = async (req, res, next) => {
  try {
    const encounter = await combatService.lockOrder(req.params.groupId as string, req.userId!);
    res.json(encounter);
  } catch (err) {
    next(err);
  }
};

export const nextTurnHandler: RequestHandler = async (req, res, next) => {
  try {
    const encounter = await combatService.advanceTurn(req.params.groupId as string, req.userId!);
    res.json(encounter);
  } catch (err) {
    next(err);
  }
};

export const addParticipantsHandler: RequestHandler = async (req, res, next) => {
  try {
    const input = addParticipantsSchema.parse(req.body);
    const encounter = await combatService.addParticipants(req.params.groupId as string, input);
    res.json(encounter);
  } catch (err) {
    next(err);
  }
};

export const removeParticipantHandler: RequestHandler = async (req, res, next) => {
  try {
    const encounter = await combatService.removeParticipant(
      req.params.groupId as string,
      req.params.participantId as string,
    );
    res.json(encounter);
  } catch (err) {
    next(err);
  }
};

export const endCombatHandler: RequestHandler = async (req, res, next) => {
  try {
    await combatService.endCombat(req.params.groupId as string, req.userId!);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
};
