import { Link, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLogout } from "../features/auth/hooks";
import { Button } from "./ui/Button";

export function AppLayout() {
  const { user } = useAuth();
  const logout = useLogout();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-6 py-4">
        <nav className="flex flex-wrap items-center gap-4">
          <Link to="/" className="font-semibold text-amber-400">
            D&D Manager
          </Link>
          <Link to="/groups" className="text-slate-300 hover:text-amber-400">
            Grupos
          </Link>
          <Link to="/characters" className="text-slate-300 hover:text-amber-400">
            Mis personajes
          </Link>
        </nav>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-slate-300">{user?.username}</span>
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
