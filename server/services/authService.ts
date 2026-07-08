import type { User } from "@prisma/client";
import type { LoginInput, RegisterInput, UserProfile } from "@dnd-manager/shared";
import { prisma } from "../../lib/prisma";
import {
  hashPassword,
  signAccessToken,
  signRefreshToken,
  verifyPassword,
  verifyRefreshToken,
} from "../../lib/auth";
import { AppError } from "../errors/AppError";

function toProfile(user: User): UserProfile {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    avatarUrl: user.avatarUrl,
  };
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
  user: UserProfile;
}

export async function register(input: RegisterInput): Promise<TokenPair> {
  const [emailTaken, usernameTaken] = await Promise.all([
    prisma.user.findUnique({ where: { email: input.email } }),
    prisma.user.findUnique({ where: { username: input.username } }),
  ]);

  if (emailTaken) throw new AppError(409, "EMAIL_TAKEN", "Ese email ya está registrado");
  if (usernameTaken) throw new AppError(409, "USERNAME_TAKEN", "Ese username ya está en uso");

  const passwordHash = await hashPassword(input.password);
  const user = await prisma.user.create({
    data: { email: input.email, username: input.username, passwordHash },
  });

  return {
    accessToken: signAccessToken(user.id),
    refreshToken: signRefreshToken(user.id),
    user: toProfile(user),
  };
}

export async function login(input: LoginInput): Promise<TokenPair> {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user) throw new AppError(401, "INVALID_CREDENTIALS", "Email o contraseña incorrectos");

  const valid = await verifyPassword(user.passwordHash, input.password);
  if (!valid) throw new AppError(401, "INVALID_CREDENTIALS", "Email o contraseña incorrectos");

  return {
    accessToken: signAccessToken(user.id),
    refreshToken: signRefreshToken(user.id),
    user: toProfile(user),
  };
}

export async function refresh(refreshToken: string): Promise<TokenPair> {
  let userId: string;
  try {
    userId = verifyRefreshToken(refreshToken).sub;
  } catch {
    throw new AppError(401, "INVALID_REFRESH_TOKEN", "Refresh token inválido o expirado");
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError(401, "INVALID_REFRESH_TOKEN", "Usuario no encontrado");

  return {
    accessToken: signAccessToken(user.id),
    refreshToken: signRefreshToken(user.id),
    user: toProfile(user),
  };
}

export async function getProfile(userId: string): Promise<UserProfile> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError(401, "UNAUTHORIZED", "Usuario no encontrado");
  return toProfile(user);
}
