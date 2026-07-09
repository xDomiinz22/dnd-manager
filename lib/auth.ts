import argon2 from "argon2";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import type { CookieOptions } from "express";

const ACCESS_TOKEN_TTL = "15m";
const REFRESH_TOKEN_TTL = "7d";
const REFRESH_TOKEN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export const REFRESH_COOKIE_NAME = "refresh_token";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

export interface JwtPayload {
  sub: string;
}

export function hashPassword(password: string): Promise<string> {
  return argon2.hash(password);
}

export function verifyPassword(hash: string, password: string): Promise<boolean> {
  return argon2.verify(hash, password);
}

export function signAccessToken(userId: string): string {
  return jwt.sign({ sub: userId } satisfies JwtPayload, requireEnv("JWT_ACCESS_SECRET"), {
    expiresIn: ACCESS_TOKEN_TTL,
  });
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, requireEnv("JWT_ACCESS_SECRET")) as JwtPayload;
}

export function signRefreshToken(userId: string): string {
  return jwt.sign({ sub: userId } satisfies JwtPayload, requireEnv("JWT_REFRESH_SECRET"), {
    expiresIn: REFRESH_TOKEN_TTL,
  });
}

export function verifyRefreshToken(token: string): JwtPayload {
  return jwt.verify(token, requireEnv("JWT_REFRESH_SECRET")) as JwtPayload;
}

export interface GoogleProfile {
  googleId: string;
  email: string | null;
  name: string | null;
  picture: string | null;
}

const googleClient = new OAuth2Client();

/** `GOOGLE_CLIENT_ID` es el único secreto que hace falta: es la audience esperada del ID token (GSI ya firma el token en el navegador). */
export async function verifyGoogleIdToken(idToken: string): Promise<GoogleProfile> {
  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: requireEnv("GOOGLE_CLIENT_ID"),
  });
  const payload = ticket.getPayload();
  if (!payload) throw new Error("Google ID token sin payload");

  return {
    googleId: payload.sub,
    email: payload.email ?? null,
    name: payload.name ?? null,
    picture: payload.picture ?? null,
  };
}

export function refreshCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/auth",
    maxAge: REFRESH_TOKEN_MAX_AGE_MS,
  };
}

// Sin `maxAge`: si se incluyera, res.clearCookie recalcularía `expires` a
// partir de él y la cookie no se borraría realmente.
export function clearRefreshCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/auth",
  };
}
