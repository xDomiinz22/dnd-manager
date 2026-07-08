import { Router } from "express";
import type { UserProfile } from "@dnd-manager/shared";
import { requireAuth } from "../middlewares/requireAuth";
import * as authService from "../services/authService";

export const meRouter = Router();

meRouter.get("/me", requireAuth, async (req, res, next) => {
  try {
    const profile: UserProfile = await authService.getProfile(req.userId!);
    res.json(profile);
  } catch (err) {
    next(err);
  }
});
