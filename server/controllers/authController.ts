import type { Response, RequestHandler } from "express";
import type { AuthResponse, RefreshResponse } from "@dnd-manager/shared";
import { googleAuthSchema, loginSchema, registerSchema } from "@dnd-manager/shared";
import * as authService from "../services/authService";
import {
  REFRESH_COOKIE_NAME,
  clearRefreshCookieOptions,
  refreshCookieOptions,
} from "../../lib/auth";
import { AppError } from "../errors/AppError";

function sendAuthResponse(
  res: Response,
  tokens: { accessToken: string; refreshToken: string; user: AuthResponse["user"] },
) {
  res.cookie(REFRESH_COOKIE_NAME, tokens.refreshToken, refreshCookieOptions());
  const body: AuthResponse = { accessToken: tokens.accessToken, user: tokens.user };
  res.json(body);
}

export const registerHandler: RequestHandler = async (req, res, next) => {
  try {
    const input = registerSchema.parse(req.body);
    const tokens = await authService.register(input);
    sendAuthResponse(res, tokens);
  } catch (err) {
    next(err);
  }
};

export const loginHandler: RequestHandler = async (req, res, next) => {
  try {
    const input = loginSchema.parse(req.body);
    const tokens = await authService.login(input);
    sendAuthResponse(res, tokens);
  } catch (err) {
    next(err);
  }
};

export const googleHandler: RequestHandler = async (req, res, next) => {
  try {
    const input = googleAuthSchema.parse(req.body);
    const tokens = await authService.googleLogin(input.idToken);
    sendAuthResponse(res, tokens);
  } catch (err) {
    next(err);
  }
};

export const refreshHandler: RequestHandler = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
    if (!refreshToken) {
      throw new AppError(401, "INVALID_REFRESH_TOKEN", "No hay refresh token");
    }
    const tokens = await authService.refresh(refreshToken);
    res.cookie(REFRESH_COOKIE_NAME, tokens.refreshToken, refreshCookieOptions());
    const body: RefreshResponse = { accessToken: tokens.accessToken };
    res.json(body);
  } catch (err) {
    next(err);
  }
};

export const logoutHandler: RequestHandler = (_req, res) => {
  res.clearCookie(REFRESH_COOKIE_NAME, clearRefreshCookieOptions());
  res.status(204).end();
};
