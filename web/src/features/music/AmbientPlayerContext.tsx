import { createContext, useContext, useRef, useState, type ReactNode } from "react";
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
  playNext: () => void;
  playPrev: () => void;
  toggleShuffle: () => void;
  toggleTrackLoop: (trackId: string) => void;
  /** Refresca el snapshot activo con datos más recientes (no-op si `next` no es la lista que suena ahora mismo). */
  syncPlaylistIfActive: (next: MusicPlaylist) => void;
}

const AmbientPlayerContext = createContext<AmbientPlayerContextValue | null>(null);

export function AmbientPlayerProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const [groupId, setGroupId] = useState<string | null>(null);
  const [playlist, setPlaylist] = useState<MusicPlaylist | null>(null);
  const [currentTrackDbId, setCurrentTrackDbId] = useState<string | null>(null);
  const [shuffle, setShuffle] = useState(false);

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
  // `player.play` todavía no existe cuando se define `handleEnded` más abajo
  // (hace falta pasársela a useAmbientPlayer antes de tener `player`) — este
  // ref rompe esa dependencia circular.
  const playRef = useRef<(youtubeId: string) => void>(() => {});

  function advance() {
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
    const list = playlistRef.current;
    const current = list?.tracks.find((t) => t.id === currentTrackDbIdRef.current);
    if (current?.loop) {
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
    setGroupId(nextGroupId);
    setPlaylist(nextPlaylist);
    setCurrentTrackDbId(trackId);
    shuffleHistoryRef.current = [];
    playRef.current(track.youtubeId);
  }

  function playPrev() {
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

  const currentTrack = playlist?.tracks.find((t) => t.id === currentTrackDbId) ?? null;

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
    playNext: advance,
    playPrev,
    toggleShuffle,
    toggleTrackLoop,
    syncPlaylistIfActive,
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
