import { useState } from "react";
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
import {
  useAddTrack,
  useCreatePlaylist,
  useDeletePlaylist,
  useDeleteTrack,
  useGroupMusic,
  useRenamePlaylist,
} from "../features/music/hooks";
import { useAmbientPlayer, type AmbientPlayerControls } from "../features/music/useAmbientPlayer";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { TextField } from "../components/ui/TextField";
import { EmptyState } from "../components/ui/EmptyState";
import { ChapterHeading } from "../components/ui/ChapterHeading";
import { SkeletonPage } from "../components/ui/Skeleton";
import { toErrorMessage, useToast } from "../components/ui/Toast";

export function GroupMusicPage() {
  const { id: groupId } = useParams<{ id: string }>();
  const { data, isLoading, isError, error } = useGroupMusic(groupId!);
  const player = useAmbientPlayer();
  const [showNewPlaylist, setShowNewPlaylist] = useState(false);

  /*
    Player oculto: solo audio, sin vídeo visible. `display:none` hace que el
    widget de YouTube no llegue a crear el iframe (necesita un contenedor con
    layout real) — por eso va 1x1px con opacity 0 en vez de `hidden`. Se
    renderiza siempre, incluso durante isLoading/isError: el efecto de montaje
    de useAmbientPlayer solo se ejecuta una vez, así que si este div no
    existiera todavía en el primer commit, containerRef.current se quedaría en
    null para siempre y el player nunca llegaría a crearse.
  */
  const hiddenPlayer = (
    <div
      ref={player.containerRef}
      className="pointer-events-none fixed left-0 top-0 h-px w-px overflow-hidden opacity-0"
      aria-hidden="true"
    />
  );

  if (isLoading || !data) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-10">
        {hiddenPlayer}
        <SkeletonPage rows={4} />
      </div>
    );
  }
  if (isError) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-10 text-oxblood-dark">
        {hiddenPlayer}
        {(error as Error).message}
      </div>
    );
  }

  const currentTrackTitle = data.playlists
    .flatMap((pl) => pl.tracks)
    .find((t) => t.youtubeId === player.currentTrackId)?.title;

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      {hiddenPlayer}

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

      {player.currentTrackId && <NowPlayingBar player={player} trackTitle={currentTrackTitle} />}

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
              currentTrackId={player.currentTrackId}
              isPlaying={player.isPlaying}
              onPlay={(youtubeId) => player.play(youtubeId)}
              onTogglePlayPause={player.togglePlayPause}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function NowPlayingBar({
  player,
  trackTitle,
}: {
  player: AmbientPlayerControls;
  trackTitle?: string;
}) {
  return (
    <div className="mb-6 flex items-center gap-3 rounded-sm border border-rule bg-parchment-panel p-3">
      <Button variant="ghost" onClick={player.togglePlayPause} disabled={!player.isReady}>
        {player.isPlaying ? "Pausa" : "Reproducir"}
      </Button>
      <span className="flex-1 truncate text-sm text-ink">{trackTitle ?? "Cargando..."}</span>
      <input
        type="range"
        min={0}
        max={100}
        value={player.volume}
        onChange={(e) => player.setVolume(Number(e.target.value))}
        aria-label="Volumen"
        className="w-24 accent-oxblood"
      />
      <Button variant="ghost" onClick={player.stop}>
        Detener
      </Button>
    </div>
  );
}

function PlaylistCard({
  groupId,
  playlist,
  canEdit,
  currentTrackId,
  isPlaying,
  onPlay,
  onTogglePlayPause,
}: {
  groupId: string;
  playlist: MusicPlaylist;
  canEdit: boolean;
  currentTrackId: string | null;
  isPlaying: boolean;
  onPlay: (youtubeId: string) => void;
  onTogglePlayPause: () => void;
}) {
  const [renaming, setRenaming] = useState(false);
  const [addingTrack, setAddingTrack] = useState(false);
  const deletePlaylist = useDeletePlaylist(groupId);
  const deleteTrack = useDeleteTrack(groupId);
  const toast = useToast();

  function handleDeletePlaylist() {
    deletePlaylist.mutate(playlist.id, {
      onSuccess: () => toast.success("Lista borrada."),
      onError: (err) => toast.error(toErrorMessage(err, "No se pudo borrar la lista.")),
    });
  }

  function handleDeleteTrack(trackId: string) {
    deleteTrack.mutate(trackId, {
      onError: (err) => toast.error(toErrorMessage(err, "No se pudo borrar el track.")),
    });
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
                <Button
                  variant="danger"
                  onClick={handleDeletePlaylist}
                  isLoading={deletePlaylist.isPending}
                >
                  Borrar
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {playlist.tracks.length === 0 ? (
        <p className="text-sm text-ink-muted">Sin tracks.</p>
      ) : (
        <ul className="space-y-1">
          {playlist.tracks.map((track) => {
            const isCurrent = track.youtubeId === currentTrackId;
            return (
              <li
                key={track.id}
                className="flex items-center justify-between gap-2 rounded-sm px-2 py-1 hover:bg-parchment-deep/40"
              >
                <button
                  type="button"
                  onClick={() => (isCurrent ? onTogglePlayPause() : onPlay(track.youtubeId))}
                  className={`flex-1 truncate text-left text-sm ${
                    isCurrent ? "text-oxblood" : "text-ink"
                  }`}
                >
                  {isCurrent ? (isPlaying ? "▸ " : "‖ ") : ""}
                  {track.title}
                </button>
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => handleDeleteTrack(track.id)}
                    aria-label={`Borrar ${track.title}`}
                    className="shrink-0 text-ink-muted hover:text-oxblood"
                  >
                    ×
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {canEdit &&
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
