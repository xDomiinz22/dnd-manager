import type { RequestHandler } from "express";
import { verifyAccessToken } from "../../lib/auth";
import { AppError } from "../errors/AppError";

export const requireAuth: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : null;

  if (!token) {
    next(new AppError(401, "UNAUTHORIZED", "Missing access token"));
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    req.userId = payload.sub;
    next();
  } catch {
    next(new AppError(401, "UNAUTHORIZED", "Invalid or expired access token"));
  }
};
