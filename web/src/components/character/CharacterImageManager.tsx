import { useEffect, useRef, useState } from "react";
import {
  useCharacterImages,
  useChangePortrait,
  useDeleteCharacterImage,
  useUploadCharacterImage,
} from "../../features/characters/hooks";
import { useModalTransition } from "../../lib/useMountTransition";
import { Button } from "../ui/Button";
import { toErrorMessage, useToast } from "../ui/Toast";

const MODAL_TRANSITION_MS = 150;

interface CharacterImageManagerProps {
  characterId: string;
  portraitAssetId: string | null;
}

export function CharacterImageManager({
  characterId,
  portraitAssetId,
}: CharacterImageManagerProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-3">
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Cambiar imagen
      </Button>
      {open && (
        <CharacterImageModal
          characterId={characterId}
          portraitAssetId={portraitAssetId}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}

function CharacterImageModal({
  characterId,
  portraitAssetId,
  onClose,
}: {
  characterId: string;
  portraitAssetId: string | null;
  onClose: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const { data: images } = useCharacterImages(characterId);
  const uploadImage = useUploadCharacterImage(characterId);
  const changePortrait = useChangePortrait(characterId);
  const deleteImage = useDeleteCharacterImage(characterId);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const { visible, handleClose: close } = useModalTransition(onClose, MODAL_TRANSITION_MS);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [close]);

  function handleFile(file: File) {
    uploadImage.mutate(file, {
      onSuccess: () => toast.success("Imagen subida."),
      onError: (err) => toast.error(toErrorMessage(err, "No se pudo subir la imagen.")),
    });
  }

  function handleSetMain(assetId: string) {
    changePortrait.mutate(
      { assetId },
      {
        onSuccess: () => toast.success("Imagen principal actualizada."),
        onError: (err) =>
          toast.error(toErrorMessage(err, "No se pudo cambiar la imagen principal.")),
      },
    );
  }

  function handleDelete(assetId: string) {
    deleteImage.mutate(assetId, {
      onSuccess: () => {
        toast.success("Imagen borrada.");
        setConfirmingId(null);
      },
      onError: (err) => toast.error(toErrorMessage(err, "No se pudo borrar la imagen.")),
    });
  }

  return (
    <div
      role="presentation"
      onClick={close}
      className={`fixed inset-0 z-40 flex items-center justify-center bg-abyss/40 p-4 backdrop-blur-sm transition-opacity duration-150 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Imágenes del personaje"
        onClick={(e) => e.stopPropagation()}
        className={`relative flex max-h-[80vh] w-full max-w-sm flex-col rounded-sm border border-rule/70 bg-parchment-panel/80 p-6 shadow-2xl backdrop-blur-xl transition-[opacity,transform] duration-150 ${
          visible ? "scale-100 opacity-100" : "scale-95 opacity-0"
        }`}
      >
        <button
          type="button"
          onClick={close}
          aria-label="Cerrar"
          className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full text-ink-muted hover:bg-parchment-deep/60 hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-oxblood"
        >
          ×
        </button>

        <h2 className="mb-3 font-display text-sm tracking-wide text-oxblood">
          Imágenes del personaje
        </h2>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {images && images.length > 0 ? (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {images.map((img) => {
                const isActive = img.id === portraitAssetId;
                return (
                  <div key={img.id} className="group relative">
                    <button
                      type="button"
                      onClick={() => !isActive && handleSetMain(img.id)}
                      title={isActive ? "Imagen principal" : "Marcar como principal"}
                      className={`aspect-square w-full overflow-hidden rounded-sm border-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-oxblood ${
                        isActive
                          ? "border-oxblood"
                          : "border-rule-strong hover:bg-parchment-deep/40"
                      }`}
                    >
                      <img
                        src={img.url}
                        alt={img.originalName ?? "Imagen del personaje"}
                        className="h-full w-full object-cover"
                      />
                    </button>
                    {!isActive && (
                      <button
                        type="button"
                        onClick={() => setConfirmingId(img.id)}
                        aria-label="Borrar imagen"
                        className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-oxblood-dark text-xs leading-none text-ivory opacity-0 focus-visible:opacity-100 group-hover:opacity-100"
                      >
                        ×
                      </button>
                    )}
                    {confirmingId === img.id && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-sm bg-abyss/80 p-1 text-center">
                        <span className="text-[0.65rem] leading-tight text-ivory">¿Borrar?</span>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => handleDelete(img.id)}
                            disabled={deleteImage.isPending}
                            aria-label="Confirmar borrado"
                            className="flex h-5 w-5 items-center justify-center rounded-full bg-oxblood-dark text-xs leading-none text-ivory hover:bg-oxblood disabled:opacity-50"
                          >
                            ✓
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmingId(null)}
                            disabled={deleteImage.isPending}
                            aria-label="Cancelar"
                            className="flex h-5 w-5 items-center justify-center rounded-full bg-parchment-panel text-xs leading-none text-ink hover:bg-parchment disabled:opacity-50"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="py-6 text-center text-sm text-ink-muted">Todavía no hay imágenes.</p>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = "";
          }}
        />
        <Button
          variant="secondary"
          isLoading={uploadImage.isPending}
          loadingText="Subiendo..."
          onClick={() => fileInputRef.current?.click()}
          className="mt-3"
        >
          Añadir imagen
        </Button>
      </div>
    </div>
  );
}
