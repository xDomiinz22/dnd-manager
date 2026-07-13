import { useEffect } from "react";

interface ItemDetailModalProps {
  title: string;
  descriptionHtml: string;
  onClose: () => void;
}

/**
 * Popup con fondo difuminado para el detalle de un objeto/rasgo/conjuro de la
 * ficha (mismo lenguaje visual que `CharacterProfileModal`), en vez del
 * desplegable `<details>/<summary>` nativo que usaba antes cada pestaña.
 */
export function ItemDetailModal({ title, descriptionHtml, onClose }: ItemDetailModalProps) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return (
    <div
      role="presentation"
      onClick={onClose}
      className="fixed inset-0 z-40 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="relative max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-sm border border-rule/70 bg-parchment-panel/60 p-6 shadow-2xl backdrop-blur-xl sm:p-8"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full text-ink-muted hover:bg-parchment-deep/60 hover:text-oxblood focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-oxblood"
        >
          ×
        </button>
        <h2 className="pr-8 font-display text-lg tracking-wide text-oxblood">{title}</h2>
        <div
          className="prose-sm mt-3 text-sm text-ink"
          dangerouslySetInnerHTML={{ __html: descriptionHtml }}
        />
      </div>
    </div>
  );
}
