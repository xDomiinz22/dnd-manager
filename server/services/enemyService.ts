import type {
  CreateEnemyInput,
  EnemyFull,
  EnemyListItem,
  ImportEnemyInput,
  UpdateEnemyInput,
} from "@dnd-manager/shared";
import { Prisma } from "@prisma/client";
import type { Asset, EnemyStatBlock } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { convertImageToWebp } from "../../lib/imageConversion";
import { parseFoundryMd } from "./foundryParser";
import { resolveAssetUrl } from "./assetUrl";
import { AppError } from "../errors/AppError";

export type EnemyWithPortrait = EnemyStatBlock & { portraitAsset: Asset | null };

function toEnemyFull(enemy: EnemyWithPortrait): EnemyFull {
  return {
    id: enemy.id,
    groupId: enemy.groupId,
    name: enemy.name,
    maxHp: enemy.maxHp,
    armorClass: enemy.armorClass,
    initiativeBonus: enemy.initiativeBonus,
    portraitUrl: enemy.portraitAsset ? resolveAssetUrl(enemy.portraitAsset) : null,
    portraitAssetId: enemy.portraitAssetId,
    quickAttacks: enemy.quickAttacks as EnemyFull["quickAttacks"],
    rawSystem: enemy.rawSystem,
    items: enemy.items,
    derived: enemy.derived as EnemyFull["derived"],
    sourceMdHash: enemy.sourceMdHash,
    createdAt: enemy.createdAt.toISOString(),
    updatedAt: enemy.updatedAt.toISOString(),
  };
}

async function assertValidPortraitAsset(assetId: string | undefined): Promise<void> {
  if (!assetId) return;
  const asset = await prisma.asset.findUnique({ where: { id: assetId } });
  if (!asset || asset.kind !== "IMAGE") {
    throw new AppError(
      422,
      "INVALID_PORTRAIT_ASSET",
      "El asset indicado no existe o no es una imagen",
    );
  }
}

export async function getEnemyOrThrow(id: string): Promise<EnemyWithPortrait> {
  const enemy = await prisma.enemyStatBlock.findUnique({
    where: { id },
    include: { portraitAsset: true },
  });
  if (!enemy) throw new AppError(404, "ENEMY_NOT_FOUND", "Enemigo no encontrado");
  return enemy;
}

export async function createQuickEnemy(
  groupId: string,
  input: CreateEnemyInput,
): Promise<EnemyFull> {
  await assertValidPortraitAsset(input.portraitAssetId);

  const enemy = await prisma.enemyStatBlock.create({
    data: {
      groupId,
      name: input.name,
      maxHp: input.maxHp,
      armorClass: input.armorClass ?? null,
      initiativeBonus: input.initiativeBonus,
      quickAttacks: input.quickAttacks as unknown as Prisma.InputJsonValue,
      portraitAssetId: input.portraitAssetId ?? null,
    },
    include: { portraitAsset: true },
  });
  return toEnemyFull(enemy);
}

export async function importEnemy(groupId: string, input: ImportEnemyInput): Promise<EnemyFull> {
  await assertValidPortraitAsset(input.portraitAssetId);
  const parsed = parseFoundryMd(input.md);

  const enemy = await prisma.enemyStatBlock.create({
    data: {
      groupId,
      name: parsed.name,
      maxHp: parsed.derived.hitPoints.max,
      armorClass: parsed.derived.armorClass.computed,
      initiativeBonus: parsed.derived.initiative,
      quickAttacks: Prisma.JsonNull,
      rawSystem: parsed.rawSystem,
      items: parsed.items as Prisma.InputJsonValue,
      derived: parsed.derived as unknown as Prisma.InputJsonValue,
      sourceMdHash: parsed.sourceMdHash,
      portraitAssetId: input.portraitAssetId ?? null,
    },
    include: { portraitAsset: true },
  });
  return toEnemyFull(enemy);
}

export async function importEnemyMd(id: string, md: string): Promise<EnemyFull> {
  const existing = await getEnemyOrThrow(id);
  const parsed = parseFoundryMd(md);

  const enemy = await prisma.enemyStatBlock.update({
    where: { id: existing.id },
    data: {
      name: parsed.name,
      maxHp: parsed.derived.hitPoints.max,
      armorClass: parsed.derived.armorClass.computed,
      initiativeBonus: parsed.derived.initiative,
      quickAttacks: Prisma.JsonNull,
      rawSystem: parsed.rawSystem,
      items: parsed.items as Prisma.InputJsonValue,
      derived: parsed.derived as unknown as Prisma.InputJsonValue,
      sourceMdHash: parsed.sourceMdHash,
    },
    include: { portraitAsset: true },
  });
  return toEnemyFull(enemy);
}

