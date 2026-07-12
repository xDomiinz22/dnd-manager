import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  addTrackSchema,
  createPlaylistSchema,
  renamePlaylistSchema,
  type AddTrackInput,
  type CreatePlaylistInput,
  type MusicPlaylist,
  type RenamePlaylistInput,
} from "@dnd-manager/shared";
import { useAuth } from "../context/AuthContext";
import {
  useAddTrack,
  useCreatePlaylist,
  useDeletePlaylist,
  useDeleteTrack,
  useGroupMusic,
  useRenamePlaylist,
  useSetPlaylistOpenToAll,
} from "../features/music/hooks";
import { useAmbientPlayerContext } from "../features/music/AmbientPlayerContext";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { TextField } from "../components/ui/TextField";
import { EmptyState } from "../components/ui/EmptyState";
import { ChapterHeading } from "../components/ui/ChapterHeading";
import { ConfirmPanel } from "../components/ui/ConfirmPanel";
import { SkeletonPage } from "../components/ui/Skeleton";
import { PauseIcon, PlayIcon, RepeatIcon } from "../components/ui/PlayerIcons";
import { PlayerControls } from "../components/music/PlayerControls";
import { toErrorMessage, useToast } from "../components/ui/Toast";

export function GroupMusicPage() {
  const { id: groupId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { data, isLoading, isError, error } = useGroupMusic(groupId!);
  const player = useAmbientPlayerContext();
  const [showNewPlaylist, setShowNewPlaylist] = useState(false);

  // Mantiene sincronizado el snapshot activo del reproductor si la lista que
  // suena ahora mismo es una de las de este grupo (p.ej. si alguien añade un
  // track mientras sigues viendo esta página).
  const syncRef = useRef(player.syncPlaylistIfActive);
  syncRef.current = player.syncPlaylistIfActive;
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

      {isActiveHere && player.currentTrack && (
        <div className="mb-6 rounded-sm border border-rule bg-parchment-panel p-3">
          <p className="mb-2 truncate text-sm text-ink">
            {player.currentTrack.title}
            {player.currentTrack.addedByUsername && (
              <span className="text-ink-muted">
                {" "}
                · añadido por {player.currentTrack.addedByUsername}
              </span>
            )}
          </p>
          <PlayerControls
            isPlaying={player.isPlaying}
            isReady={player.isReady}
            shuffle={player.shuffle}
            loop={player.currentTrack.loop}
            volume={player.volume}
            onTogglePlayPause={player.togglePlayPause}
            onNext={player.playNext}
            onPrev={player.playPrev}
            onToggleShuffle={player.toggleShuffle}
            onToggleLoop={() => player.toggleTrackLoop(player.currentTrack!.id)}
            onVolumeChange={player.setVolume}
          />
        </div>
      )}

      {data.playlists.length === 0 ? (
        <EmptyState
          title="Sin listas de música todavía."
          description={data.canEdit ? "Crea una lista para empezar." : undefined}
        />
      ) : (
        <div className="space-y-4">
          {data.playlists.map((playlist) => (
            <PlaylistCard
              key={playlist.id}
              groupId={groupId!}
              playlist={playlist}
              canEdit={data.canEdit}
              currentUserId={user?.id ?? null}
              activeTrackId={isActiveHere ? player.currentTrack!.id : null}
              isPlaying={player.isPlaying}
              onPlayTrack={(trackId) => player.playFromPlaylist(groupId!, playlist, trackId)}
              onTogglePlayPause={player.togglePlayPause}
              onToggleTrackLoop={(trackId) => player.toggleTrackLoop(trackId)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PlaylistCard({
  groupId,
  playlist,
  canEdit,
  currentUserId,
  activeTrackId,
  isPlaying,
  onPlayTrack,
  onTogglePlayPause,
  onToggleTrackLoop,
}: {
  groupId: string;
  playlist: MusicPlaylist;
  canEdit: boolean;
  currentUserId: string | null;
  activeTrackId: string | null;
  isPlaying: boolean;
  onPlayTrack: (trackId: string) => void;
  onTogglePlayPause: () => void;
  onToggleTrackLoop: (trackId: string) => void;
}) {
  const [renaming, setRenaming] = useState(false);
  const [addingTrack, setAddingTrack] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [confirmingTrackId, setConfirmingTrackId] = useState<string | null>(null);
  const deletePlaylist = useDeletePlaylist(groupId);
  const deleteTrack = useDeleteTrack(groupId);
  const setOpenToAll = useSetPlaylistOpenToAll(groupId);
  const toast = useToast();

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
            {canEdit && (
              <div className="flex shrink-0 gap-2">
                <Button variant="ghost" onClick={() => setRenaming(true)}>
                  Renombrar
                </Button>
                <Button variant="danger" onClick={() => setConfirmingDelete((v) => !v)}>
                  Borrar
                </Button>
              </div>
            )}
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

      {confirmingDelete && (
        <ConfirmPanel
          message={`Esto borra la lista "${playlist.name}" y todos sus tracks. No se puede deshacer.`}
          confirmLabel="Confirmar borrado"
          loadingText="Borrando..."
          isLoading={deletePlaylist.isPending}
          onConfirm={handleDeletePlaylist}
          onCancel={() => setConfirmingDelete(false)}
          className="mb-3"
        />
      )}

      {playlist.tracks.length === 0 ? (
        <p className="text-sm text-ink-muted">Sin tracks.</p>
      ) : (
        <ul className="space-y-1">
          {playlist.tracks.map((track) => {
            const isCurrent = track.id === activeTrackId;
            const canDeleteThis = canEdit || track.addedByUserId === currentUserId;
            return (
              <li key={track.id} className="rounded-sm px-2 py-1 hover:bg-parchment-deep/40">
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => (isCurrent ? onTogglePlayPause() : onPlayTrack(track.id))}
                    className={`flex flex-1 items-center gap-2 truncate text-left text-sm ${
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
                    <span className="truncate">
                      {track.title}
                      {track.addedByUsername && (
                        <span className="text-ink-muted"> · {track.addedByUsername}</span>
                      )}
                    </span>
                  </button>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onToggleTrackLoop(track.id)}
                      aria-label={`Repetir ${track.title}`}
                      aria-pressed={track.loop}
                      className={`flex h-6 w-6 items-center justify-center rounded-sm hover:bg-parchment-deep/60 ${
                        track.loop ? "text-oxblood" : "text-ink-muted hover:text-oxblood"
                      }`}
                    >
                      <RepeatIcon className="h-3.5 w-3.5" />
                    </button>
                    {canDeleteThis && (
                      <button
                        type="button"
                        onClick={() =>
                          setConfirmingTrackId(confirmingTrackId === track.id ? null : track.id)
                        }
                        aria-label={`Borrar ${track.title}`}
                        className="text-ink-muted hover:text-oxblood"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>
                {confirmingTrackId === track.id && (
                  <ConfirmPanel
                    message={`Vas a borrar "${track.title}" de esta lista.`}
                    confirmLabel="Confirmar borrado"
                    loadingText="Borrando..."
                    isLoading={deleteTrack.isPending}
                    onConfirm={() => handleDeleteTrack(track.id)}
                    onCancel={() => setConfirmingTrackId(null)}
                    className="mt-2 border-t-0 pt-0"
                  />
                )}
              </li>
            );
          })}
        </ul>
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
