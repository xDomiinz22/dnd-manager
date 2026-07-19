import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

type ToastKind = "success" | "error" | "info";

interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
  // Empieza la transición de salida (fade + deslizar) antes de que se quite
  // de la lista de verdad — sin esto, un toast simplemente desaparecía del
  // array y de la pantalla en el mismo instante.
  leaving: boolean;
}

interface ToastContextValue {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const KIND_CLASSES: Record<ToastKind, string> = {
  success: "border-moss bg-[#E3E8D0] text-moss",
  error: "border-oxblood bg-[#F3DCDD] text-oxblood-dark",
  info: "border-rule bg-parchment-panel text-ink",
};

const TOAST_DURATION_MS = 4000;
const TOAST_EXIT_MS = 200;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, TOAST_EXIT_MS);
  }, []);

  const push = useCallback(
    (kind: ToastKind, message: string) => {
      const id = nextId.current++;
      setToasts((prev) => [...prev, { id, kind, message, leaving: false }]);
      setTimeout(() => dismiss(id), TOAST_DURATION_MS);
    },
    [dismiss],
  );

  const value: ToastContextValue = {
    success: (message) => push("success", message),
    error: (message) => push("error", message),
    info: (message) => push("info", message),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-full max-w-sm flex-col gap-2 px-4 sm:px-0"
      >
        {toasts.map((t) => (
          <ToastEntry key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastEntry({ toast, onDismiss }: { toast: ToastItem; onDismiss: () => void }) {
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(raf);
  }, []);
  const visible = entered && !toast.leaving;

  return (
    <div
      role="status"
      className={`pointer-events-auto rounded-sm border px-4 py-3 text-sm shadow-xl transition-[opacity,transform] duration-200 ease-out ${
        KIND_CLASSES[toast.kind]
      } ${visible ? "[transform:translateX(0)] opacity-100" : "[transform:translateX(24px)] opacity-0"}`}
    >
      <div className="flex items-start justify-between gap-3">
        <span>{toast.message}</span>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Cerrar notificación"
          className="shrink-0 text-current opacity-70 hover:opacity-100"
        >
          ×
        </button>
      </div>
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast debe usarse dentro de ToastProvider");
  return ctx;
}

export function toErrorMessage(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}
