import { randomInt } from "node:crypto";
import { Prisma } from "@prisma/client";
import type { GroupRoleValue, GroupDetail, GroupSummary } from "@dnd-manager/shared";
import { prisma } from "../../lib/prisma";
import { getMembership } from "./authorization";
import { classBreakdown } from "./foundryParser";
import { resolveAssetUrl } from "./assetUrl";
import { AppError } from "../errors/AppError";

// Sin 0/O/1/I/L: evita confusiones al transcribir el código a mano.
const INVITE_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const INVITE_CODE_LENGTH = 7;
const INVITE_CODE_MAX_ATTEMPTS = 5;

function generateInviteCode(): string {
  let code = "";
  for (let i = 0; i < INVITE_CODE_LENGTH; i++) {
    code += INVITE_CODE_ALPHABET[randomInt(INVITE_CODE_ALPHABET.length)];
  }
  return code;
}

function isUniqueConstraintOn(err: unknown, field: string): boolean {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    err.code === "P2002" &&
    ((err.meta?.target as string[] | undefined)?.includes(field) ?? false)
  );
}

export async function createGroup(masterId: string, name: string): Promise<GroupSummary> {
  for (let attempt = 0; attempt < INVITE_CODE_MAX_ATTEMPTS; attempt++) {
    const inviteCode = generateInviteCode();
    try {
      const group = await prisma.group.create({
        data: {
          name,
          inviteCode,
          masterId,
          members: { create: { userId: masterId, role: "MASTER" } },
        },
      });
      return {
        id: group.id,
        name: group.name,
        role: "MASTER",
        memberCount: 1,
        createdAt: group.createdAt.toISOString(),
      };
    } catch (err) {
      if (isUniqueConstraintOn(err, "inviteCode") && attempt < INVITE_CODE_MAX_ATTEMPTS - 1) {
        continue;
      }
      throw err;
    }
  }
  throw new AppError(
    500,
    "INVITE_CODE_COLLISION",
    "No se pudo generar un código de invitación único",
  );
}

export async function listGroupsForUser(userId: string): Promise<GroupSummary[]> {
  const memberships = await prisma.groupMember.findMany({
    where: { userId },
    include: { group: { include: { _count: { select: { members: true } } } } },
    orderBy: { joinedAt: "asc" },
  });

  return memberships.map((m) => ({
    id: m.group.id,
    name: m.group.name,
    role: m.role,
    memberCount: m.group._count.members,
    createdAt: m.group.createdAt.toISOString(),
  }));
}

export async function getGroupDetail(userId: string, groupId: string): Promise<GroupDetail> {
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: {
      master: true,
      members: { include: { user: true } },
      characters: { include: { owner: true, portraitAsset: true } },
    },
  });
  if (!group) throw new AppError(404, "GROUP_NOT_FOUND", "Grupo no encontrado");

  const membership = group.members.find((m) => m.userId === userId);
  if (!membership) throw new AppError(403, "NOT_GROUP_MEMBER", "No perteneces a este grupo");

  const isMaster = membership.role === "MASTER";

  return {
    id: group.id,
    name: group.name,
    inviteCode: group.inviteCode,
    role: membership.role,
    master: { id: group.master.id, username: group.master.username },
    members: group.members.map((m) => ({
      userId: m.userId,
      username: m.user.username,
      avatarUrl: m.user.avatarUrl,
      role: m.role,
      canEditMusic: m.canEditMusic,
    })),
    characters: group.characters.map((c) => {
      const fullAccess = isMaster || c.ownerId === userId;
      return {
        id: c.id,
        name: c.name,
        portraitUrl: c.portraitAsset ? resolveAssetUrl(c.portraitAsset) : null,
        ownerId: fullAccess ? c.ownerId : null,
        ownerUsername: fullAccess ? c.owner.username : null,
        level: fullAccess ? c.level : null,
        className: fullAccess ? c.className : null,
        classes: fullAccess ? classBreakdown(c.items) : null,
      };
    }),
    diceThemeColor: group.diceThemeColor,
    createdAt: group.createdAt.toISOString(),
  };
}

export async function joinGroup(userId: string, inviteCode: string): Promise<GroupSummary> {
  const group = await prisma.group.findUnique({ where: { inviteCode } });
  if (!group) throw new AppError(404, "INVALID_INVITE_CODE", "Código de invitación inválido");

  const existing = await getMembership(group.id, userId);
  const role: GroupRoleValue = existing?.role ?? "PLAYER";

  if (!existing) {
    await prisma.groupMember.create({ data: { groupId: group.id, userId, role: "PLAYER" } });
  }

  const memberCount = await prisma.groupMember.count({ where: { groupId: group.id } });
  return {
    id: group.id,
    name: group.name,
    role,
    memberCount,
    createdAt: group.createdAt.toISOString(),
  };
}

