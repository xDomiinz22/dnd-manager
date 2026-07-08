import { prisma } from "../../lib/prisma";
import type { GroupMember } from "@prisma/client";

export type CharacterAccessLevel = "FULL" | "LIMITED" | "NONE";

export function getMembership(groupId: string, userId: string): Promise<GroupMember | null> {
  return prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
  });
}

/**
 * Nivel de acceso de `userId` a una ficha de un personaje de `groupId` propiedad de `ownerId`:
 * FULL para el Master del grupo o el dueño de la ficha, LIMITED para el resto de miembros
 * (solo nombre + foto), NONE si ni siquiera pertenece al grupo.
 */
export async function resolveCharacterAccess(
  userId: string,
  character: { ownerId: string; groupId: string },
): Promise<CharacterAccessLevel> {
  const membership = await getMembership(character.groupId, userId);
  if (!membership) return "NONE";
  if (membership.role === "MASTER" || character.ownerId === userId) return "FULL";
  return "LIMITED";
}
