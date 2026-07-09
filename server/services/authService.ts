import type { User } from "@prisma/client";
import type { LoginInput, RegisterInput, UserProfile } from "@dnd-manager/shared";
import { prisma } from "../../lib/prisma";
import {
  hashPassword,
  signAccessToken,
  signRefreshToken,
  verifyGoogleIdToken,
  verifyPassword,
  verifyRefreshToken,
} from "../../lib/auth";
import { AppError } from "../errors/AppError";

const ACCENT_MARKS_RE = /[̀-ͯ]/g;
const NON_USERNAME_CHARS_RE = /[^a-zA-Z0-9_]/g;

/** Deriva un username válido (3-24 chars, alfanumérico+_) a partir del nombre o email de Google, resolviendo colisiones con un sufijo numérico. */
async function generateUniqueUsername(name: string | null, email: string): Promise<string> {
  const source = name ?? email.split("@")[0] ?? "user";
  let base = source
    .normalize("NFD")
    .replace(ACCENT_MARKS_RE, "") // "José" -> "Jose" antes de descartar el resto de símbolos
    .replace(NON_USERNAME_CHARS_RE, "")
    .slice(0, 20);
  if (base.length < 3) base = `user${base}`;

  let candidate = base;
  let suffix = 0;
  while (await prisma.user.findUnique({ where: { username: candidate } })) {
    suffix += 1;
    candidate = `${base}${suffix}`.slice(0, 24);
  }
  return candidate;
}

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

  if (!user.passwordHash) {
    throw new AppError(
      401,
      "GOOGLE_ACCOUNT",
      "Esta cuenta se registró con Google. Inicia sesión con Google.",
    );
  }

  const valid = await verifyPassword(user.passwordHash, input.password);
  if (!valid) throw new AppError(401, "INVALID_CREDENTIALS", "Email o contraseña incorrectos");

  return {
    accessToken: signAccessToken(user.id),
    refreshToken: signRefreshToken(user.id),
    user: toProfile(user),
  };
}

/**
 * Verifica el ID token de Google Identity Services y hace login o registro:
 * vincula por googleId si ya existe, si no por email (cuenta creada con
 * contraseña que ahora también entra con Google), y si tampoco hay email
 * coincidente crea una cuenta nueva sin contraseña.
 */
export async function googleLogin(idToken: string): Promise<TokenPair> {
  let profile;
  try {
    profile = await verifyGoogleIdToken(idToken);
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("Missing required env var")) {
      throw new AppError(
        503,
        "GOOGLE_AUTH_DISABLED",
        "Login con Google no está configurado en el servidor",
      );
    }
    throw new AppError(401, "INVALID_GOOGLE_TOKEN", "Token de Google inválido o expirado");
  }

  if (!profile.email) {
    throw new AppError(401, "INVALID_GOOGLE_TOKEN", "El token de Google no incluye un email");
  }

  let user = await prisma.user.findUnique({ where: { googleId: profile.googleId } });

  if (!user) {
    const existingByEmail = await prisma.user.findUnique({ where: { email: profile.email } });
    if (existingByEmail) {
      user = await prisma.user.update({
        where: { id: existingByEmail.id },
        data: {
          googleId: profile.googleId,
          avatarUrl: existingByEmail.avatarUrl ?? profile.picture,
        },
      });
    } else {
      const username = await generateUniqueUsername(profile.name, profile.email);
      user = await prisma.user.create({
        data: {
          email: profile.email,
          username,
          googleId: profile.googleId,
          avatarUrl: profile.picture,
        },
      });
    }
  }

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
