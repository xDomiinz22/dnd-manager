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
    const journal = await journalService.importGroupJournal(req.params.groupId!, input);
    res.status(201).json(journal);
  } catch (err) {
    next(err);
  }
};

export const getGroupJournalHandler: RequestHandler = async (req, res, next) => {
  try {
    const journal = await journalService.getGroupJournal(req.params.groupId!);
    res.json(journal);
  } catch (err) {
    next(err);
  }
};

export const createGroupJournalPageHandler: RequestHandler = async (req, res, next) => {
  try {
    const input = createJournalPageSchema.parse(req.body);
    const page = await journalService.createGroupJournalPage(req.params.groupId!, input);
    res.status(201).json(page);
  } catch (err) {
    next(err);
  }
};

export const updateGroupJournalPageHandler: RequestHandler = async (req, res, next) => {
  try {
    const input = updateJournalPageSchema.parse(req.body);
    const page = await journalService.updateGroupJournalPage(
      req.params.groupId!,
      req.params.pageId!,
      input,
    );
    res.json(page);
  } catch (err) {
    next(err);
  }
};

export const deleteGroupJournalPageHandler: RequestHandler = async (req, res, next) => {
  try {
    await journalService.deleteGroupJournalPage(req.params.groupId!, req.params.pageId!);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
};

export const getCharacterJournalHandler: RequestHandler = async (req, res, next) => {
  try {
    const journal = await journalService.getCharacterJournal(req.params.characterId!);
    res.json(journal);
  } catch (err) {
    next(err);
  }
};

export const createCharacterJournalPageHandler: RequestHandler = async (req, res, next) => {
  try {
    const input = createJournalPageSchema.parse(req.body);
    const page = await journalService.createCharacterJournalPage(req.params.characterId!, input);
    res.status(201).json(page);
  } catch (err) {
    next(err);
  }
};

export const updateCharacterJournalPageHandler: RequestHandler = async (req, res, next) => {
  try {
    const input = updateJournalPageSchema.parse(req.body);
    const page = await journalService.updateCharacterJournalPage(
      req.params.characterId!,
      req.params.pageId!,
      input,
    );
    res.json(page);
  } catch (err) {
    next(err);
  }
};

export const deleteCharacterJournalPageHandler: RequestHandler = async (req, res, next) => {
  try {
    await journalService.deleteCharacterJournalPage(req.params.characterId!, req.params.pageId!);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
};

export const getJournalPageHandler: RequestHandler = async (req, res, next) => {
  try {
    const page = await journalService.getJournalPage(req.params.id!, req.userId!);
    res.json(page);
  } catch (err) {
    next(err);
  }
};
