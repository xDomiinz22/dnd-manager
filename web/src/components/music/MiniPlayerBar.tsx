import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useAmbientPlayerContext } from "../../features/music/AmbientPlayerContext";
import { MarqueeText } from "../ui/MarqueeText";
import { PlayerControls } from "./PlayerControls";

const PLAYER_BAR_HEIGHT_VAR = "--player-bar-height";

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Barra fina fija abajo del todo mientras suena música ambiente, visible en
 * cualquier página de la app (vive en AppLayout, no en GroupMusicPage, para
 * sobrevivir a la navegación). Todos los controles están siempre visibles —
 * sin desplegable — para no esconder nada tras un click extra.
 */
export function MiniPlayerBar() {
  const player = useAmbientPlayerContext();
  const barRef = useRef<HTMLDivElement | null>(null);
  const visible = !!player.currentTrack && !!player.groupId;

  // Publica la altura real de la barra en una variable CSS: otros elementos
  // fijos al fondo (FAB de chat, de cola de reproducción) la usan para no
  // taparse con la barra en vez de asumir una altura fija que no encajaba
  // con el alto real (variable según se envuelvan o no los controles).
  useEffect(() => {
    const el = barRef.current;
    if (!el) {
      document.documentElement.style.setProperty(PLAYER_BAR_HEIGHT_VAR, "0px");
      return;
    }
    const setHeight = (height: number) =>
      document.documentElement.style.setProperty(PLAYER_BAR_HEIGHT_VAR, `${height}px`);
    // Medimos ya mismo (no solo desde el observer): su primer callback llega
    // de forma asíncrona en el siguiente frame, y para entonces ya se habrá
    // pintado la barra con la altura equivocada durante un instante.
    setHeight(el.offsetHeight);
    const observer = new ResizeObserver(([entry]) =>
      setHeight(entry?.contentRect.height ?? el.offsetHeight),
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      document.documentElement.style.setProperty(PLAYER_BAR_HEIGHT_VAR, "0px");
    };
  }, [visible]);

  if (!player.currentTrack || !player.groupId) return null;

  return (
    <div
      ref={barRef}
      className="fixed inset-x-0 bottom-0 z-30 border-t border-rule bg-parchment-panel shadow-[0_-4px_16px_-4px_rgba(0,0,0,0.15)]"
    >
      <div className="mx-auto max-w-2xl px-4 py-2 sm:py-3">
        <div className="mb-1.5 flex items-center gap-2">
          <MarqueeText
            text={player.currentTrack.title}
            className="min-w-0 flex-1 text-sm font-semibold text-ink"
          />
          <Link
            to={`/groups/${player.groupId}/music`}
            className="shrink-0 rounded-sm border border-rule px-3 py-1.5 text-xs text-ink transition-colors hover:border-rule-strong hover:bg-parchment-deep hover:text-ink"
          >
            Música ambiente
          </Link>
        </div>

        <div className="mb-1 flex items-center gap-2 text-xs text-ink-muted">
          <span className="w-9 shrink-0 tabular-nums">{formatTime(player.currentTime)}</span>
          <input
            type="range"
            min={0}
            max={player.duration || 0}
            value={player.currentTime}
            onChange={(e) => player.seekTo(Number(e.target.value))}
            aria-label="Posición en el track"
            className="h-1 w-full flex-1 accent-oxblood"
          />
          <span className="w-9 shrink-0 tabular-nums">{formatTime(player.duration)}</span>
        </div>

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
    </div>
  );
}
