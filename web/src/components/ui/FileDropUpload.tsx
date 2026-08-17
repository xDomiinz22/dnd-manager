import { useId, useRef, useState, type DragEvent } from "react";

interface FileDropUploadProps {
  label: string;
  error?: string;
  hideLabel?: boolean;
  /** Se llama con el contenido de texto ya leído por completo. También se
   * llama con "" al quitar el archivo, para limpiar el campo del formulario. */
  onFileLoaded: (text: string) => void;
  /** Extensión aceptada por el input file y el hint visual (ej. ".md"). */
  acceptExtension?: string;
  className?: string;
}

type FileState =
  | { status: "idle" }
  | { status: "loading"; fileName: string; progress: number }
  | { status: "loaded"; fileName: string; fileSize: number }
  | { status: "error"; message: string };

// Un .md de ficha suele leerse casi al instante — sin un mínimo, la barra
// pasaría de 0% a 100% en un parpadeo y no se llegaría a ver como "carga".
const MIN_LOAD_MS = 450;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Lee el archivo con progreso real (FileReader, no File.text()) — para
 * archivos grandes, `onprogress` sí refleja avance de verdad; para uno
 * pequeño puede que solo dispare una vez o ninguna antes de `onload`, así
 * que el 100% final SIEMPRE se fuerza ahí, no depende de que progress event
 * haya llegado a él por su cuenta. */
function readFileWithProgress(file: File, onProgress: (pct: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onprogress = (e) => {
      if (e.lengthComputable && e.total > 0) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    reader.onload = () => {
      onProgress(100);
      resolve(typeof reader.result === "string" ? reader.result : "");
    };
    reader.onerror = () => reject(reader.error ?? new Error("No se pudo leer el archivo."));
    reader.readAsText(file);
  });
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function UploadIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 16V4M12 4 8 8M12 4l4 4" />
      <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
    </svg>
  );
}

function FileIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M6 3h8l4 4v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
      <path d="M14 3v4h4" />
    </svg>
  );
}

/**
 * Reemplaza al viejo FileDropTextArea: antes el .md soltado/seleccionado
 * volcaba su contenido en un textarea grande (un "visor" del archivo
 * entero) — ahora es una zona de arrastrar-y-soltar de verdad, sin mostrar
 * nunca el texto crudo. Mientras se lee el archivo se ve una barra de
 * progreso; al terminar, una ficha con el nombre y tamaño reemplaza a la
 * zona de soltar, y es entonces cuando tiene sentido pulsar el botón de
 * envío del formulario (Importar/Actualizar) — antes de eso, la validación
 * del propio formulario (`md` vacío) ya lo impide igual que antes.
 */
export function FileDropUpload({
  label,
  error,
  hideLabel,
  onFileLoaded,
  acceptExtension = ".md",
  className = "",
}: FileDropUploadProps) {
  const inputId = useId();
  const [isDragging, setIsDragging] = useState(false);
  const [state, setState] = useState<FileState>({ status: "idle" });
  // Invalida cualquier lectura en curso si se suelta un archivo nuevo o se
  // quita el actual antes de que termine — sin esto, una lectura vieja que
  // termina tarde podría pisar el estado de una más reciente.
  const requestIdRef = useRef(0);

  async function loadFile(file: File) {
    const requestId = ++requestIdRef.current;

    if (acceptExtension && !file.name.toLowerCase().endsWith(acceptExtension.toLowerCase())) {
      setState({ status: "error", message: `Solo se admiten archivos ${acceptExtension}` });
      return;
    }

    setState({ status: "loading", fileName: file.name, progress: 0 });
    const start = performance.now();
    try {
      const text = await readFileWithProgress(file, (progress) => {
        if (requestIdRef.current !== requestId) return;
        setState((prev) => (prev.status === "loading" ? { ...prev, progress } : prev));
      });
      const elapsed = performance.now() - start;
      if (elapsed < MIN_LOAD_MS) await sleep(MIN_LOAD_MS - elapsed);
      if (requestIdRef.current !== requestId) return;
      setState({ status: "loaded", fileName: file.name, fileSize: file.size });
      onFileLoaded(text);
    } catch {
      if (requestIdRef.current !== requestId) return;
      setState({ status: "error", message: "No se pudo leer el archivo." });
    }
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) void loadFile(file);
  }

  function handleReset() {
    requestIdRef.current++;
    setState({ status: "idle" });
    onFileLoaded("");
  }

  return (
    <div className={`mb-3 ${className}`}>
      <p className={hideLabel ? "sr-only" : "mb-1 text-sm text-ink-muted"}>{label}</p>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className="rounded-sm"
      >
        <input
          id={inputId}
          type="file"
          accept={acceptExtension}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) void loadFile(file);
          }}
        />

        {state.status === "idle" || state.status === "error" ? (
          <label
            htmlFor={inputId}
            className={`flex cursor-pointer flex-col items-center gap-1.5 rounded-sm border border-dashed px-4 py-6 text-center transition-colors ${
              isDragging
                ? "border-oxblood bg-parchment-deep/60"
                : "border-rule-strong hover:bg-parchment-deep/30"
            }`}
          >
            <UploadIcon className="h-6 w-6 text-ink-muted" />
            <span className="text-sm text-ink">
              Arrastra tu archivo{acceptExtension ? ` ${acceptExtension}` : ""} aquí, o{" "}
              <span className="text-oxblood underline">selecciona uno</span>
            </span>
          </label>
        ) : (
          <div
            className={`flex items-center gap-3 rounded-sm border px-3 py-2.5 transition-colors ${
              state.status === "loaded"
                ? "border-moss bg-[#E3E8D0]/40"
                : isDragging
                  ? "border-oxblood bg-parchment-deep/60"
                  : "border-rule-strong bg-parchment"
            }`}
          >
            <FileIcon
              className={`h-5 w-5 shrink-0 ${state.status === "loaded" ? "text-moss" : "text-ink-muted"}`}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-ink">{state.fileName}</p>
              {state.status === "loading" ? (
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-parchment-deep">
                  <div
                    className="h-full rounded-full bg-oxblood transition-[width] duration-150 ease-out"
                    style={{ width: `${state.progress}%` }}
                  />
                </div>
              ) : (
                <p className="text-xs text-moss">
                  Cargado · {formatBytes(state.fileSize)} —{" "}
                  <label htmlFor={inputId} className="cursor-pointer underline hover:text-moss/80">
                    cambiar archivo
                  </label>
                </p>
              )}
            </div>
            {state.status === "loading" && (
              <span className="shrink-0 text-xs tabular-nums text-ink-muted">
                {state.progress}%
              </span>
            )}
            <button
              type="button"
              onClick={handleReset}
              aria-label="Quitar archivo"
              className="shrink-0 text-ink-muted hover:text-ink"
            >
              ×
            </button>
          </div>
        )}
      </div>

      {(error || state.status === "error") && (
        <p className="mt-1 text-sm text-oxblood-dark">
          {state.status === "error" ? state.message : error}
        </p>
      )}
    </div>
  );
}
