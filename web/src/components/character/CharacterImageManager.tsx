import { useRef } from "react";
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const { data: images } = useCharacterImages(characterId);
  const uploadImage = useUploadCharacterImage(characterId);
  const changePortrait = useChangePortrait(characterId);
  const deleteImage = useDeleteCharacterImage(characterId);

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
    <div className="mt-3">
      {images && images.length > 0 && (
        <div className="mb-2 flex flex-wrap justify-center gap-2 sm:justify-start">
          {images.map((img) => {
            const isActive = img.id === portraitAssetId;
            return (
              <div key={img.id} className="group relative">
                <button
                  type="button"
                  onClick={() => !isActive && handleSetMain(img.id)}
                  title={isActive ? "Imagen principal" : "Marcar como principal"}
                  className={`h-14 w-14 overflow-hidden rounded-sm border-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-oxblood ${
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
      )}

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
      >
        Añadir imagen
      </Button>
    </div>
  );
}
