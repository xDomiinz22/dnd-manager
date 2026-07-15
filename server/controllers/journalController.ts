import type { RequestHandler } from "express";
import {
  createJournalPageSchema,
  journalImportPayloadSchema,
  updateJournalPageSchema,
} from "@dnd-manager/shared";
import * as journalService from "../services/journalService";

export const importGroupJournalHandler: RequestHandler = async (req, res, next) => {
  try {
    const input = journalImportPayloadSchema.parse(req.body);
    const journal = await journalService.importGroupJournal(req.params.groupId as string, input);
    res.status(201).json(journal);
  } catch (err) {
    next(err);
  }
};

export const getGroupJournalHandler: RequestHandler = async (req, res, next) => {
  try {
    const journal = await journalService.getGroupJournal(req.params.groupId as string);
    res.json(journal);
  } catch (err) {
    next(err);
  }
};

export const createGroupJournalPageHandler: RequestHandler = async (req, res, next) => {
  try {
    const input = createJournalPageSchema.parse(req.body);
    const page = await journalService.createGroupJournalPage(req.params.groupId as string, input);
    res.status(201).json(page);
  } catch (err) {
    next(err);
  }
};

export const updateGroupJournalPageHandler: RequestHandler = async (req, res, next) => {
  try {
    const input = updateJournalPageSchema.parse(req.body);
    const page = await journalService.updateGroupJournalPage(
      req.params.groupId as string,
      req.params.pageId as string,
      input,
    );
    res.json(page);
  } catch (err) {
    next(err);
  }
};

export const deleteGroupJournalPageHandler: RequestHandler = async (req, res, next) => {
  try {
    await journalService.deleteGroupJournalPage(
      req.params.groupId as string,
      req.params.pageId as string,
    );
    res.status(204).end();
  } catch (err) {
    next(err);
  }
};

export const getCharacterJournalHandler: RequestHandler = async (req, res, next) => {
  try {
    const journal = await journalService.getCharacterJournal(req.params.characterId as string);
    res.json(journal);
  } catch (err) {
    next(err);
  }
};

export const createCharacterJournalPageHandler: RequestHandler = async (req, res, next) => {
  try {
    const input = createJournalPageSchema.parse(req.body);
    const page = await journalService.createCharacterJournalPage(
      req.params.characterId as string,
      input,
    );
    res.status(201).json(page);
  } catch (err) {
    next(err);
  }
};

export const updateCharacterJournalPageHandler: RequestHandler = async (req, res, next) => {
  try {
    const input = updateJournalPageSchema.parse(req.body);
    const page = await journalService.updateCharacterJournalPage(
      req.params.characterId as string,
      req.params.pageId as string,
      input,
    );
    res.json(page);
  } catch (err) {
    next(err);
  }
};

export const deleteCharacterJournalPageHandler: RequestHandler = async (req, res, next) => {
  try {
    await journalService.deleteCharacterJournalPage(
      req.params.characterId as string,
      req.params.pageId as string,
    );
    res.status(204).end();
  } catch (err) {
    next(err);
  }
};

export const getJournalPageHandler: RequestHandler = async (req, res, next) => {
  try {
    const page = await journalService.getJournalPage(req.params.id as string, req.userId!);
    res.json(page);
  } catch (err) {
    next(err);
  }
};
