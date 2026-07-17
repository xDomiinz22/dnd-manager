import type { ChatMessageDto, ChatSession, DieGroupResult } from "@dnd-manager/shared";
import { prisma } from "../../lib/prisma";
import { AppError } from "../errors/AppError";

type MessageWithRelations = {
  id: string;
  kind: "TEXT" | "ROLL";
  userId: string;
  user: { username: string };
  text: string | null;
  diceRoll: {
    id: string;
    label: string;
    formula: string;
    rolls: unknown;
    modifier: number;
    total: number;
    character: { name: string } | null;
  } | null;
  createdAt: Date;
};

const MESSAGE_INCLUDE = {
  user: { select: { username: true } },
  diceRoll: {
    select: {
      id: true,
      label: true,
      formula: true,
      rolls: true,
      modifier: true,
      total: true,
      character: { select: { name: true } },
    },
  },
} as const;

function toMessageDto(message: MessageWithRelations): ChatMessageDto {
  return {
    id: message.id,
    kind: message.kind,
    userId: message.userId,
    username: message.user.username,
    text: message.text,
    roll: message.diceRoll
      ? {
          id: message.diceRoll.id,
          characterName: message.diceRoll.character?.name ?? null,
          label: message.diceRoll.label,
          formula: message.diceRoll.formula,
          rolls: message.diceRoll.rolls as DieGroupResult[],
          modifier: message.diceRoll.modifier,
          total: message.diceRoll.total,
        }
      : null,
    createdAt: message.createdAt.toISOString(),
  };
}

export async function getActiveSession(groupId: string): Promise<ChatSession> {
  const session = await prisma.groupSession.findUnique({ where: { groupId } });
  return session ? { id: session.id, startedAt: session.startedAt.toISOString() } : null;
}

export async function startSession(groupId: string, userId: string): Promise<ChatSession> {
  const existing = await prisma.groupSession.findUnique({ where: { groupId } });
  if (existing) {
    throw new AppError(409, "SESSION_ALREADY_ACTIVE", "Ya hay una sesión de chat activa");
  }
  const session = await prisma.groupSession.create({
    data: { groupId, startedByUserId: userId },
  });
  return { id: session.id, startedAt: session.startedAt.toISOString() };
}

/** Borra la sesión y, en cascada, todos sus mensajes — el chat es efímero, "Tiradas" no se toca. */
export async function endSession(groupId: string): Promise<void> {
  const existing = await prisma.groupSession.findUnique({ where: { groupId } });
  if (!existing) {
    throw new AppError(404, "NO_ACTIVE_SESSION", "No hay ninguna sesión de chat activa");
  }
  await prisma.groupSession.delete({ where: { groupId } });
}

export async function listMessages(groupId: string): Promise<ChatMessageDto[]> {
  const session = await prisma.groupSession.findUnique({ where: { groupId } });
  if (!session) return [];
  const messages = await prisma.chatMessage.findMany({
    where: { sessionId: session.id },
    include: MESSAGE_INCLUDE,
    orderBy: { createdAt: "asc" },
  });
  return messages.map(toMessageDto);
}

export async function sendTextMessage(
  groupId: string,
  userId: string,
  text: string,
): Promise<ChatMessageDto> {
  const session = await prisma.groupSession.findUnique({ where: { groupId } });
  if (!session) {
    throw new AppError(404, "NO_ACTIVE_SESSION", "No hay ninguna sesión de chat activa");
  }
  const message = await prisma.chatMessage.create({
    data: { sessionId: session.id, userId, kind: "TEXT", text },
    include: MESSAGE_INCLUDE,
  });
  return toMessageDto(message);
}

/**
 * Si hay una sesión de chat activa en el grupo, "menciona" la tirada ya
 * creada en el chat (sin duplicar el dato — solo referencia su id). Se
 * llama desde diceService.createGroupRoll justo después de crear la tirada;
 * si no hay sesión activa, no hace nada.
 */
export async function mentionRollInActiveSession(
  groupId: string,
  userId: string,
  diceRollId: string,
) {
  const session = await prisma.groupSession.findUnique({ where: { groupId } });
  if (!session) return;
  await prisma.chatMessage.create({
    data: { sessionId: session.id, userId, kind: "ROLL", diceRollId },
  });
}
