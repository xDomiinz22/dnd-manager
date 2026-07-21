import type {
  AddParticipantsInput,
  CombatEncounterDto,
  CombatParticipantDto,
  RollInitiativeInput,
} from "@dnd-manager/shared";
import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import {
  rollFormula,
  buildRollFromClientValues,
  InvalidDiceFormulaError,
} from "../../lib/diceRoll";
import { getMembership } from "./authorization";
import { getActiveSession, mentionCombatEvent, mentionRollInActiveSession } from "./chatService";
import { resolveAssetUrl } from "./assetUrl";
import { AppError } from "../errors/AppError";

const PARTICIPANT_INCLUDE = {
  character: { select: { ownerId: true, portraitAsset: true } },
  enemy: { select: { portraitAsset: true } },
} as const;

const ENCOUNTER_INCLUDE = {
  participants: { include: PARTICIPANT_INCLUDE },
} as const;

type ParticipantWithRelations = Prisma.CombatParticipantGetPayload<{
  include: typeof PARTICIPANT_INCLUDE;
}>;
type EncounterWithParticipants = Prisma.CombatEncounterGetPayload<{
  include: typeof ENCOUNTER_INCLUDE;
}>;

function toParticipantDto(p: ParticipantWithRelations): CombatParticipantDto {
  const portraitAsset = p.character?.portraitAsset ?? p.enemy?.portraitAsset ?? null;
  return {
    id: p.id,
    kind: p.characterId ? "CHARACTER" : "ENEMY",
    characterId: p.characterId,
    enemyId: p.enemyId,
    displayName: p.displayName,
    portraitUrl: portraitAsset ? resolveAssetUrl(portraitAsset) : null,
    ownerId: p.character?.ownerId ?? null,
    initiativeTotal: p.initiativeTotal,
    initiativeBonus: p.initiativeBonus,
    turnOrder: p.turnOrder,
  };
}

function toEncounterDto(encounter: EncounterWithParticipants): CombatEncounterDto {
  const participants = [...encounter.participants].sort((a, b) => {
    if (a.turnOrder !== null && b.turnOrder !== null) return a.turnOrder - b.turnOrder;
    if (a.turnOrder !== null) return -1;
    if (b.turnOrder !== null) return 1;
    return a.createdAt.getTime() - b.createdAt.getTime();
  });
  return {
    id: encounter.id,
    groupId: encounter.groupId,
    sessionId: encounter.sessionId,
    round: encounter.round,
    currentTurnIndex: encounter.currentTurnIndex,
    startedAt: encounter.startedAt.toISOString(),
    participants: participants.map(toParticipantDto),
  };
}

async function getEncounterOrThrow(groupId: string): Promise<EncounterWithParticipants> {
  const encounter = await prisma.combatEncounter.findUnique({
    where: { groupId },
    include: ENCOUNTER_INCLUDE,
  });
  if (!encounter) {
    throw new AppError(404, "NO_ACTIVE_COMBAT", "No hay ningún combate activo en este grupo");
  }
  return encounter;
}

export async function getActiveCombat(groupId: string): Promise<CombatEncounterDto | null> {
  const encounter = await prisma.combatEncounter.findUnique({
    where: { groupId },
    include: ENCOUNTER_INCLUDE,
  });
  return encounter ? toEncounterDto(encounter) : null;
}

/**
 * Construye las filas de CombatParticipant a partir de los personajes/enemigos
 * indicados: valida que todos pertenezcan al grupo, congela displayName (con
 * numeral si hay varias copias del mismo enemigo) e initiativeBonus en ese
 * momento — nunca se vuelve a leer el bono "en vivo" del personaje/enemigo
 * después de añadido, para que el orden de turnos no cambie bajo los pies si
 * alguien edita su ficha a mitad de combate.
 */
