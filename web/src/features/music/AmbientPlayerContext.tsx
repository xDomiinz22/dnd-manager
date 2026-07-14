import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { MusicPlaylist, MusicTrack } from "@dnd-manager/shared";
import { useAmbientPlayer, type AmbientPlayerControls } from "./useAmbientPlayer";
import { musicApi } from "./api";
import { groupMusicKey } from "./hooks";

interface AmbientPlayerContextValue extends Omit<AmbientPlayerControls, "play" | "currentTrackId"> {
  groupId: string | null;
  playlist: MusicPlaylist | null;
  currentTrack: MusicTrack | null;
  shuffle: boolean;
  playFromPlaylist: (groupId: string, playlist: MusicPlaylist, trackId: string) => void;
  playFromPlaylistShuffled: (groupId: string, playlist: MusicPlaylist) => void;
  playNext: () => void;
  playPrev: () => void;
  toggleShuffle: () => void;
  toggleTrackLoop: (trackId: string) => void;
  /** Refresca el snapshot activo con datos más recientes (no-op si `next` no es la lista que suena ahora mismo). */
  syncPlaylistIfActive: (next: MusicPlaylist) => void;
  /**
   * Cola "reproducir a continuación": puramente local a este navegador (no
   * se guarda en el backend, es una preferencia de escucha efímera). Un
   * track se añade deslizando su fila de izquierda a derecha; `playNext`/el
   * fin natural de un track la vacían por orden antes de seguir con la
   * lista normal. Se considera "creada" en cuanto tiene algún elemento y
   * "borrada" en cuanto vuelve a quedar vacía — no hay estado aparte.
   */
  tempQueue: MusicTrack[];
  addToTempQueue: (track: MusicTrack, groupId: string) => void;
  removeFromTempQueue: (trackId: string) => void;
  /** Reordena la cola arrastrando, igual que las listas normales — recibe el array completo de ids en el nuevo orden. */
  reorderTempQueue: (orderedIds: string[]) => void;
}

const AmbientPlayerContext = createContext<AmbientPlayerContextValue | null>(null);