export async function updateEnemy(id: string, input: UpdateEnemyInput): Promise<EnemyFull> {
  const existing = await getEnemyOrThrow(id);
  await assertValidPortraitAsset(input.portraitAssetId);

  const enemy = await prisma.enemyStatBlock.update({
    where: { id: existing.id },
    data: {
      name: input.name,
      maxHp: input.maxHp,
      armorClass: input.armorClass,
      initiativeBonus: input.initiativeBonus,
      quickAttacks:
        input.quickAttacks !== undefined
          ? (input.quickAttacks as unknown as Prisma.InputJsonValue)
          : undefined,
      portraitAssetId: input.portraitAssetId,
    },
    include: { portraitAsset: true },
  });
  return toEnemyFull(enemy);
}

/** Borra la ficha y sus imágenes (retrato + galería), igual que deleteCharacter. */
export async function deleteEnemy(id: string): Promise<void> {
  const existing = await getEnemyOrThrow(id);
  await prisma.$transaction([
    prisma.asset.deleteMany({ where: { enemyId: existing.id } }),
    prisma.enemyStatBlock.delete({ where: { id: existing.id } }),
  ]);
}

/**
 * Lista/detalle de enemigos: el Master ve la ficha completa (stats, ataques),
 * el resto de miembros solo id/nombre/foto (regla de negocio — nunca el
 * "stat block" mecánico), mismo patrón que characterRosterEntrySchema.
 */
export async function listEnemies(groupId: string, isMaster: boolean): Promise<EnemyListItem[]> {
  const enemies = await prisma.enemyStatBlock.findMany({
    where: { groupId },
    include: { portraitAsset: true },
    orderBy: { createdAt: "asc" },
  });
  return enemies.map((enemy) => toEnemyListItem(enemy, isMaster));
}

export async function getEnemy(id: string, isMaster: boolean): Promise<EnemyListItem> {
  const enemy = await getEnemyOrThrow(id);
  return toEnemyListItem(enemy, isMaster);
}

function toEnemyListItem(enemy: EnemyWithPortrait, isMaster: boolean): EnemyListItem {
  if (isMaster) return { access: "FULL", enemy: toEnemyFull(enemy) };
  return {
    access: "LIMITED",
    enemy: {
      id: enemy.id,
      name: enemy.name,
      portraitUrl: enemy.portraitAsset ? resolveAssetUrl(enemy.portraitAsset) : null,
    },
  };
}

/** Sube una imagen a la galería del enemigo; la primera se marca como retrato. */
export async function addEnemyImage(
  enemyId: string,
  uploaderId: string,
  data: Buffer,
  originalName: string | null,
): Promise<{ asset: Asset; enemy: EnemyFull }> {
  const existing = await getEnemyOrThrow(enemyId);
  const converted = await convertImageToWebp(data, originalName).catch(() => {
    throw new AppError(
      400,
      "INVALID_IMAGE",
      "El archivo no es una imagen soportada (JPEG, PNG, WEBP o GIF).",
    );
  });

  const asset = await prisma.asset.create({
    data: {
      ownerId: uploaderId,
      kind: "IMAGE",
      mime: converted.mime,
      size: converted.data.length,
      data: new Uint8Array(converted.data),
      originalName: converted.originalName,
      enemyId,
    },
  });

  if (!existing.portraitAssetId) {
    await prisma.enemyStatBlock.update({
      where: { id: enemyId },
      data: { portraitAssetId: asset.id },
    });
  }

  const enemy = await getEnemyOrThrow(enemyId);
  return { asset, enemy: toEnemyFull(enemy) };
}

export function listEnemyImages(enemyId: string): Promise<Asset[]> {
  return prisma.asset.findMany({
    where: { enemyId, kind: "IMAGE" },
    orderBy: { createdAt: "desc" },
  });
}

export async function deleteEnemyImage(enemyId: string, assetId: string): Promise<void> {
  const enemy = await getEnemyOrThrow(enemyId);
  const asset = await prisma.asset.findUnique({ where: { id: assetId } });
  if (!asset || asset.enemyId !== enemyId) {
    throw new AppError(404, "IMAGE_NOT_FOUND", "Imagen no encontrada");
  }
  if (enemy.portraitAssetId === assetId) {
    throw new AppError(
      409,
      "CANNOT_DELETE_ACTIVE_PORTRAIT",
      "No puedes borrar la imagen principal; elige otra como principal primero",
    );
  }
  await prisma.asset.delete({ where: { id: assetId } });
}