async function buildParticipantsData(
  groupId: string,
  input: AddParticipantsInput,
): Promise<Prisma.CombatParticipantCreateManyEncounterInput[]> {
  const rows: Prisma.CombatParticipantCreateManyEncounterInput[] = [];

  if (input.characterIds.length > 0) {
    const characters = await prisma.characterSheet.findMany({
      where: { id: { in: input.characterIds }, groupId },
      select: { id: true, name: true, derived: true },
    });
    if (characters.length !== input.characterIds.length) {
      throw new AppError(
        422,
        "INVALID_CHARACTER",
        "Alguno de los personajes indicados no pertenece a este grupo",
      );
    }
    for (const character of characters) {
      const derived = character.derived as { initiative?: number } | null;
      rows.push({
        characterId: character.id,
        displayName: character.name,
        initiativeBonus: derived?.initiative ?? 0,
      });
    }
  }

  if (input.enemies.length > 0) {
    const enemyIds = input.enemies.map((e) => e.enemyId);
    const enemies = await prisma.enemyStatBlock.findMany({
      where: { id: { in: enemyIds }, groupId },
      select: { id: true, name: true, initiativeBonus: true },
    });
    if (enemies.length !== enemyIds.length) {
      throw new AppError(
        422,
        "INVALID_ENEMY",
        "Alguno de los enemigos indicados no pertenece a este grupo",
      );
    }
    const enemyById = new Map(enemies.map((e) => [e.id, e]));
    for (const entry of input.enemies) {
      const enemy = enemyById.get(entry.enemyId)!;
      for (let i = 1; i <= entry.count; i++) {
        rows.push({
          enemyId: enemy.id,
          displayName: entry.count > 1 ? `${enemy.name} ${i}` : enemy.name,
          initiativeBonus: enemy.initiativeBonus,
        });
      }
    }
  }

  if (rows.length === 0) {
    throw new AppError(422, "NO_PARTICIPANTS", "Añade al menos un combatiente");
  }

  return rows;
}

export async function startCombat(
  groupId: string,
  userId: string,
  input: AddParticipantsInput,
): Promise<CombatEncounterDto> {
  const session = await getActiveSession(groupId);
  if (!session) {
    throw new AppError(
      409,
      "NO_ACTIVE_SESSION",
      "Solo se puede iniciar un combate con una sesión de chat activa",
    );
  }

  const existing = await prisma.combatEncounter.findUnique({ where: { groupId } });
  if (existing) {
    throw new AppError(409, "COMBAT_ALREADY_ACTIVE", "Ya hay un combate activo en este grupo");
  }

  const participantsData = await buildParticipantsData(groupId, input);

  const encounter = await prisma.combatEncounter.create({
    data: {
      groupId,
      sessionId: session.id,
      startedByUserId: userId,
      participants: { createMany: { data: participantsData } },
    },
    include: ENCOUNTER_INCLUDE,
  });

  await mentionCombatEvent(groupId, userId, "STARTED", "Comienza el combate — ¡tirad iniciativa!");

  return toEncounterDto(encounter);
}

export async function addParticipants(
  groupId: string,
  input: AddParticipantsInput,
): Promise<CombatEncounterDto> {
  const existing = await getEncounterOrThrow(groupId);
  const participantsData = await buildParticipantsData(groupId, input);

  await prisma.combatParticipant.createMany({
    data: participantsData.map((row) => ({ ...row, encounterId: existing.id })),
  });

  const encounter = await prisma.combatEncounter.findUniqueOrThrow({
    where: { groupId },
    include: ENCOUNTER_INCLUDE,
  });
  return toEncounterDto(encounter);
}

export async function removeParticipant(
  groupId: string,
  participantId: string,
): Promise<CombatEncounterDto> {
  const existing = await getEncounterOrThrow(groupId);
  const participant = existing.participants.find((p) => p.id === participantId);
  if (!participant) {
    throw new AppError(404, "PARTICIPANT_NOT_FOUND", "Ese combatiente no está en este combate");
  }
  await prisma.combatParticipant.delete({ where: { id: participantId } });

  const remaining = existing.participants.length - 1;
  if (existing.currentTurnIndex !== null && existing.currentTurnIndex >= remaining) {
    await prisma.combatEncounter.update({
      where: { groupId },
      data: { currentTurnIndex: Math.max(0, remaining - 1) },
    });
  }

  const encounter = await prisma.combatEncounter.findUniqueOrThrow({
    where: { groupId },
    include: ENCOUNTER_INCLUDE,
  });
  return toEncounterDto(encounter);
}

function initiativeFormula(bonus: number): string {
  return bonus >= 0 ? `1d20+${bonus}` : `1d20${bonus}`;
}

/**
 * Solo el Master (siempre) o el dueño del personaje del combatiente puede
 * tirar su iniciativa; los enemigos son siempre cosa del Master. Es la nueva
 * regla de permisos que no encaja en middleware normal porque depende del
 * combate/combatiente en vivo, así que vive aquí (mismo criterio que el
 * chequeo de dueño ya existente en diceService.createGroupRoll).
 */
