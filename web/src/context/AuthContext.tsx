import { createContext, useContext, type ReactNode } from "react";
import type { UserProfile } from "@dnd-manager/shared";
import { useMe } from "../features/auth/hooks";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface AuthContextValue {
  status: AuthStatus;
  user: UserProfile | null;
}

const AuthContext = createContext<AuthContextValue>({ status: "loading", user: null });

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data, isPending } = useMe();
  const user = data ?? null;
  const status: AuthStatus = isPending ? "loading" : user ? "authenticated" : "unauthenticated";

  return <AuthContext.Provider value={{ status, user }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
