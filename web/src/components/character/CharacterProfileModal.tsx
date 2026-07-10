import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useCharacter } from "../../features/characters/hooks";
import { PortraitCircle } from "./PortraitCircle";

export function CharacterProfileModal() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading } = useCharacter(id!);

  function close() {
    navigate(-1);
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") navigate(-1);
    }
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [navigate]);

  useEffect(() => {
    // Si resulta tener acceso FULL (p. ej. cambió tu rol mientras el modal
    // estaba abierto), no tiene sentido mostrar la vista reducida: se lleva
    // a la ficha completa sin dejar el historial de fondo en el modal.
    if (data?.access === "FULL") {
      navigate(`/characters/${id}`, { replace: true });
    }
  }, [data, id, navigate]);

  return (
    <div
      role="presentation"
      onClick={close}
      className="fixed inset-0 z-40 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={data ? `Perfil de ${data.character.name}` : "Perfil de personaje"}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-xs rounded-sm border border-rule/70 bg-parchment-panel/60 p-8 text-center shadow-2xl backdrop-blur-xl"
      >
        <button
          type="button"
          onClick={close}
          aria-label="Cerrar"
          className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full text-ink-muted hover:bg-parchment-deep/60 hover:text-oxblood focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-oxblood"
        >
          ×
        </button>

        {isLoading || !data ? (
          <div className="animate-pulse">
            <div className="mx-auto h-32 w-32 rounded-full bg-parchment-deep/60" />
            <div className="mx-auto mt-4 h-5 w-32 rounded-sm bg-parchment-deep/60" />
          </div>
        ) : (
          <>
            <div className="flex justify-center">
              <PortraitCircle
                url={data.character.portraitUrl}
                name={data.character.name}
                size={128}
              />
            </div>
            <h1 className="mt-4 font-display text-xl tracking-wide text-oxblood">
              {data.character.name}
            </h1>
            <p className="mt-2 text-sm text-ink-muted">
              Solo puedes ver el nombre y la foto de este personaje.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