export async function rollInitiative(
  groupId: string,
  userId: string,
  input: RollInitiativeInput,
): Promise<CombatEncounterDto> {
  const encounter = await getEncounterOrThrow(groupId);
  const participant = encounter.participants.find((p) => p.id === input.participantId);
  if (!participant) {
    throw new AppError(404, "PARTICIPANT_NOT_FOUND", "Ese combatiente no está en este combate");
  }
  if (participant.initiativeTotal !== null) {
    throw new AppError(409, "ALREADY_ROLLED", "Ese combatiente ya tiró su iniciativa");
  }

  const membership = await getMembership(groupId, userId);
  const isMaster = membership?.role === "MASTER";
  if (!isMaster) {
    if (participant.enemyId) {
      throw new AppError(403, "NOT_ALLOWED", "Solo el Master maneja a los enemigos");
    }
    if (participant.character?.ownerId !== userId) {
      throw new AppError(
        403,
        "NOT_ALLOWED",
        "Solo el Master del grupo o el dueño del personaje pueden tirar por él",
      );
    }
  }

  const formula = initiativeFormula(participant.initiativeBonus);
  let result;
  try {
    result = input.rolls ? buildRollFromClientValues(formula, input.rolls) : rollFormula(formula);
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
      characterId: participant.characterId ?? null,
      label: `Iniciativa — ${participant.displayName}`,
      formula,
      rolls: result.rolls as unknown as Prisma.InputJsonValue,
      modifier: result.modifier,
      total: result.total,
    },
  });
  await mentionRollInActiveSession(groupId, userId, roll.id);

  await prisma.combatParticipant.update({
    where: { id: participant.id },
    data: { initiativeTotal: result.total },
  });

  const updated = await prisma.combatEncounter.findUniqueOrThrow({
    where: { groupId },
    include: ENCOUNTER_INCLUDE,
  });
  return toEncounterDto(updated);
}

export async function lockOrder(groupId: string, userId: string): Promise<CombatEncounterDto> {
  const encounter = await getEncounterOrThrow(groupId);
  const pending = encounter.participants.filter((p) => p.initiativeTotal === null);
  if (pending.length > 0) {
    throw new AppError(
      409,
      "INITIATIVE_PENDING",
      "Todos los combatientes deben tirar iniciativa antes de fijar el orden",
    );
  }

  const ordered = [...encounter.participants].sort((a, b) => {
    if (b.initiativeTotal! !== a.initiativeTotal!) return b.initiativeTotal! - a.initiativeTotal!;
    if (b.initiativeBonus !== a.initiativeBonus) return b.initiativeBonus - a.initiativeBonus;
    return a.id.localeCompare(b.id);
  });

  await prisma.$transaction([
    ...ordered.map((p, index) =>
      prisma.combatParticipant.update({ where: { id: p.id }, data: { turnOrder: index } }),
    ),
    prisma.combatEncounter.update({ where: { groupId }, data: { currentTurnIndex: 0, round: 1 } }),
  ]);

  await mentionCombatEvent(
    groupId,
    userId,
    "INITIATIVE_LOCKED",
    "El orden de turnos ha quedado fijado",
  );
  await mentionCombatEvent(groupId, userId, "TURN", `Turno de ${ordered[0]!.displayName}`);

  const updated = await prisma.combatEncounter.findUniqueOrThrow({
    where: { groupId },
    include: ENCOUNTER_INCLUDE,
  });
  return toEncounterDto(updated);
}

export async function advanceTurn(groupId: string, userId: string): Promise<CombatEncounterDto> {
  const encounter = await getEncounterOrThrow(groupId);
  if (encounter.currentTurnIndex === null) {
    throw new AppError(409, "ORDER_NOT_LOCKED", "Todavía no se ha fijado el orden de turnos");
  }

  const ordered = [...encounter.participants].sort(
    (a, b) => (a.turnOrder ?? 0) - (b.turnOrder ?? 0),
  );
  const nextIndex = (encounter.currentTurnIndex + 1) % ordered.length;
  const wrapped = nextIndex === 0;

  await prisma.combatEncounter.update({
    where: { groupId },
    data: {
      currentTurnIndex: nextIndex,
      round: wrapped ? encounter.round + 1 : encounter.round,
    },
  });

  const next = ordered[nextIndex]!;
  const roundLabel = wrapped ? ` (ronda ${encounter.round + 1})` : "";
  await mentionCombatEvent(groupId, userId, "TURN", `Turno de ${next.displayName}${roundLabel}`);

  const updated = await prisma.combatEncounter.findUniqueOrThrow({
    where: { groupId },
    include: ENCOUNTER_INCLUDE,
  });
  return toEncounterDto(updated);
}

export async function endCombat(groupId: string, userId: string): Promise<void> {
  await getEncounterOrThrow(groupId);
  await mentionCombatEvent(groupId, userId, "ENDED", "Fin del combate");
  await prisma.combatEncounter.delete({ where: { groupId } });
}
