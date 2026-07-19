import { useEffect, useRef, useState } from "react";
import { useCloseOnOutsideClick } from "../../lib/useCloseOnOutsideClick";

interface MoveTrackMenuProps {
  playlists: { id: string; name: string }[];
  onSelect: (playlistId: string) => void;
  onCancel: () => void;
  isLoading?: boolean;
  className?: string;
}

/**
 * Menú flotante y compacto para mover un track a otra lista, anclado al
 * elemento que lo abre (debe vivir dentro de un contenedor `relative`).
 * Mismo lenguaje visual que `MiniConfirmPopover`. Se cierra al pulsar fuera
 * o con Escape.
 */
export function MoveTrackMenu({
  playlists,
  onSelect,
  onCancel,
  isLoading,
  className = "",
}: MoveTrackMenuProps) {
  const ref = useRef<HTMLDivElement>(null);
  useCloseOnOutsideClick(ref, onCancel);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-label="Mover a otra lista"
      className={`absolute right-0 top-full z-40 mt-1 w-max min-w-[160px] max-w-[240px] origin-top-right rounded-sm border border-rule bg-parchment-panel p-1 shadow-[0_4px_16px_-4px_rgba(0,0,0,0.3)] transition-[opacity,transform] duration-100 ${
        visible ? "scale-100 opacity-100" : "scale-95 opacity-0"
      } ${className}`}
    >
      <p className="px-2 py-1 text-[0.65rem] uppercase tracking-wide text-ink-muted">Mover a...</p>
      <ul>
        {playlists.map((playlist) => (
          <li key={playlist.id}>
            <button
              type="button"
              disabled={isLoading}
              onClick={() => onSelect(playlist.id)}
              className="block w-full truncate rounded-sm px-2 py-1.5 text-left text-sm text-ink hover:bg-parchment-deep/60 hover:text-ink disabled:opacity-50"
            >
              {playlist.name}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
