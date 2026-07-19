import {
  PauseIcon,
  PlayIcon,
  RepeatIcon,
  ShuffleIcon,
  SkipNextIcon,
  SkipPrevIcon,
  VolumeIcon,
} from "../ui/PlayerIcons";

interface PlayerControlsProps {
  isPlaying: boolean;
  isReady: boolean;
  shuffle: boolean;
  loop: boolean;
  volume: number;
  onTogglePlayPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  onToggleShuffle: () => void;
  onToggleLoop: () => void;
  onVolumeChange: (volume: number) => void;
  className?: string;
}

const ICON_BUTTON =
  "flex h-8 w-8 items-center justify-center rounded-sm transition-shadow disabled:opacity-30";

const TOGGLE_ACTIVE =
  "bg-oxblood text-ivory shadow-[0_0_0_1px_rgba(201,162,39,0.6)] hover:bg-oxblood-dark";
const TOGGLE_INACTIVE = "text-ink-muted hover:bg-parchment-deep/60 hover:text-ink";

/**
 * Fila de controles de transporte compartida entre la barra "reproduciendo
 * ahora" de GroupMusicPage y el panel expandido de la mini-barra global.
 */
export function PlayerControls({
  isPlaying,
  isReady,
  shuffle,
  loop,
  volume,
  onTogglePlayPause,
  onNext,
  onPrev,
  onToggleShuffle,
  onToggleLoop,
  onVolumeChange,
  className = "",
}: PlayerControlsProps) {
  return (
    <div className={`flex flex-wrap items-center gap-1 ${className}`}>
      <button
        type="button"
        onClick={onToggleShuffle}
        aria-label="Reproducción aleatoria"
        aria-pressed={shuffle}
        className={`${ICON_BUTTON} ${shuffle ? TOGGLE_ACTIVE : TOGGLE_INACTIVE}`}
      >
        <ShuffleIcon />
      </button>
      <button
        type="button"
        onClick={(e) => {
          onPrev();
          e.currentTarget.blur();
        }}
        aria-label="Track anterior"
        className={`${ICON_BUTTON} text-ink hover:bg-parchment-deep/60 hover:text-ink`}
      >
        <SkipPrevIcon />
      </button>
      <button
        type="button"
        onClick={(e) => {
          onTogglePlayPause();
          e.currentTarget.blur();
        }}
        disabled={!isReady}
        aria-label={isPlaying ? "Pausar" : "Reproducir"}
        className={`${ICON_BUTTON} text-oxblood hover:bg-parchment-deep/60`}
      >
        {isPlaying ? <PauseIcon className="h-5 w-5" /> : <PlayIcon className="h-5 w-5" />}
      </button>
      <button
        type="button"
        onClick={(e) => {
          onNext();
          e.currentTarget.blur();
        }}
        aria-label="Siguiente track"
        className={`${ICON_BUTTON} text-ink hover:bg-parchment-deep/60 hover:text-ink`}
      >
        <SkipNextIcon />
      </button>
      <button
        type="button"
        onClick={onToggleLoop}
        aria-label="Repetir este track"
        aria-pressed={loop}
        className={`${ICON_BUTTON} ${loop ? TOGGLE_ACTIVE : TOGGLE_INACTIVE}`}
      >
        <RepeatIcon />
      </button>
      <div className="flex items-center gap-1 pl-1 text-ink-muted">
        <VolumeIcon className="h-4 w-4" />
        <input
          type="range"
          min={0}
          max={100}
          value={volume}
          onChange={(e) => onVolumeChange(Number(e.target.value))}
          aria-label="Volumen"
          className="w-20 accent-oxblood"
        />
      </div>
    </div>
  );
}
