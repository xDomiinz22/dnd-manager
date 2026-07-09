import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email("Email no válido"),
  username: z
    .string()
    .trim()
    .min(3, "Mínimo 3 caracteres")
    .max(24, "Máximo 24 caracteres")
    .regex(/^[a-zA-Z0-9_]+$/, "Solo letras, números y guion bajo"),
  password: z.string().min(8, "Mínimo 8 caracteres").max(200),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Email no válido"),
  password: z.string().min(1, "La contraseña es obligatoria"),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const googleAuthSchema = z.object({
  idToken: z.string().min(1, "Falta el token de Google"),
});
export type GoogleAuthInput = z.infer<typeof googleAuthSchema>;

export const userProfileSchema = z.object({
  id: z.string(),
  email: z.string(),
  username: z.string(),
  avatarUrl: z.string().nullable(),
});
export type UserProfile = z.infer<typeof userProfileSchema>;

export const authResponseSchema = z.object({
  accessToken: z.string(),
  user: userProfileSchema,
});
export type AuthResponse = z.infer<typeof authResponseSchema>;

export const refreshResponseSchema = z.object({
  accessToken: z.string(),
});
export type RefreshResponse = z.infer<typeof refreshResponseSchema>;
