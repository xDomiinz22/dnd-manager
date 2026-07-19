import { useState } from "react";
import { useAmbientPlayerContext } from "../../features/music/AmbientPlayerContext";
import { useCurrentGroupId } from "../../features/chat/useCurrentGroupId";
import { useMountTransition } from "../../lib/useMountTransition";
import { TempQueuePanel } from "./TempQueuePanel";

const SHEET_TRANSITION_MS = 200;

function QueueIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className={className}
    >
      <path d="M3 5h10M3 10h14M3 15h10" strokeLinecap="round" />
      <path d="M15 8v6M13 12l2 2 2-2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

interface TempQueueLauncherProps {
  /** Estado de la hoja móvil, controlado desde AppLayout: abrir esta cierra la del chat. */
  mobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
}

/**
 * Punto de entrada a la cola "Reproducir después": en escritorio, una
 * pestaña fija al borde derecho que despliega un panel lateral (estado
 * propio, sin conflicto con el chat); en móvil, un botón flotante (FAB) que
 * abre una hoja desde abajo — ese estado sí es compartido (ver AppLayout)
 * para que nunca coincida abierta con la del chat. Solo se muestra en el
 * sitio (fuera de la página de música) cuando la cola tiene algo, para no
 * añadir ruido visual en el resto de la app.
 */
export function TempQueueLauncher({ mobileOpen, onMobileOpenChange }: TempQueueLauncherProps) {
  const player = useAmbientPlayerContext();
  const groupId = useCurrentGroupId();
  const [desktopOpen, setDesktopOpen] = useState(false);
  const mobileSheet = useMountTransition(mobileOpen, SHEET_TRANSITION_MS);

  // `mobileSheet.shouldRender` se comprueba aparte de `mobileOpen`: si se
  // vacía la cola justo al cerrar la hoja móvil, este early return no debe
  // desmontarlo todo a media transición de salida.
  if (player.tempQueue.length === 0 && !desktopOpen && !mobileOpen && !mobileSheet.shouldRender) {
    return null;
  }

  const count = player.tempQueue.length;
  // El FAB del chat (ver ChatDockPanel) ocupa la esquina inferior derecha en
  // cualquier página de grupo: si va a estar ahí, este se apila encima en
  // vez de superponerse.
  const mobileBottom = groupId
    ? "calc(var(--player-bar-height, 0px) + 4.5rem)"
    : "calc(var(--player-bar-height, 0px) + 1rem)";

  return (
    <>
      {/* Escritorio: pestaña + panel lateral */}
      <div className="hidden sm:block">
        <button
          type="button"
          onClick={() => setDesktopOpen((v) => !v)}
          aria-label="Reproducir después"
          aria-expanded={desktopOpen}
          className="fixed right-0 top-1/2 z-30 flex -translate-y-1/2 flex-col items-center gap-1 rounded-l-sm border border-r-0 border-rule bg-parchment-panel px-2 py-3 text-ink-muted shadow-[0_2px_10px_-2px_rgba(0,0,0,0.2)] hover:bg-parchment-deep hover:text-ink"
        >
          <QueueIcon />
          {count > 0 && (
            <span className="rounded-full bg-oxblood-dark px-1.5 text-[0.65rem] font-semibold text-ivory">
              {count}
            </span>
          )}
        </button>
        <div
          className={`fixed right-0 top-0 z-40 h-full w-80 max-w-[85vw] border-l border-rule bg-parchment-panel shadow-[-4px_0_16px_-4px_rgba(0,0,0,0.25)] transition-transform duration-200 ${
            desktopOpen ? "[transform:translateX(0)]" : "[transform:translateX(100%)]"
          }`}
        >
          <div
            className="flex h-full flex-col overflow-y-auto p-4"
            style={{ paddingBottom: "calc(var(--player-bar-height, 0px) + 1rem)" }}
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-sm tracking-wide text-oxblood">
                Reproducir después
              </h2>
              <button
                type="button"
                onClick={() => setDesktopOpen(false)}
                aria-label="Cerrar"
                className="text-ink-muted hover:text-ink"
              >
                ×
              </button>
            </div>
            <TempQueuePanel />
          </div>
        </div>
      </div>

      {/* Móvil: FAB + hoja inferior */}
      <div className="sm:hidden">
        <button
          type="button"
          onClick={() => onMobileOpenChange(true)}
          aria-label="Reproducir después"
          style={{ bottom: mobileBottom }}
          className="fixed right-4 z-20 flex h-12 w-12 items-center justify-center rounded-full bg-oxblood text-ivory shadow-[0_4px_16px_-2px_rgba(0,0,0,0.4)]"
        >
          <QueueIcon className="h-5 w-5" />
          {count > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-oxblood-dark text-[0.65rem] font-bold text-ivory">
              {count}
            </span>
          )}
        </button>
        {mobileSheet.shouldRender && (
          <div
            role="presentation"
            onClick={() => onMobileOpenChange(false)}
            className={`fixed inset-0 z-40 bg-abyss/40 transition-opacity duration-200 ${
              mobileSheet.visible ? "opacity-100" : "opacity-0"
            }`}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Reproducir después"
              onClick={(e) => e.stopPropagation()}
              className={`absolute inset-x-0 bottom-0 max-h-[75vh] overflow-y-auto rounded-t-lg border-t border-rule bg-parchment-panel p-4 transition-transform duration-200 ${
                mobileSheet.visible ? "[transform:translateY(0)]" : "[transform:translateY(100%)]"
              }`}
            >
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-display text-sm tracking-wide text-oxblood">
                  Reproducir después
                </h2>
                <button
                  type="button"
                  onClick={() => onMobileOpenChange(false)}
                  aria-label="Cerrar"
                  className="text-ink-muted hover:text-ink"
                >
                  ×
                </button>
              </div>
              <TempQueuePanel />
            </div>
          </div>
        )}
      </div>
    </>
  );
}
