import { useState } from "react";
import { useAmbientPlayerContext } from "../../features/music/AmbientPlayerContext";
import { TempQueuePanel } from "./TempQueuePanel";

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

/**
 * Punto de entrada a la cola "Reproducir después": en escritorio, una
 * pestaña fija al borde derecho que despliega un panel lateral; en móvil,
 * un botón flotante (FAB) que abre una hoja desde abajo. Solo se muestra en
 * el sitio (fuera de la página de música) cuando la cola tiene algo, para no
 * añadir ruido visual en el resto de la app.
 */
export function TempQueueLauncher() {
  const player = useAmbientPlayerContext();
  const [open, setOpen] = useState(false);

  if (player.tempQueue.length === 0 && !open) return null;

  const hasMiniPlayer = !!player.currentTrack;
  const count = player.tempQueue.length;

  return (
    <>
      {/* Escritorio: pestaña + panel lateral */}
      <div className="hidden sm:block">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label="Reproducir después"
          aria-expanded={open}
          className="fixed right-0 top-1/2 z-30 flex -translate-y-1/2 flex-col items-center gap-1 rounded-l-sm border border-r-0 border-rule bg-parchment-panel px-2 py-3 text-ink-muted shadow-[0_2px_10px_-2px_rgba(0,0,0,0.2)] hover:text-oxblood"
        >
          <QueueIcon />
          {count > 0 && (
            <span className="rounded-full bg-oxblood-dark px-1.5 text-[0.65rem] font-semibold text-parchment">
              {count}
            </span>
          )}
        </button>
        <div
          className={`fixed right-0 top-0 z-40 h-full w-80 max-w-[85vw] border-l border-rule bg-parchment-panel shadow-[-4px_0_16px_-4px_rgba(0,0,0,0.25)] transition-transform duration-200 ${
            open ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div
            className={`flex h-full flex-col overflow-y-auto p-4 ${hasMiniPlayer ? "pb-28" : ""}`}
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-sm tracking-wide text-oxblood">
                Reproducir después
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Cerrar"
                className="text-ink-muted hover:text-oxblood"
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
          onClick={() => setOpen(true)}
          aria-label="Reproducir después"
          className={`fixed right-4 z-30 flex h-12 w-12 items-center justify-center rounded-full bg-oxblood text-parchment shadow-[0_4px_16px_-2px_rgba(0,0,0,0.4)] ${
            hasMiniPlayer ? "bottom-24" : "bottom-4"
          }`}
        >
          <QueueIcon className="h-5 w-5" />
          {count > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-oxblood-dark text-[0.65rem] font-bold text-parchment">
              {count}
            </span>
          )}
        </button>
        {open && (
          <div
            role="presentation"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 bg-ink/40"
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Reproducir después"
              onClick={(e) => e.stopPropagation()}
              className="absolute inset-x-0 bottom-0 max-h-[75vh] overflow-y-auto rounded-t-lg border-t border-rule bg-parchment-panel p-4"
            >
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-display text-sm tracking-wide text-oxblood">
                  Reproducir después
                </h2>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Cerrar"
                  className="text-ink-muted hover:text-oxblood"
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
