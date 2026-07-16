import type { RequestHandler } from "express";
import { sendChatMessageSchema } from "@dnd-manager/shared";
import * as chatService from "../services/chatService";

export const getSessionHandler: RequestHandler = async (req, res, next) => {
  try {
    const session = await chatService.getActiveSession(req.params.groupId as string);
    res.json(session);
  } catch (err) {
    next(err);
  }
};

export const startSessionHandler: RequestHandler = async (req, res, next) => {
  try {
    const session = await chatService.startSession(req.params.groupId as string, req.userId!);
    res.status(201).json(session);
  } catch (err) {
    next(err);
  }
};

export const endSessionHandler: RequestHandler = async (req, res, next) => {
  try {
    await chatService.endSession(req.params.groupId as string);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

export const listMessagesHandler: RequestHandler = async (req, res, next) => {
  try {
    const messages = await chatService.listMessages(req.params.groupId as string);
    res.json(messages);
  } catch (err) {
    next(err);
  }
};

export const sendMessageHandler: RequestHandler = async (req, res, next) => {
  try {
    const input = sendChatMessageSchema.parse(req.body);
    const message = await chatService.sendTextMessage(
      req.params.groupId as string,
      req.userId!,
      input.text,
    );
    res.status(201).json(message);
  } catch (err) {
    next(err);
  }
};
