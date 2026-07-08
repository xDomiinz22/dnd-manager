import type { AuthResponse, LoginInput, RegisterInput, UserProfile } from "@dnd-manager/shared";
import { apiFetch } from "../../lib/api";

export const authApi = {
  register: (input: RegisterInput) =>
    apiFetch<AuthResponse>("/auth/register", { method: "POST", body: JSON.stringify(input) }),
  login: (input: LoginInput) =>
    apiFetch<AuthResponse>("/auth/login", { method: "POST", body: JSON.stringify(input) }),
  logout: () => apiFetch<void>("/auth/logout", { method: "POST" }),
  me: () => apiFetch<UserProfile>("/me"),
};
