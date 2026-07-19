import { useState } from "react";
import { Link, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLogout } from "../features/auth/hooks";
import {
  AmbientPlayerProvider,
  useAmbientPlayerContext,
} from "../features/music/AmbientPlayerContext";
import { ChatDockPanel } from "../features/chat/ChatDockPanel";
import { MiniPlayerBar } from "./music/MiniPlayerBar";
import { TempQueueLauncher } from "./music/TempQueueLauncher";
import { BrandMark } from "./ui/BrandMark";
import { Button } from "./ui/Button";
import { ThemeToggle } from "./ui/ThemeToggle";

type MobileSheet = "chat" | "queue" | null;

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
  // propiedad de un objeto que contenga un ref como sospechoso.
  const { containerRef } = player;
  // En móvil, el chat y la cola de reproducción son hojas a pantalla
  // completa: abrir una cierra la otra sola, para que nunca queden las dos
  // "abiertas" a la vez tapándose entre sí sin más salida que adivinar cuál
  // backdrop hay que tocar.
  const [activeMobileSheet, setActiveMobileSheet] = useState<MobileSheet>(null);
  // Ancho real del panel de chat, para reservarle hueco con padding-right.
  // Estado de React (no una variable CSS mutada a mano vía JS) a propósito:
  // en este entorno, un `transition` sobre una propiedad cuyo valor viene de
  // una custom property tocada con `style.setProperty()` se queda pillado en
  // el valor inicial y nunca llega a animar (mismo fallo de fondo que el que
  // obligó a cambiar `translate-x-*` por `transform:translateX()` en las
  // demás animaciones de esta pasada) — con estado de React, el valor nuevo
  // llega como un re-render normal y la transición sí interpola.
  const [chatDockWidth, setChatDockWidth] = useState(0);

  return (
    <div className="min-h-screen bg-parchment text-ink">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-rule bg-parchment-panel px-6 py-4">
        <nav className="flex flex-wrap items-center gap-5">
          <Link
            to="/"
            className="flex items-center gap-2 font-display text-lg tracking-wide text-oxblood"
          >
            <BrandMark />
            D&D Manager
          </Link>
          <Link to="/groups" className="text-ink hover:underline">
            Grupos
          </Link>
          <Link to="/characters" className="text-ink hover:underline">
            Mis personajes
          </Link>
        </nav>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-ink-muted">{user?.username}</span>
          <ThemeToggle />
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

      {/* padding-bottom = altura real de la mini-barra (0 si no suena nada,
          ver --player-bar-height en MiniPlayerBar) + un margen fijo.
          padding-right = ancho real del panel de chat en escritorio (0 si
          está colapsado/cerrado o no aplica) — sin esto, el panel fijo a la
          derecha se montaba encima del contenido de la página en vez de
          dejarle hueco (más visible en el mapa, cuyo lienzo y controles de
          zoom llegan hasta el borde derecho). La transición es a propósito:
          mismos 200ms que la propia animación de deslizado del panel (ver
          ChatDockPanel), para que el contenido se desplace en el mismo
          tiempo que tarda el chat en abrirse/cerrarse, no de golpe. Animar
          padding SÍ provoca layout/reflow (no es gratis como transform),
          pero aquí es intencional: necesitamos que el contenido de la
          página reserve hueco de verdad, no solo desplazar un elemento
          visualmente — y solo ocurre en la acción puntual de abrir/cerrar
          el chat, no en bucle. */}
      <div
        style={{
          paddingBottom: "calc(var(--player-bar-height, 0px) + 1rem)",
          paddingRight: `${chatDockWidth}px`,
          transition: "padding-right 200ms ease-out",
        }}
      >
        <Outlet />
      </div>

      <MiniPlayerBar />
      <TempQueueLauncher
        mobileOpen={activeMobileSheet === "queue"}
        onMobileOpenChange={(open) => setActiveMobileSheet(open ? "queue" : null)}
      />
      <ChatDockPanel
        mobileOpen={activeMobileSheet === "chat"}
        onMobileOpenChange={(open) => setActiveMobileSheet(open ? "chat" : null)}
        onDockWidthChange={setChatDockWidth}
      />
    </div>
  );
}
