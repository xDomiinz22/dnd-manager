interface IconProps {
  className?: string;
}

const BASE = "h-4 w-4";

export function PlayIcon({ className = BASE }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M8 5.5v13a1 1 0 0 0 1.53.85l10.4-6.5a1 1 0 0 0 0-1.7l-10.4-6.5A1 1 0 0 0 8 5.5Z" />
    </svg>
  );
}

export function PauseIcon({ className = BASE }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M7 5a1 1 0 0 1 1 1v12a1 1 0 1 1-2 0V6a1 1 0 0 1 1-1Zm9 0a1 1 0 0 1 1 1v12a1 1 0 1 1-2 0V6a1 1 0 0 1 1-1Z" />
    </svg>
  );
}

export function SkipNextIcon({ className = BASE }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M6 5.5a1 1 0 0 1 1.53-.85l9 6.5a1 1 0 0 1 0 1.7l-9 6.5A1 1 0 0 1 6 18.5v-13Z" />
      <rect x="16" y="5" width="2" height="14" rx="1" />
    </svg>
  );
}

export function SkipPrevIcon({ className = BASE }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M18 5.5a1 1 0 0 0-1.53-.85l-9 6.5a1 1 0 0 0 0 1.7l9 6.5A1 1 0 0 0 18 18.5v-13Z" />
      <rect x="6" y="5" width="2" height="14" rx="1" />
    </svg>
  );
}

export function ShuffleIcon({ className = BASE }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M3 6h3.5c1.8 0 3.4 1 4.3 2.5" />
      <path d="M3 18h3.5c1.8 0 3.4-1 4.3-2.5" />
      <path d="M14 6h3.5c1.3 0 2.5.6 3.3 1.6" />
      <path d="M14 18h3.5c1.3 0 2.5-.6 3.3-1.6" />
      <path d="M18 4l3 2.6-3 2.6" />
      <path d="M18 20l3-2.6-3-2.6" />
      <path d="M10.5 15.5 9 17.5" />
    </svg>
  );
}

export function RepeatIcon({ className = BASE }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M4 9a4 4 0 0 1 4-4h9" />
      <path d="M15 3l2 2-2 2" />
      <path d="M20 15a4 4 0 0 1-4 4H7" />
      <path d="M9 21l-2-2 2-2" />
      <text x="12" y="15" fontSize="8" textAnchor="middle" stroke="none" fill="currentColor">
        1
      </text>
    </svg>
  );
}

export function VolumeIcon({ className = BASE }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M4 10v4h4l5 4V6l-5 4H4Z" fill="currentColor" stroke="none" />
      <path d="M16.5 9a4 4 0 0 1 0 6" />
      <path d="M19 6.5a8 8 0 0 1 0 11" />
    </svg>
  );
}
