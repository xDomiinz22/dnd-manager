import { useMatch } from "react-router-dom";
import { useCharacter } from "../characters/hooks";

/**
 * Grupo "activo" para el panel de chat acoplado: a diferencia del reproductor
 * de música (que fija groupId a mano cuando se reproduce algo y sobrevive a
 * la navegación), el chat se deriva siempre de la ruta actual — solo existe
 * mientras se está dentro de las páginas de un grupo concreto.
 *
 * En /characters/:id solo se resuelve si el personaje se ve con acceso FULL
 * (dueño o Master): con acceso LIMITED el DTO no trae groupId.
 */
export function useCurrentGroupId(): string | null {
  const groupMatch = useMatch("/groups/:groupId/*");
  const characterMatch = useMatch("/characters/:characterId/*");
  const { data } = useCharacter(characterMatch?.params.characterId ?? "");

  if (groupMatch?.params.groupId) return groupMatch.params.groupId;
  if (characterMatch && data?.access === "FULL") return data.character.groupId;
  return null;
}
