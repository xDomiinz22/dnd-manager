import { DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { MusicTrack } from "@dnd-manager/shared";
import { useAmbientPlayerContext } from "../../features/music/AmbientPlayerContext";
import { SwipeableRow } from "../ui/SwipeableRow";
import { EmptyState } from "../ui/EmptyState";

function GripIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className} aria-hidden="true">
      <circle cx="7" cy="5" r="1.4" />
      <circle cx="13" cy="5" r="1.4" />
      <circle cx="7" cy="10" r="1.4" />
      <circle cx="13" cy="10" r="1.4" />
      <circle cx="7" cy="15" r="1.4" />
      <circle cx="13" cy="15" r="1.4" />
    </svg>
  );
}

function TempQueueRow({ track, canReorder }: { track: MusicTrack; canReorder: boolean }) {
  const player = useAmbientPlayerContext();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: track.id,
    disabled: !canReorder,
  });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <li ref={setNodeRef} style={style} className="overflow-hidden rounded-sm">
      <SwipeableRow
        onDelete={() => player.removeFromTempQueue(track.id)}
        deleteLabel={`Quitar ${track.title} de la cola`}
        contentClassName={`flex items-center justify-between gap-2 px-2 py-2 ${
          isDragging
            ? "z-10 bg-parchment-panel shadow-[0_4px_16px_-4px_rgba(0,0,0,0.3)]"
            : "bg-parchment-panel"
        }`}
      >
        {canReorder && (
          <button
            type="button"
            data-no-swipe
            aria-label={`Reordenar ${track.title}`}
            className="shrink-0 cursor-grab touch-none text-ink-muted hover:text-oxblood active:cursor-grabbing"
            {...attributes}
            {...listeners}
          >
            <GripIcon className="h-3.5 w-3.5" />
          </button>
        )}
        <span className="min-w-0 flex-1 truncate text-sm text-ink">{track.title}</span>
        <button
          type="button"
          data-no-swipe
          onClick={() => player.removeFromTempQueue(track.id)}
          aria-label={`Quitar ${track.title} de la cola`}
          className="shrink-0 text-ink-muted hover:text-oxblood"
        >
          ×
        </button>
      </SwipeableRow>
    </li>
  );
}

/**
 * Lista de canciones en la cola "Reproducir después" (puramente local a
 * este navegador, ver `AmbientPlayerContext`). Cada fila se puede quitar
 * deslizando de derecha a izquierda (revela un botón de borrar, igual que
 * en las listas normales) o con el botón "×", y reordenar arrastrando por
 * el asa — mismo patrón que las listas normales.
 */
export function TempQueuePanel() {
  const player = useAmbientPlayerContext();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const canReorder = player.tempQueue.length > 1;

  if (player.tempQueue.length === 0) {
    return (
      <EmptyState
        title="Sin canciones en cola."
        description="Desliza una canción de una lista hacia la derecha para añadirla aquí."
      />
    );
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const currentIds = player.tempQueue.map((t) => t.id);
    const oldIndex = currentIds.indexOf(active.id as string);
    const newIndex = currentIds.indexOf(over.id as string);
    if (oldIndex === -1 || newIndex === -1) return;
    player.reorderTempQueue(arrayMove(currentIds, oldIndex, newIndex));
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <SortableContext
        items={player.tempQueue.map((t) => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <ul className="space-y-1">
          {player.tempQueue.map((track) => (
            <TempQueueRow key={track.id} track={track} canReorder={canReorder} />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}
