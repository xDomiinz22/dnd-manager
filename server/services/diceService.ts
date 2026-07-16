import type { CreateRollInput, DiceRollDto } from "@dnd-manager/shared";
import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { rollFormula, InvalidDiceFormulaError } from "../../lib/diceRoll";
import { getMembership } from "./authorization";
import { mentionRollInActiveSession } from "./chatService";
import { AppError } from "../errors/AppError";

const ROLL_INCLUDE = {
  user: { select: { username: true } },
  character: { select: { name: true } },
} as const;

type RollWithRelations = {
  id: string;
  characterId: string | null;
  character: { name: string } | null;
  userId: string;
  user: { username: string };
  label: string;
  formula: string;
  rolls: unknown;
  modifier: number;
  total: number;
  createdAt: Date;
};

function toDiceRollDto(roll: RollWithRelations): DiceRollDto {
  return {
    id: roll.id,
    characterId: roll.characterId,
    characterName: roll.character?.name ?? null,
    userId: roll.userId,
    username: roll.user.username,
    label: roll.label,
    formula: roll.formula,
    rolls: roll.rolls as DiceRollDto["rolls"],
    modifier: roll.modifier,
    total: roll.total,
    createdAt: roll.createdAt.toISOString(),
  };
}

const DEFAULT_LIMIT = 50;

export async function listGroupRolls(
  groupId: string,
  limit = DEFAULT_LIMIT,
): Promise<DiceRollDto[]> {
  const rolls = await prisma.diceRoll.findMany({
    where: { groupId },
    include: ROLL_INCLUDE,
    orderBy: { createdAt: "desc" },
    take: Math.min(limit, 200),
  });
  return rolls.map(toDiceRollDto);
}

/**
 * El resultado se calcula aquí, nunca se acepta un total mandado por el
 * cliente. Si la tirada va ligada a un personaje, solo puede lanzarla el
 * Master del grupo o el dueño de ese personaje (igual que editar sus PG) —
 * evita que un jugador tire "en nombre" de la ficha de otro.
 */
export async function createGroupRoll(
  groupId: string,
  userId: string,
  input: CreateRollInput,
): Promise<DiceRollDto> {
  if (input.characterId) {
    const character = await prisma.characterSheet.findUnique({
      where: { id: input.characterId },
      select: { id: true, groupId: true, ownerId: true },
    });
    if (!character || character.groupId !== groupId) {
      throw new AppError(
        422,
        "INVALID_CHARACTER",
        "El personaje indicado no pertenece a este grupo",
      );
    }
    if (character.ownerId !== userId) {
      const membership = await getMembership(groupId, userId);
      if (!membership || membership.role !== "MASTER") {
        throw new AppError(
          403,
          "NOT_ALLOWED",
          "Solo el Master del grupo o el dueño del personaje pueden tirar por él",
        );
      }
    }
  }

  let result;
  try {
    result = rollFormula(input.formula);
  } catch (err) {
    if (err instanceof InvalidDiceFormulaError) {
      throw new AppError(400, "INVALID_DICE_FORMULA", err.message);
    }
    throw err;
  }

  const roll = await prisma.diceRoll.create({
    data: {
      groupId,
      userId,
      characterId: input.characterId ?? null,
      label: input.label,
      formula: input.formula,
      rolls: result.rolls as unknown as Prisma.InputJsonValue,
      modifier: result.modifier,
      total: result.total,
    },
    include: ROLL_INCLUDE,
  });

  await mentionRollInActiveSession(groupId, userId, roll.id);

  return toDiceRollDto(roll);
}
