import { Link, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLogout } from "../features/auth/hooks";
import {
  AmbientPlayerProvider,
  useAmbientPlayerContext,
} from "../features/music/AmbientPlayerContext";
import { MiniPlayerBar } from "./music/MiniPlayerBar";
import { TempQueueLauncher } from "./music/TempQueueLauncher";
import { Button } from "./ui/Button";

export function AppLayout() {
  return (
    <AmbientPlayerProvider>
      <AppLayoutContent />
    </AmbientPlayerProvider>
  );
}

function AppLayoutContent() {
  const { user } = useAuth();
  const logout = useLogout();
  const player = useAmbientPlayerContext();
  // Desestructurado a parte: el objeto `player` incluye `containerRef` (un
  // ref real) en su forma, y el analizador de `react-hooks/refs` (ESLint
  // 10 / eslint-plugin-react-hooks 7) trata cualquier acceso a una
  // propiedad de un objeto que contenga un ref como sospechoso, aunque la
  // propiedad leída (`currentTrack`) no sea un ref en sí.
  const { currentTrack, containerRef } = player;

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

      {/*
        Player oculto: solo audio, sin vídeo visible. `display:none` hace que
        el widget de YouTube no llegue a crear el iframe (necesita un
        contenedor con layout real) — por eso va 1x1px con opacity 0 en vez
        de `hidden`. Vive aquí (no en GroupMusicPage) para que sobreviva a la
        navegación entre páginas y nunca esté detrás de un `return` de
        loading — si lo estuviera, containerRef.current se quedaría en null
        para siempre en el montaje del hook (bug ya visto una vez).
      */}
      <div
        ref={containerRef}
        className="pointer-events-none fixed left-0 top-0 h-px w-px overflow-hidden opacity-0"
        aria-hidden="true"
      />

      <div className={currentTrack ? "pb-32" : undefined}>
        <Outlet />
      </div>

      <MiniPlayerBar />
      <TempQueueLauncher />
    </div>
  );
}
