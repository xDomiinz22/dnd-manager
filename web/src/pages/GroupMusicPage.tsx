import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  addTrackSchema,
  createPlaylistSchema,
  renamePlaylistSchema,
  updateTrackSchema,
  type AddTrackInput,
  type CreatePlaylistInput,
  type MusicPlaylist,
  type MusicTrack,
  type RenamePlaylistInput,
  type UpdateTrackInput,
} from "@dnd-manager/shared";
import { useAuth } from "../context/AuthContext";
import {
  useAddTrack,
  useCreatePlaylist,
  useDeletePlaylist,
  useDeleteTrack,
  useGroupMusic,
  useMoveTrack,
  useRenamePlaylist,
  useReorderTracks,
  useSetPlaylistOpenToAll,
  useUpdateTrack,
} from "../features/music/hooks";
import { useAmbientPlayerContext } from "../features/music/AmbientPlayerContext";
import { normalizeSearch } from "../lib/text";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { TextField } from "../components/ui/TextField";
import { EmptyState } from "../components/ui/EmptyState";
import { ChapterHeading } from "../components/ui/ChapterHeading";
import { MiniConfirmPopover } from "../components/ui/MiniConfirmPopover";
import { MoveTrackMenu } from "../components/ui/MoveTrackMenu";
import { SwipeableRow } from "../components/ui/SwipeableRow";
import { SkeletonPage } from "../components/ui/Skeleton";
import { PauseIcon, PlayIcon, ShuffleIcon } from "../components/ui/PlayerIcons";
import { toErrorMessage, useToast } from "../components/ui/Toast";

export function GroupMusicPage() {
  const { id: groupId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { data, isLoading, isError, error } = useGroupMusic(groupId!);
  const player = useAmbientPlayerContext();
  const [showNewPlaylist, setShowNewPlaylist] = useState(false);
  const [globalQuery, setGlobalQuery] = useState("");
  const normalizedGlobalQuery = normalizeSearch(globalQuery.trim());

  // Mantiene sincronizado el snapshot activo del reproductor si la lista que
  // suena ahora mismo es una de las de este grupo (p.ej. si alguien añade un
  // track mientras sigues viendo esta página).
  const syncRef = useRef(player.syncPlaylistIfActive);
  useEffect(() => {
    syncRef.current = player.syncPlaylistIfActive;
  });
  useEffect(() => {
    if (!data || player.groupId !== groupId) return;
    data.playlists.forEach((pl) => syncRef.current(pl));
  }, [data, groupId, player.groupId]);

  if (isLoading || !data) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-10">
        <SkeletonPage rows={4} />
      </div>
    );
  }
  if (isError) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-10 text-oxblood-dark">
        {(error as Error).message}
      </div>
    );
  }

  const isActiveHere = player.groupId === groupId && !!player.currentTrack;

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <Link
        to={`/groups/${groupId}`}
        className="mb-4 inline-block text-sm text-ink-muted hover:text-oxblood"
      >
        ← Volver al grupo
      </Link>
      <ChapterHeading
        action={
          data.canEdit && (
            <Button variant="ghost" onClick={() => setShowNewPlaylist((v) => !v)}>
              {showNewPlaylist ? "Cancelar" : "Nueva lista"}
            </Button>
          )
        }
      >
        Música ambiente
      </ChapterHeading>

      {showNewPlaylist && (
        <NewPlaylistForm groupId={groupId!} onDone={() => setShowNewPlaylist(false)} />
      )}

      {data.playlists.length === 0 ? (
        <EmptyState
          title="Sin listas de música todavía."
          description={data.canEdit ? "Crea una lista para empezar." : undefined}
        />
      ) : (
        <>
          <TextField
            label="Buscar canciones en todas las listas"
            hideLabel
            placeholder="Buscar canciones en todas las listas..."
            wrapperClassName="mb-4"
            value={globalQuery}
            onChange={(e) => setGlobalQuery(e.target.value)}
          />
          {(() => {
            const visiblePlaylists = normalizedGlobalQuery
              ? data.playlists.filter((playlist) =>
                  playlist.tracks.some((t) =>
                    normalizeSearch(t.title).includes(normalizedGlobalQuery),
                  ),
                )
              : data.playlists;
            if (visiblePlaylists.length === 0) {
              return <EmptyState title="Sin canciones que coincidan con la búsqueda." />;
            }
            return (
              <div className="space-y-4">
                {visiblePlaylists.map((playlist) => (
                  <PlaylistCard
                    key={playlist.id}
                    groupId={groupId!}
                    playlist={playlist}
                    allPlaylists={data.playlists}
                    canEdit={data.canEdit}
                    currentUserId={user?.id ?? null}
                    activeTrackId={isActiveHere ? player.currentTrack!.id : null}
                    isPlaying={player.isPlaying}
                    onPlayTrack={(trackId) => player.playFromPlaylist(groupId!, playlist, trackId)}
                    onTogglePlayPause={player.togglePlayPause}
                    onPlayShuffled={() => player.playFromPlaylistShuffled(groupId!, playlist)}
                    onAddToTempQueue={(track) => player.addToTempQueue(track, groupId!)}
                    globalQuery={normalizedGlobalQuery}
                  />
                ))}
              </div>
            );
          })()}
        </>
      )}
    </div>
  );
}

