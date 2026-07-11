import { useEffect, useRef, useState } from "react";
import {
  useCharacterImages,
  useChangePortrait,
  useDeleteCharacterImage,
  useUploadCharacterImage,
} from "../../features/characters/hooks";
import { Button } from "../ui/Button";
import { toErrorMessage, useToast } from "../ui/Toast";

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
      onSuccess: () => toast.success("Imagen borrada."),
      onError: (err) => toast.error(toErrorMessage(err, "No se pudo borrar la imagen.")),
    });
  }

  return (
    <div
      role="presentation"
      onClick={onClose}
      className="fixed inset-0 z-40 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Imágenes del personaje"
        onClick={(e) => e.stopPropagation()}
        className="relative flex max-h-[80vh] w-full max-w-sm flex-col rounded-sm border border-rule/70 bg-parchment-panel/80 p-6 shadow-2xl backdrop-blur-xl"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full text-ink-muted hover:bg-parchment-deep/60 hover:text-oxblood focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-oxblood"
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
                        isActive ? "border-oxblood" : "border-rule-strong hover:border-oxblood"
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
                        onClick={() => handleDelete(img.id)}
                        aria-label="Borrar imagen"
                        className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-oxblood-dark text-xs leading-none text-parchment opacity-0 focus-visible:opacity-100 group-hover:opacity-100"
                      >
                        ×
                      </button>
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
