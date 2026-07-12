import { useState } from "react";
import { Link } from "react-router-dom";
import { useAmbientPlayerContext } from "../../features/music/AmbientPlayerContext";
import { PauseIcon, PlayIcon } from "../ui/PlayerIcons";
import { PlayerControls } from "./PlayerControls";

/**
 * Barra fina fija abajo del todo mientras suena música ambiente, visible en
 * cualquier página de la app (vive en AppLayout, no en GroupMusicPage, para
 * sobrevivir a la navegación). Se expande hacia arriba con los controles
 * completos al pulsarla. Mismo componente en escritorio y móvil.
 */
export function MiniPlayerBar() {
  const player = useAmbientPlayerContext();
  const [expanded, setExpanded] = useState(false);

  if (!player.currentTrack || !player.groupId) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-rule bg-parchment-panel shadow-[0_-4px_16px_-4px_rgba(0,0,0,0.15)]">
      {expanded && (
        <div className="mx-auto flex max-w-2xl flex-col gap-3 border-b border-rule px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-ink">{player.currentTrack.title}</p>
            <Link
              to={`/groups/${player.groupId}/music`}
              className="text-xs text-oxblood hover:underline"
            >
              Música ambiente →
            </Link>
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
      )}
      <div className="mx-auto flex max-w-2xl items-center gap-2 px-4 py-2">
        <button
          type="button"
          onClick={player.togglePlayPause}
          disabled={!player.isReady}
          aria-label={player.isPlaying ? "Pausar" : "Reproducir"}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm text-oxblood hover:bg-parchment-deep/60 disabled:opacity-30"
        >
          {player.isPlaying ? <PauseIcon className="h-5 w-5" /> : <PlayIcon className="h-5 w-5" />}
        </button>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          aria-label={expanded ? "Ocultar controles" : "Mostrar controles"}
          className="flex min-w-0 flex-1 items-center gap-2 py-1 text-left"
        >
          <span className="min-w-0 flex-1 truncate text-sm text-ink">
            {player.currentTrack.title}
          </span>
          <span className="shrink-0 text-ink-muted">{expanded ? "▾" : "▴"}</span>
        </button>
      </div>
    </div>
  );
}