function PlaylistCard({
  groupId,
  playlist,
  allPlaylists,
  canEdit,
  currentUserId,
  activeTrackId,
  isPlaying,
  onPlayTrack,
  onTogglePlayPause,
  onPlayShuffled,
  onAddToTempQueue,
  globalQuery,
}: {
  groupId: string;
  playlist: MusicPlaylist;
  allPlaylists: MusicPlaylist[];
  canEdit: boolean;
  currentUserId: string | null;
  activeTrackId: string | null;
  isPlaying: boolean;
  onPlayTrack: (trackId: string) => void;
  onTogglePlayPause: () => void;
  onPlayShuffled: () => void;
  onAddToTempQueue: (track: MusicTrack) => void;
  /** Búsqueda general de la página, ya normalizada (minúsculas, sin acentos). */
  globalQuery: string;
}) {
  const [renaming, setRenaming] = useState(false);
  const [addingTrack, setAddingTrack] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [confirmingTrackId, setConfirmingTrackId] = useState<string | null>(null);
  const [editingTrackId, setEditingTrackId] = useState<string | null>(null);
  const [movingTrackId, setMovingTrackId] = useState<string | null>(null);
  const [localQuery, setLocalQuery] = useState("");
  const [dragOrderIds, setDragOrderIds] = useState<string[] | null>(null);
  const deletePlaylist = useDeletePlaylist(groupId);
  const deleteTrack = useDeleteTrack(groupId);
  const setOpenToAll = useSetPlaylistOpenToAll(groupId);
  const reorderTracks = useReorderTracks(groupId);
  const moveTrack = useMoveTrack(groupId);
  const toast = useToast();
  const otherPlaylists = allPlaylists
    .filter((p) => p.id !== playlist.id)
    .map((p) => ({ id: p.id, name: p.name }));
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  // El orden optimista se descarta en cuanto llega un snapshot nuevo del
  // servidor (tras el refetch de la propia mutación de reordenar, o tras
  // cualquier otro cambio ajeno a la lista). Ajustar el estado durante el
  // propio render (comparando contra el valor del render anterior) en vez
  // de en un `useEffect` — patrón recomendado por React para "resetear
  // estado cuando cambia una prop", evita el commit de más que supondría
  // un efecto (ver "Adjusting state based on a prop change" en la doc de
  // `useState`).
  const serverOrderKey = playlist.tracks.map((t) => t.id).join(",");
  const [prevServerOrderKey, setPrevServerOrderKey] = useState(serverOrderKey);
  if (serverOrderKey !== prevServerOrderKey) {
    setPrevServerOrderKey(serverOrderKey);
    setDragOrderIds(null);
  }

  const orderedTracks = dragOrderIds
    ? (dragOrderIds
        .map((id) => playlist.tracks.find((t) => t.id === id))
        .filter(Boolean) as MusicTrack[])
    : playlist.tracks;

  const normalizedLocalQuery = normalizeSearch(localQuery.trim());
  const visibleTracks = orderedTracks.filter((track) => {
    const title = normalizeSearch(track.title);
    if (globalQuery && !title.includes(globalQuery)) return false;
    if (normalizedLocalQuery && !title.includes(normalizedLocalQuery)) return false;
    return true;
  });
  // Arrastrar solo tiene sentido si se ve la lista completa sin filtrar —
  // reordenar un subconjunto visible dejaría ambiguo qué pasa con el resto.
  const canReorder =
    canEdit && visibleTracks.length === orderedTracks.length && orderedTracks.length > 1;

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const currentIds = orderedTracks.map((t) => t.id);
    const oldIndex = currentIds.indexOf(active.id as string);
    const newIndex = currentIds.indexOf(over.id as string);
    if (oldIndex === -1 || newIndex === -1) return;
    const nextIds = arrayMove(currentIds, oldIndex, newIndex);
    setDragOrderIds(nextIds);
    reorderTracks.mutate(
      { playlistId: playlist.id, input: { trackIds: nextIds } },
      {
        onError: (err) => {
          setDragOrderIds(null);
          toast.error(toErrorMessage(err, "No se pudo reordenar la lista."));
        },
      },
    );
  }

  function handleDeletePlaylist() {
    deletePlaylist.mutate(playlist.id, {
      onSuccess: () => toast.success("Lista borrada."),
      onError: (err) => toast.error(toErrorMessage(err, "No se pudo borrar la lista.")),
    });
  }

  function handleDeleteTrack(trackId: string) {
    deleteTrack.mutate(trackId, {
      onSuccess: () => setConfirmingTrackId(null),
      onError: (err) => toast.error(toErrorMessage(err, "No se pudo borrar el track.")),
    });
  }

  function handleMoveTrack(trackId: string, targetPlaylistId: string) {
    moveTrack.mutate(
      { trackId, input: { playlistId: targetPlaylistId } },
      {
        onSuccess: () => {
          toast.success("Track movido.");
          setMovingTrackId(null);
        },
        onError: (err) => toast.error(toErrorMessage(err, "No se pudo mover el track.")),
      },
    );
  }

  function handleAddToTempQueue(track: MusicTrack) {
    onAddToTempQueue(track);
    toast.success(`"${track.title}" añadido a Reproducir después.`);
  }

  function handleToggleOpenToAll(openToAll: boolean) {
    setOpenToAll.mutate(
      { playlistId: playlist.id, input: { openToAll } },
      {
        onError: (err) =>
          toast.error(toErrorMessage(err, "No se pudo cambiar el permiso de la lista.")),
      },
    );
  }

  return (
    <Card>
      <div className="mb-2 flex items-center justify-between gap-2">
        {renaming ? (
          <RenamePlaylistForm
            groupId={groupId}
            playlist={playlist}
            onDone={() => setRenaming(false)}
          />
        ) : (
          <>
            <h2 className="font-display text-sm tracking-wide text-oxblood">{playlist.name}</h2>
            <div className="flex shrink-0 items-center gap-2">
              {playlist.tracks.length > 0 && (
                <button
                  type="button"
                  onClick={onPlayShuffled}
                  aria-label={`Reproducir "${playlist.name}" en orden aleatorio`}
                  title="Reproducir en orden aleatorio"
                  className="flex h-7 w-7 items-center justify-center rounded-sm text-ink-muted transition-shadow hover:bg-parchment-deep/60 hover:text-oxblood"
                >
                  <ShuffleIcon className="h-4 w-4" />
                </button>
              )}
              {canEdit && (
                <>
                  <Button variant="ghost" onClick={() => setRenaming(true)}>
                    Renombrar
                  </Button>
                  <div className="relative">
                    <Button variant="danger" onClick={() => setConfirmingDelete((v) => !v)}>
                      Borrar
                    </Button>
                    {confirmingDelete && (
                      <MiniConfirmPopover
                        message={`¿Borrar "${playlist.name}" y todos sus tracks?`}
                        isLoading={deletePlaylist.isPending}
                        onConfirm={handleDeletePlaylist}
                        onCancel={() => setConfirmingDelete(false)}
                      />
                    )}
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>

      {canEdit && !renaming && (
        <label className="mb-2 flex items-center gap-2 text-xs text-ink-muted">
          <input
            type="checkbox"
            checked={playlist.openToAll}
            onChange={(e) => handleToggleOpenToAll(e.target.checked)}
            className="accent-oxblood"
          />
          Cualquiera puede añadir canciones
        </label>
      )}
      {!canEdit && playlist.openToAll && (
        <p className="mb-2 text-xs text-ink-muted">Lista abierta: cualquiera puede añadir.</p>
      )}

      {playlist.tracks.length > 0 && (
        <TextField
          label={`Buscar en "${playlist.name}"`}
          hideLabel
          placeholder="Buscar en esta lista..."
          wrapperClassName="mb-2"
          value={localQuery}
          onChange={(e) => setLocalQuery(e.target.value)}
        />
      )}

      {playlist.tracks.length === 0 ? (
        <p className="text-sm text-ink-muted">Sin tracks.</p>
      ) : visibleTracks.length === 0 ? (
        <p className="text-sm text-ink-muted">Sin resultados para la búsqueda.</p>
      ) : (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <SortableContext
            items={visibleTracks.map((t) => t.id)}
            strategy={verticalListSortingStrategy}
          >
            <ul className="space-y-1">
              {visibleTracks.map((track) => (
                <TrackRow
                  key={track.id}
                  groupId={groupId}
                  track={track}
                  isCurrent={track.id === activeTrackId}
                  isPlaying={isPlaying}
                  canDeleteThis={canEdit || track.addedByUserId === currentUserId}
                  canReorder={canReorder}
                  isEditing={editingTrackId === track.id}
                  onStartEdit={() => setEditingTrackId(track.id)}
                  onDoneEdit={() => setEditingTrackId(null)}
                  isConfirming={confirmingTrackId === track.id}
                  onToggleConfirm={() =>
                    setConfirmingTrackId(confirmingTrackId === track.id ? null : track.id)
                  }
                  onCancelConfirm={() => setConfirmingTrackId(null)}
                  onConfirmDelete={() => handleDeleteTrack(track.id)}
                  isDeleting={deleteTrack.isPending}
                  otherPlaylists={otherPlaylists}
                  isMoving={movingTrackId === track.id}
                  onToggleMove={() =>
                    setMovingTrackId(movingTrackId === track.id ? null : track.id)
                  }
                  onCancelMove={() => setMovingTrackId(null)}
                  onSelectMove={(targetPlaylistId) => handleMoveTrack(track.id, targetPlaylistId)}
                  isMoveLoading={moveTrack.isPending}
                  onPlayTrack={() => onPlayTrack(track.id)}
                  onTogglePlayPause={onTogglePlayPause}
                  onAddToTempQueue={() => handleAddToTempQueue(track)}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}

      {(canEdit || playlist.openToAll) &&
        (addingTrack ? (
          <AddTrackForm
            groupId={groupId}
            playlistId={playlist.id}
            onDone={() => setAddingTrack(false)}
          />
        ) : (
          <Button variant="ghost" className="mt-2" onClick={() => setAddingTrack(true)}>
            + Añadir track
          </Button>
        ))}
    </Card>
  );
}

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

function TrackRow({
  groupId,
  track,
  isCurrent,
  isPlaying,
  canDeleteThis,
  canReorder,
  isEditing,
  onStartEdit,
  onDoneEdit,
  isConfirming,
  onToggleConfirm,
  onCancelConfirm,
  onConfirmDelete,
  isDeleting,
  otherPlaylists,
  isMoving,
  onToggleMove,
  onCancelMove,
  onSelectMove,
  isMoveLoading,
  onPlayTrack,
  onTogglePlayPause,
  onAddToTempQueue,
}: {
  groupId: string;
  track: MusicTrack;
  isCurrent: boolean;
  isPlaying: boolean;
  canDeleteThis: boolean;
  canReorder: boolean;
  isEditing: boolean;
  onStartEdit: () => void;
  onDoneEdit: () => void;
  isConfirming: boolean;
  onToggleConfirm: () => void;
  onCancelConfirm: () => void;
  onConfirmDelete: () => void;
  isDeleting: boolean;
  otherPlaylists: { id: string; name: string }[];
  isMoving: boolean;
  onToggleMove: () => void;
  onCancelMove: () => void;
  onSelectMove: (playlistId: string) => void;
  isMoveLoading: boolean;
  onPlayTrack: () => void;
  onTogglePlayPause: () => void;
  /** Deslizar de izquierda a derecha: añadir a la cola "Reproducir después". */
  onAddToTempQueue: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: track.id,
    disabled: !canReorder,
  });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <li ref={setNodeRef} style={style} className="overflow-hidden rounded-sm">
      {isEditing ? (
        <div className="px-2 py-1">
          <EditTrackForm groupId={groupId} track={track} onDone={onDoneEdit} />
        </div>
      ) : (
        <SwipeableRow
          onSwipeRight={onAddToTempQueue}
          onDelete={canDeleteThis ? onConfirmDelete : undefined}
          // Fondos siempre OPACOS a propósito (nunca `/NN` de opacidad): esta
          // fila se desliza por encima de los "bolsillos" de borrar/añadir de
          // `SwipeableRow` — un fondo translúcido deja que se transparenten
          // en reposo (bug real reportado: el cubo de borrar se veía con solo
          // pasar el ratón por encima, porque el hover anterior usaba
          // `bg-parchment-deep/40`). Los tonos de abajo son el resultado ya
          // mezclado (mismo aspecto visual que antes, pero sólido).
          contentClassName={`flex items-center justify-between gap-2 px-2 py-1 ${
            isDragging
              ? "z-10 bg-parchment-panel shadow-[0_4px_16px_-4px_rgba(0,0,0,0.3)]"
              : isCurrent
                ? "bg-[#d8c099] shadow-[inset_0_0_0_1px_rgba(107,22,32,0.35)]"
                : "bg-parchment-panel hover:bg-[#dfcb9b]"
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
          <button
            type="button"
            onClick={() => (isCurrent ? onTogglePlayPause() : onPlayTrack())}
            className={`flex min-w-0 flex-1 items-center gap-2 text-left text-sm ${
              isCurrent ? "text-oxblood" : "text-ink"
            }`}
          >
            {isCurrent ? (
              isPlaying ? (
                <PauseIcon className="h-3.5 w-3.5 shrink-0" />
              ) : (
                <PlayIcon className="h-3.5 w-3.5 shrink-0" />
              )
            ) : (
              <PlayIcon className="h-3.5 w-3.5 shrink-0 text-ink-muted" />
            )}
            <span className="min-w-0 flex-1 truncate">
              {track.title}
              {track.addedByUsername && (
                <span className="text-ink-muted"> · {track.addedByUsername}</span>
              )}
            </span>
          </button>
          <div className="flex shrink-0 items-center gap-3">
            {canDeleteThis && (
              <button
                type="button"
                data-no-swipe
                onClick={onStartEdit}
                aria-label={`Editar ${track.title}`}
                className="text-xs text-ink-muted hover:text-oxblood"
              >
                Editar
              </button>
            )}
            {canDeleteThis && otherPlaylists.length > 0 && (
              <div className="relative" data-no-swipe>
                <button
                  type="button"
                  onClick={onToggleMove}
                  aria-label={`Mover ${track.title} a otra lista`}
                  className="text-xs text-ink-muted hover:text-oxblood"
                >
                  Mover
                </button>
                {isMoving && (
                  <MoveTrackMenu
                    playlists={otherPlaylists}
                    isLoading={isMoveLoading}
                    onSelect={onSelectMove}
                    onCancel={onCancelMove}
                  />
                )}
              </div>
            )}
            {canDeleteThis && (
              <div className="relative" data-no-swipe>
                <button
                  type="button"
                  onClick={onToggleConfirm}
                  aria-label={`Borrar ${track.title}`}
                  className="flex h-6 w-6 items-center justify-center rounded-sm text-base leading-none text-ink-muted hover:bg-parchment-deep/60 hover:text-oxblood"
                >
                  ×
                </button>
                {isConfirming && (
                  <MiniConfirmPopover
                    message={`¿Borrar "${track.title}"?`}
                    isLoading={isDeleting}
                    onConfirm={onConfirmDelete}
                    onCancel={onCancelConfirm}
                  />
                )}
              </div>
            )}
          </div>
        </SwipeableRow>
      )}
    </li>
  );
}

function NewPlaylistForm({ groupId, onDone }: { groupId: string; onDone: () => void }) {
  const createPlaylist = useCreatePlaylist(groupId);
  const toast = useToast();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreatePlaylistInput>({ resolver: zodResolver(createPlaylistSchema) });

  function onSubmit(values: CreatePlaylistInput) {
    createPlaylist.mutate(values, {
      onSuccess: () => {
        toast.success("Lista creada.");
        onDone();
      },
      onError: (err) => toast.error(toErrorMessage(err, "No se pudo crear la lista.")),
    });
  }

  return (
    <Card as="form" onSubmit={handleSubmit(onSubmit)} noValidate className="mb-4">
      <TextField
        label="Nombre de la lista"
        placeholder="Ej. Taberna, Combate, Bosque..."
        error={errors.name?.message}
        {...register("name")}
      />
      <label className="mb-4 flex items-center gap-2 text-sm text-ink-muted">
        <input type="checkbox" className="accent-oxblood" {...register("openToAll")} />
        Lista abierta a todos (cualquier miembro puede añadir canciones)
      </label>
      <Button type="submit" isLoading={createPlaylist.isPending} loadingText="Creando...">
        Crear
      </Button>
    </Card>
  );
}

function RenamePlaylistForm({
  groupId,
  playlist,
  onDone,
}: {
  groupId: string;
  playlist: MusicPlaylist;
  onDone: () => void;
}) {
  const renamePlaylist = useRenamePlaylist(groupId);
  const toast = useToast();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RenamePlaylistInput>({
    resolver: zodResolver(renamePlaylistSchema),
    defaultValues: { name: playlist.name },
  });

  function onSubmit(values: RenamePlaylistInput) {
    renamePlaylist.mutate(
      { playlistId: playlist.id, input: values },
      {
        onSuccess: () => {
          toast.success("Lista renombrada.");
          onDone();
        },
        onError: (err) => toast.error(toErrorMessage(err, "No se pudo renombrar la lista.")),
      },
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-1 items-center gap-2">
      <TextField
        label="Nombre"
        hideLabel
        wrapperClassName="mb-0 flex-1"
        error={errors.name?.message}
        {...register("name")}
      />
      <Button type="submit" isLoading={renamePlaylist.isPending} loadingText="...">
        Guardar
      </Button>
      <Button type="button" variant="ghost" onClick={onDone}>
        Cancelar
      </Button>
    </form>
  );
}

function AddTrackForm({
  groupId,
  playlistId,
  onDone,
}: {
  groupId: string;
  playlistId: string;
  onDone: () => void;
}) {
  const addTrack = useAddTrack(groupId);
  const toast = useToast();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AddTrackInput>({ resolver: zodResolver(addTrackSchema) });

  function onSubmit(values: AddTrackInput) {
    addTrack.mutate(
      { playlistId, input: values },
      {
        onSuccess: () => {
          toast.success("Track añadido.");
          onDone();
        },
        onError: (err) => toast.error(toErrorMessage(err, "No se pudo añadir el track.")),
      },
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-2 border-t border-rule pt-2">
      <TextField
        label="Título"
        placeholder="Título del track"
        wrapperClassName="mb-2"
        error={errors.title?.message}
        {...register("title")}
      />
      <TextField
        label="Enlace de YouTube"
        placeholder="https://www.youtube.com/watch?v=..."
        wrapperClassName="mb-2"
        error={errors.url?.message}
        {...register("url")}
      />
      <div className="flex gap-2">
        <Button type="submit" isLoading={addTrack.isPending} loadingText="Añadiendo...">
          Añadir
        </Button>
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}

function EditTrackForm({
  groupId,
  track,
  onDone,
}: {
  groupId: string;
  track: MusicTrack;
  onDone: () => void;
}) {
  const updateTrack = useUpdateTrack(groupId);
  const toast = useToast();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UpdateTrackInput>({
    resolver: zodResolver(updateTrackSchema),
    defaultValues: {
      title: track.title,
      url: `https://www.youtube.com/watch?v=${track.youtubeId}`,
    },
  });

  function onSubmit(values: UpdateTrackInput) {
    updateTrack.mutate(
      { trackId: track.id, input: values },
      {
        onSuccess: () => {
          toast.success("Track actualizado.");
          onDone();
        },
        onError: (err) => toast.error(toErrorMessage(err, "No se pudo actualizar el track.")),
      },
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="py-1">
      <TextField
        label="Título"
        placeholder="Título del track"
        wrapperClassName="mb-2"
        error={errors.title?.message}
        {...register("title")}
      />
      <TextField
        label="Enlace de YouTube"
        placeholder="https://www.youtube.com/watch?v=..."
        wrapperClassName="mb-2"
        error={errors.url?.message}
        {...register("url")}
      />
      <div className="flex gap-2">
        <Button type="submit" isLoading={updateTrack.isPending} loadingText="Guardando...">
          Guardar
        </Button>
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
