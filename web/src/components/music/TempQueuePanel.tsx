import { useAmbientPlayerContext } from "../../features/music/AmbientPlayerContext";
import { SwipeableRow } from "../ui/SwipeableRow";
import { EmptyState } from "../ui/EmptyState";

/**
 * Lista de canciones en la cola "Reproducir después" (puramente local a
 * este navegador, ver `AmbientPlayerContext`). Cada fila se puede quitar
 * deslizando de derecha a izquierda (revela un botón de borrar, igual que
 * en las listas normales) o con el botón "×" para quien no use gestos.
 */
export function TempQueuePanel() {
  const player = useAmbientPlayerContext();

  if (player.tempQueue.length === 0) {
    return (
      <EmptyState
        title="Sin canciones en cola."
        description="Desliza una canción de una lista hacia la derecha para añadirla aquí."
      />
    );
  }

  return (
    <ul className="space-y-1">
      {player.tempQueue.map((track) => (
        <li key={track.id} className="overflow-hidden rounded-sm">
          <SwipeableRow
            onDelete={() => player.removeFromTempQueue(track.id)}
            deleteLabel={`Quitar ${track.title} de la cola`}
            contentClassName="flex items-center justify-between gap-2 bg-parchment-panel px-2 py-2"
          >
            <span className="min-w-0 flex-1 truncate text-sm text-ink">{track.title}</span>
            <button
              type="button"
              onClick={() => player.removeFromTempQueue(track.id)}
              aria-label={`Quitar ${track.title} de la cola`}
              className="shrink-0 text-ink-muted hover:text-oxblood"
            >
              ×
            </button>
          </SwipeableRow>
        </li>
      ))}
    </ul>
  );
}
