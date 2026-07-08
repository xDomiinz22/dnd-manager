import { Link, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLogout } from "../features/auth/hooks";

export function AppLayout() {
  const { user } = useAuth();
  const logout = useLogout();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
        <nav className="flex items-center gap-4">
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
          <button
            type="button"
            onClick={() => logout.mutate()}
            disabled={logout.isPending}
            className="rounded border border-slate-700 px-3 py-1 text-slate-100 hover:bg-slate-800 disabled:opacity-50"
          >
            Salir
          </button>
        </div>
      </header>
      <Outlet />
    </div>
  );
}
