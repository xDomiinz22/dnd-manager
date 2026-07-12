import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { loadYoutubeIframeApi, type YTPlayer } from "../../lib/youtubePlayer";

export interface AmbientPlayerControls {
  containerRef: RefObject<HTMLDivElement>;
  isReady: boolean;
  isPlaying: boolean;
  currentTrackId: string | null;
  volume: number;
  play: (youtubeId: string) => void;
  togglePlayPause: () => void;
  stop: () => void;
  setVolume: (volume: number) => void;
}

const DEFAULT_VOLUME = 70;

/**
 * Reproductor de solo-audio: crea un player oculto de la IFrame API de
 * YouTube y expone controles imperativos para montar encima una UI propia.
 * Al terminar un track lo repite en bucle (música ambiente, no playlist
 * autoavanzable) en vez de pararse.
 */
export function useAmbientPlayer(): AmbientPlayerControls {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const isReadyRef = useRef(false);
  const volumeRef = useRef(DEFAULT_VOLUME);
  const pendingTrackRef = useRef<string | null>(null);

  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrackId, setCurrentTrackId] = useState<string | null>(null);
  const [volume, setVolumeState] = useState(DEFAULT_VOLUME);

  useEffect(() => {
    let cancelled = false;

    loadYoutubeIframeApi().then((YT) => {
      if (cancelled || !containerRef.current) return;

      const player = new YT.Player(containerRef.current, {
        height: "0",
        width: "0",
        playerVars: { autoplay: 0, controls: 0, disablekb: 1 },
        events: {
          onReady: () => {
            player.setVolume(volumeRef.current);
            isReadyRef.current = true;
            setIsReady(true);
            if (pendingTrackRef.current) {
              const trackId = pendingTrackRef.current;
              pendingTrackRef.current = null;
              player.loadVideoById(trackId);
            }
          },
          onStateChange: (e) => {
            if (e.data === YT.PlayerState.ENDED) {
              player.seekTo(0, true);
              player.playVideo();
              return;
            }
            setIsPlaying(e.data === YT.PlayerState.PLAYING);
          },
        },
      });
      playerRef.current = player;
    });

    return () => {
      cancelled = true;
      playerRef.current?.destroy();
      playerRef.current = null;
      isReadyRef.current = false;
    };
  }, []);

  const play = useCallback((youtubeId: string) => {
    setCurrentTrackId(youtubeId);
    if (isReadyRef.current && playerRef.current) {
      playerRef.current.loadVideoById(youtubeId);
    } else {
      pendingTrackRef.current = youtubeId;
    }
  }, []);

  const togglePlayPause = useCallback(() => {
    if (!isReadyRef.current || !playerRef.current) return;
    if (isPlaying) {
      playerRef.current.pauseVideo();
    } else {
      playerRef.current.playVideo();
    }
  }, [isPlaying]);

  const stop = useCallback(() => {
    if (!isReadyRef.current || !playerRef.current) return;
    playerRef.current.stopVideo();
    setCurrentTrackId(null);
  }, []);

  const setVolume = useCallback((next: number) => {
    volumeRef.current = next;
    setVolumeState(next);
    playerRef.current?.setVolume(next);
  }, []);

  return {
    containerRef,
    isReady,
    isPlaying,
    currentTrackId,
    volume,
    play,
    togglePlayPause,
    stop,
    setVolume,
  };
}