export async function regenerateInviteCode(groupId: string): Promise<string> {
  for (let attempt = 0; attempt < INVITE_CODE_MAX_ATTEMPTS; attempt++) {
    const inviteCode = generateInviteCode();
    try {
      const group = await prisma.group.update({ where: { id: groupId }, data: { inviteCode } });
      return group.inviteCode;
    } catch (err) {
      if (isUniqueConstraintOn(err, "inviteCode") && attempt < INVITE_CODE_MAX_ATTEMPTS - 1) {
        continue;
      }
      throw err;
    }
  }
  throw new AppError(
    500,
    "INVITE_CODE_COLLISION",
    "No se pudo generar un código de invitación único",
  );
}

export async function removeMember(
  groupId: string,
  targetUserId: string,
  requesterId: string,
  requesterRole: GroupRoleValue,
): Promise<void> {
  const target = await getMembership(groupId, targetUserId);
  if (!target) throw new AppError(404, "MEMBER_NOT_FOUND", "Ese usuario no es miembro del grupo");

  const group = await prisma.group.findUniqueOrThrow({
    where: { id: groupId },
    select: { masterId: true },
  });
  // Solo el dueño original del grupo (Group.masterId) es irremovible — no
  // basta con mirar el rol MASTER de la membresía, porque un jugador puede
  // haber recibido todos los permisos de Master (ver promoteMemberToMaster)
  // y aun así debe poder salir o ser expulsado con normalidad.
  if (targetUserId === group.masterId) {
    throw new AppError(
      400,
      "CANNOT_REMOVE_MASTER",
      "El Master no puede salir ni ser expulsado de su propio grupo",
    );
  }

  const isSelf = requesterId === targetUserId;
  if (!isSelf && requesterRole !== "MASTER") {
    throw new AppError(403, "NOT_GROUP_MASTER", "Solo el Master puede expulsar a otros miembros");
  }

  await prisma.groupMember.delete({ where: { groupId_userId: { groupId, userId: targetUserId } } });
}

/**
 * Concede o revoca a un miembro todos los permisos que tiene el Master,
 * cambiando su rol de membresía (MASTER/PLAYER): como casi todos los checks
 * de permisos de la app comprueban `membership.role === "MASTER"` (no
 * `Group.masterId`), esto le da/quita acceso completo a mapa, música,
 * tiradas/chat, personajes, etc. sin tocar nada más. El dueño original del
 * grupo (`Group.masterId`) nunca puede perder el rol MASTER por aquí — sigue
 * siendo el único miembro irremovible (ver removeMember).
 */
export async function setMemberRole(
  groupId: string,
  targetUserId: string,
  role: GroupRoleValue,
): Promise<void> {
  const target = await getMembership(groupId, targetUserId);
  if (!target) throw new AppError(404, "MEMBER_NOT_FOUND", "Ese usuario no es miembro del grupo");
  if (target.role === role) return;

  const group = await prisma.group.findUniqueOrThrow({
    where: { id: groupId },
    select: { masterId: true },
  });
  if (targetUserId === group.masterId) {
    throw new AppError(
      400,
      "CANNOT_CHANGE_OWNER_ROLE",
      "El dueño original del grupo siempre es Master",
    );
  }

  await prisma.groupMember.update({
    where: { groupId_userId: { groupId, userId: targetUserId } },
    data: { role },
  });
}

/** Solo el Master elige el color de los dados 3D — se aplica a las tiradas de todo el grupo. */
export async function setDiceThemeColor(groupId: string, diceThemeColor: string): Promise<void> {
  await prisma.group.update({ where: { id: groupId }, data: { diceThemeColor } });
}

/** Solo el Master concede/revoca permiso de gestionar la música ambiente a otro miembro. */
export async function setMemberMusicPermission(
  groupId: string,
  targetUserId: string,
  canEditMusic: boolean,
): Promise<void> {
  const target = await getMembership(groupId, targetUserId);
  if (!target) throw new AppError(404, "MEMBER_NOT_FOUND", "Ese usuario no es miembro del grupo");

  await prisma.groupMember.update({
    where: { groupId_userId: { groupId, userId: targetUserId } },
    data: { canEditMusic },
  });
}
