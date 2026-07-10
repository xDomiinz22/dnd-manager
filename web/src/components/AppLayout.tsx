import { Link, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLogout } from "../features/auth/hooks";
import { Button } from "./ui/Button";

export function AppLayout() {
  const { user } = useAuth();
  const logout = useLogout();

  return (
    <div className="min-h-screen bg-parchment text-ink">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-rule bg-parchment-panel px-6 py-4">
        <nav className="flex flex-wrap items-center gap-5">
          <Link to="/" className="font-display text-lg tracking-wide text-oxblood">
            D&D Manager
          </Link>
          <Link to="/groups" className="text-ink hover:text-oxblood">
            Grupos
          </Link>
          <Link to="/characters" className="text-ink hover:text-oxblood">
            Mis personajes
          </Link>
        </nav>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-ink-muted">{user?.username}</span>
          <Button
            variant="secondary"
            onClick={() => logout.mutate()}
            isLoading={logout.isPending}
            loadingText="Saliendo..."
          >
            Salir
          </Button>
        </div>
      </header>
      <Outlet />
    </div>
  );
}