export function AmbientPlayerProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const [groupId, setGroupId] = useState<string | null>(null);
  const [playlist, setPlaylist] = useState<MusicPlaylist | null>(null);
  const [currentTrackDbId, setCurrentTrackDbId] = useState<string | null>(null);
  const [shuffle, setShuffle] = useState(false);
  const [tempQueue, setTempQueue] = useState<MusicTrack[]>([]);
  // Distinto de `currentTrackDbId`: cuando se está reproduciendo un track que
  // vino de la cola temporal, el puntero de la lista normal (`currentTrackDbId`)
  // se deja quieto donde estaba, para poder retomar la lista normal en el
  // punto correcto en cuanto la cola temporal se vacíe.
  const [activeTempTrack, setActiveTempTrack] = useState<MusicTrack | null>(null);

  // Refs con el estado más reciente: `handleEnded` corre dentro de un
  // listener de la YT API creado una sola vez, así que necesita leer siempre
  // el valor actual en vez de cerrar sobre el de cuando se montó el player.
  const playlistRef = useRef(playlist);
  playlistRef.current = playlist;
  const currentTrackDbIdRef = useRef(currentTrackDbId);
  currentTrackDbIdRef.current = currentTrackDbId;
  const shuffleRef = useRef(shuffle);
  shuffleRef.current = shuffle;
  const shuffleHistoryRef = useRef<string[]>([]);
  const tempQueueRef = useRef(tempQueue);
  tempQueueRef.current = tempQueue;
  const activeTempTrackRef = useRef(activeTempTrack);
  activeTempTrackRef.current = activeTempTrack;
  // `player.play` todavía no existe cuando se define `handleEnded` más abajo
  // (hace falta pasársela a useAmbientPlayer antes de tener `player`) — este
  // ref rompe esa dependencia circular.
  const playRef = useRef<(youtubeId: string) => void>(() => {});

  function advance() {
    // La cola temporal siempre tiene prioridad sobre la lista normal —
    // mismo criterio que "reproducir a continuación" en Spotify: se vacía
    // en orden (FIFO) antes de retomar la lista de donde se había quedado.
    const queue = tempQueueRef.current;
    if (queue.length > 0) {
      const [next, ...rest] = queue;
      setTempQueue(rest);
      setActiveTempTrack(next!);
      playRef.current(next!.youtubeId);
      return;
    }
    setActiveTempTrack(null);

    const list = playlistRef.current;
    if (!list || list.tracks.length === 0) return;
    const tracks = list.tracks;
    const curId = currentTrackDbIdRef.current;

    if (tracks.length === 1) {
      setCurrentTrackDbId(tracks[0]!.id);
      playRef.current(tracks[0]!.youtubeId);
      return;
    }

    let next: MusicTrack;
    if (shuffleRef.current) {
      const candidates = tracks.filter((t) => t.id !== curId);
      next = candidates[Math.floor(Math.random() * candidates.length)]!;
      if (curId) shuffleHistoryRef.current.push(curId);
    } else {
      const idx = tracks.findIndex((t) => t.id === curId);
      next = tracks[idx === -1 ? 0 : (idx + 1) % tracks.length]!;
    }
    setCurrentTrackDbId(next.id);
    playRef.current(next.youtubeId);
  }

  function handleEnded() {
    // Un track de la cola temporal no tiene bucle propio (no hay UI para
    // ello) — `current` sale undefined y cae directo a `advance()`.
    const list = playlistRef.current;
    const current = list?.tracks.find((t) => t.id === currentTrackDbIdRef.current);
    if (current?.loop && !activeTempTrackRef.current) {
      // Bucle solo se respeta al terminar solo; "siguiente" manual (advance
      // llamado directamente desde fuera) siempre cambia de canción.
      playRef.current(current.youtubeId);
      return;
    }
    advance();
  }

  const player = useAmbientPlayer({ onEnded: handleEnded });
  playRef.current = player.play;

  function playFromPlaylist(nextGroupId: string, nextPlaylist: MusicPlaylist, trackId: string) {
    const track = nextPlaylist.tracks.find((t) => t.id === trackId);
    if (!track) return;
    setActiveTempTrack(null);
    setGroupId(nextGroupId);
    setPlaylist(nextPlaylist);
    setCurrentTrackDbId(trackId);
    shuffleHistoryRef.current = [];
    playRef.current(track.youtubeId);
  }

  function playFromPlaylistShuffled(nextGroupId: string, nextPlaylist: MusicPlaylist) {
    if (nextPlaylist.tracks.length === 0) return;
    const track = nextPlaylist.tracks[Math.floor(Math.random() * nextPlaylist.tracks.length)]!;
    setActiveTempTrack(null);
    setGroupId(nextGroupId);
    setPlaylist(nextPlaylist);
    setCurrentTrackDbId(track.id);
    setShuffle(true);
    shuffleHistoryRef.current = [];
    playRef.current(track.youtubeId);
  }

  function playPrev() {
    // Reproduciendo un track de la cola temporal: no hay un "anterior"
    // razonable que reconstruir (la cola ya perdió el que sonaba justo
    // antes), así que reinicia el propio track desde el principio — mismo
    // fallback simple que usan la mayoría de reproductores para este caso.
    if (activeTempTrackRef.current) {
      player.seekTo(0);
      return;
    }

    const list = playlistRef.current;
    if (!list || list.tracks.length === 0) return;

    if (shuffleRef.current) {
      const prevId = shuffleHistoryRef.current.pop();
      const prevTrack = prevId ? list.tracks.find((t) => t.id === prevId) : undefined;
      const current = list.tracks.find((t) => t.id === currentTrackDbIdRef.current);
      const target = prevTrack ?? current;
      if (target) {
        setCurrentTrackDbId(target.id);
        playRef.current(target.youtubeId);
      }
      return;
    }

    const idx = list.tracks.findIndex((t) => t.id === currentTrackDbIdRef.current);
    const prevTrack = list.tracks[idx <= 0 ? list.tracks.length - 1 : idx - 1]!;
    setCurrentTrackDbId(prevTrack.id);
    playRef.current(prevTrack.youtubeId);
  }

  function toggleShuffle() {
    setShuffle((v) => !v);
    shuffleHistoryRef.current = [];
  }

  function toggleTrackLoop(trackId: string) {
    const list = playlistRef.current;
    if (!list || !groupId) return;
    const track = list.tracks.find((t) => t.id === trackId);
    if (!track) return;
    const nextLoop = !track.loop;
    // Optimista: refleja el nuevo estado al momento sin esperar la respuesta.
    setPlaylist({
      ...list,
      tracks: list.tracks.map((t) => (t.id === trackId ? { ...t, loop: nextLoop } : t)),
    });
    musicApi
      .setTrackLoop(groupId, trackId, { loop: nextLoop })
      .finally(() => queryClient.invalidateQueries({ queryKey: groupMusicKey(groupId) }));
  }

  function syncPlaylistIfActive(next: MusicPlaylist) {
    setPlaylist((prev) => (prev && prev.id === next.id ? next : prev));
  }

  function addToTempQueue(track: MusicTrack, groupIdForTrack: string) {
    // Si no suena nada (ni de la lista normal ni de la propia cola), el
    // track no llega a "esperar" en la cola — se reproduce directamente,
    // igual que si `advance()` lo hubiera sacado ya. Comprobado con refs
    // (no con `currentTrack`/estado de React) porque esto puede llamarse
    // justo después de otro cambio en el mismo tick, antes de que React
    // haya vuelto a renderizar con el valor fresco.
    const isIdle = !currentTrackDbIdRef.current && !activeTempTrackRef.current;
    if (isIdle) {
      // La mini-barra solo se muestra si `groupId` está fijado (normalmente
      // solo lo hace `playFromPlaylist`); si el reproductor estaba inactivo,
      // hay que fijarlo aquí también o el track suena "a ciegas", sin barra.
      setGroupId(groupIdForTrack);
      setActiveTempTrack(track);
      playRef.current(track.youtubeId);
      return;
    }
    setTempQueue((prev) => (prev.some((t) => t.id === track.id) ? prev : [...prev, track]));
  }

  function removeFromTempQueue(trackId: string) {
    setTempQueue((prev) => prev.filter((t) => t.id !== trackId));
  }

  function reorderTempQueue(orderedIds: string[]) {
    setTempQueue((prev) => {
      const byId = new Map(prev.map((t) => [t.id, t]));
      const reordered = orderedIds.map((id) => byId.get(id)).filter((t): t is MusicTrack => !!t);
      return reordered.length === prev.length ? reordered : prev;
    });
  }

  const currentTrack =
    activeTempTrack ?? playlist?.tracks.find((t) => t.id === currentTrackDbId) ?? null;

  // Refs con el estado más reciente para los atajos de teclado: el listener
  // se registra una sola vez (deps vacías) para no reañadirlo en cada tick
  // del poll de `currentTime` (cada 500ms) — así que todo lo que lee debe
  // venir de un ref, nunca cerrar sobre una variable de un render concreto.
  const playerLatestRef = useRef(player);
  playerLatestRef.current = player;
  const currentTimeRef = useRef(player.currentTime);
  currentTimeRef.current = player.currentTime;
  const durationRef = useRef(player.duration);
  durationRef.current = player.duration;
  const volumeRef = useRef(player.volume);
  volumeRef.current = player.volume;
  const currentTrackRef = useRef(currentTrack);
  currentTrackRef.current = currentTrack;
  const lastNonZeroVolumeRef = useRef(player.volume || 70);
  if (player.volume > 0) lastNonZeroVolumeRef.current = player.volume;
  // `handleKeyDown` (definido más abajo) se reasigna en cada render — pasar
  // por un ref aquí (en vez de referenciar la función directamente) es
  // necesario para que este `useEffect` solo lea un `.current` en vez de
  // una función "inestable": el analizador de dependencias de
  // `react-hooks/exhaustive-deps` de esta instalación de ESLint 9 crashea
  // (`context.getSource is not a function`, gotcha ya conocido de esta
  // sesión) al intentar recorrer el cuerpo de una función de componente
  // referenciada así de directo.
  const handleKeyDownRef = useRef((_e: KeyboardEvent) => {});

  useEffect(() => {
    function listener(e: KeyboardEvent) {
      handleKeyDownRef.current(e);
    }
    document.addEventListener("keydown", listener);
    return () => document.removeEventListener("keydown", listener);
  }, []);

  function isTypingTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) return false;
    const tag = target.tagName;
    return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable;
  }

  function isAtFirstTrack(): boolean {
    const list = playlistRef.current;
    if (!list || list.tracks.length === 0) return true;
    const idx = list.tracks.findIndex((t) => t.id === currentTrackDbIdRef.current);
    return idx <= 0;
  }

  function isAtLastTrack(): boolean {
    const list = playlistRef.current;
    if (!list || list.tracks.length === 0) return true;
    const idx = list.tracks.findIndex((t) => t.id === currentTrackDbIdRef.current);
    return idx === -1 || idx === list.tracks.length - 1;
  }

  function shiftPrev() {
    // El límite de "primera canción" solo tiene sentido para la lista
    // normal en orden — con shuffle o reproduciendo desde la cola temporal
    // no hay un "primero" bien definido, así que ahí nunca se bloquea.
    if (activeTempTrackRef.current || shuffleRef.current || !isAtFirstTrack()) {
      playPrev();
    }
  }

  function shiftNext() {
    if (
      tempQueueRef.current.length > 0 ||
      activeTempTrackRef.current ||
      shuffleRef.current ||
      !isAtLastTrack()
    ) {
      advance();
    }
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (isTypingTarget(e.target)) return;
    if (!currentTrackRef.current) return;

    switch (e.key) {
      case " ":
      case "Spacebar":
        e.preventDefault();
        playerLatestRef.current.togglePlayPause();
        break;
      case "ArrowLeft":
        e.preventDefault();
        if (e.shiftKey) shiftPrev();
        else playerLatestRef.current.seekTo(Math.max(0, currentTimeRef.current - 10));
        break;
      case "ArrowRight":
        e.preventDefault();
        if (e.shiftKey) shiftNext();
        else {
          const max = durationRef.current || currentTimeRef.current;
          playerLatestRef.current.seekTo(Math.min(max, currentTimeRef.current + 10));
        }
        break;
      case "ArrowUp":
        e.preventDefault();
        playerLatestRef.current.setVolume(Math.min(100, volumeRef.current + 10));
        break;
      case "ArrowDown":
        e.preventDefault();
        playerLatestRef.current.setVolume(Math.max(0, volumeRef.current - 10));
        break;
      case "m":
      case "M":
        e.preventDefault();
        if (volumeRef.current > 0) {
          lastNonZeroVolumeRef.current = volumeRef.current;
          playerLatestRef.current.setVolume(0);
        } else {
          playerLatestRef.current.setVolume(lastNonZeroVolumeRef.current || 70);
        }
        break;
      default:
        return;
    }
  }
  handleKeyDownRef.current = handleKeyDown;

  const value: AmbientPlayerContextValue = {
    containerRef: player.containerRef,
    isReady: player.isReady,
    isPlaying: player.isPlaying,
    volume: player.volume,
    currentTime: player.currentTime,
    duration: player.duration,
    togglePlayPause: player.togglePlayPause,
    stop: player.stop,
    setVolume: player.setVolume,
    seekTo: player.seekTo,
    groupId,
    playlist,
    currentTrack,
    shuffle,
    playFromPlaylist,
    playFromPlaylistShuffled,
    playNext: advance,
    playPrev,
    toggleShuffle,
    toggleTrackLoop,
    syncPlaylistIfActive,
    tempQueue,
    addToTempQueue,
    removeFromTempQueue,
    reorderTempQueue,
  };

  return <AmbientPlayerContext.Provider value={value}>{children}</AmbientPlayerContext.Provider>;
}

export function useAmbientPlayerContext(): AmbientPlayerContextValue {
  const ctx = useContext(AmbientPlayerContext);
  if (!ctx) {
    throw new Error("useAmbientPlayerContext debe usarse dentro de <AmbientPlayerProvider>");
  }
  return ctx;
}
