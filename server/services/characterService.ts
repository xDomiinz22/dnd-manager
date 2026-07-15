import type {
  CharacterFull,
  CharacterListItem,
  CharacterView,
  ImportCharacterInput,
  SpellSlot,
  SpellSlotLevel,
  SpellSlots,
} from "@dnd-manager/shared";
import { SPELL_SLOT_LEVELS } from "@dnd-manager/shared";
import { Prisma } from "@prisma/client";
import type { Asset, CharacterSheet } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { convertImageToWebp } from "../../lib/imageConversion";
import { classBreakdown, parseFoundryMd } from "./foundryParser";
import { getMembership, resolveCharacterAccess } from "./authorization";
import { resolveAssetUrl } from "./assetUrl";
import { AppError } from "../errors/AppError";

export type CharacterWithPortrait = CharacterSheet & { portraitAsset: Asset | null };

/**
 * PG actuales: prioriza el valor editado a mano (`currentHp`, persistido);
 * si nunca se ha tocado, usa el valor que traía el .md de Foundry
 * (`rawSystem.attributes.hp.value`, snapshot del momento del import); si
 * tampoco hay eso, cae al máximo derivado.
 */
function resolveCurrentHp(character: CharacterSheet): number {
  if (character.currentHp !== null) return character.currentHp;

  const rawSystem = character.rawSystem as { attributes?: { hp?: { value?: number } } } | null;
  const rawValue = rawSystem?.attributes?.hp?.value;
  if (typeof rawValue === "number") return rawValue;

  const derived = character.derived as CharacterFull["derived"] | null;
  return derived?.hitPoints.override ?? derived?.hitPoints.max ?? 0;
}

const DEFAULT_SPELL_SLOT: SpellSlot = { used: 0, max: 4 };

/**
 * Huecos de conjuro nivel 1-7: el .md de Foundry no trae de forma fiable el
 * máximo real (depende de clase/nivel/multiclase), así que tanto usados como
 * máximo son editables a mano; por defecto 0 usados / 4 máximo hasta que se
 * toquen (ver el comentario de `spellSlots` en schema.prisma).
 */
function resolveSpellSlots(character: CharacterSheet): SpellSlots {
  const stored = (character.spellSlots as Partial<Record<SpellSlotLevel, SpellSlot>> | null) ?? {};
  return Object.fromEntries(
    SPELL_SLOT_LEVELS.map((level) => [level, stored[level] ?? DEFAULT_SPELL_SLOT]),
  ) as SpellSlots;
}

function toCharacterFull(character: CharacterWithPortrait): CharacterFull {
  return {
    id: character.id,
    ownerId: character.ownerId,
    groupId: character.groupId,
    name: character.name,
    level: character.level,
    className: character.className,
    classes: classBreakdown(character.items),
    subclassName: character.subclassName,
    species: character.species,
    background: character.background,
    alignment: character.alignment,
    portraitUrl: character.portraitAsset ? resolveAssetUrl(character.portraitAsset) : null,
    portraitAssetId: character.portraitAssetId,
    currentHp: resolveCurrentHp(character),
    spellSlots: resolveSpellSlots(character),
    rawSystem: character.rawSystem,
    items: character.items,
    // Guardamos exactamente lo que genera deriveCharacterStats, así que el shape coincide con DerivedStats.
    derived: character.derived as CharacterFull["derived"],
    sourceMdHash: character.sourceMdHash,
    createdAt: character.createdAt.toISOString(),
    updatedAt: character.updatedAt.toISOString(),
  };
}

function isUniqueConstraintOn(err: unknown, field: string): boolean {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    err.code === "P2002" &&
    ((err.meta?.target as string[] | undefined)?.includes(field) ?? false)
  );
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

export async function importCharacter(
  groupId: string,
  masterId: string,
  input: ImportCharacterInput,
): Promise<CharacterFull> {
  const ownerId = input.ownerId ?? masterId;

  const membership = await getMembership(groupId, ownerId);
  if (!membership) {
    throw new AppError(
      422,
      "OWNER_NOT_GROUP_MEMBER",
      "El propietario indicado no pertenece al grupo",
    );
  }

  await assertValidPortraitAsset(input.portraitAssetId);

  const parsed = parseFoundryMd(input.md);

  try {
    const character = await prisma.characterSheet.create({
      data: {
        ownerId,
        groupId,
        name: parsed.name,
        level: parsed.level,
        className: parsed.className,
        subclassName: parsed.subclassName,
        species: parsed.species,
        background: parsed.background,
        alignment: parsed.alignment,
        portraitAssetId: input.portraitAssetId ?? null,
        rawSystem: parsed.rawSystem,
        items: parsed.items as Prisma.InputJsonValue,
        derived: parsed.derived as unknown as Prisma.InputJsonValue,
        sourceMdHash: parsed.sourceMdHash,
        personalJournal: { create: { scope: "CHARACTER", title: parsed.name } },
      },
      include: { portraitAsset: true },
    });
    return toCharacterFull(character);
  } catch (err) {
    if (isUniqueConstraintOn(err, "name")) {
      throw new AppError(
        409,
        "CHARACTER_NAME_TAKEN",
        "Ese dueño ya tiene un personaje con ese nombre en este grupo",
      );
    }
    throw err;
  }
}

export async function getCharacterOrThrow(id: string): Promise<CharacterWithPortrait> {
  const character = await prisma.characterSheet.findUnique({
    where: { id },
    include: { portraitAsset: true },
  });
  if (!character) throw new AppError(404, "CHARACTER_NOT_FOUND", "Personaje no encontrado");
  return character;
}

export async function importCharacterMd(id: string, md: string): Promise<CharacterFull> {
  const existing = await getCharacterOrThrow(id);
  const parsed = parseFoundryMd(md);

  const character = await prisma.characterSheet.update({
    where: { id: existing.id },
    data: {
      name: parsed.name,
      level: parsed.level,
      className: parsed.className,
      subclassName: parsed.subclassName,
      species: parsed.species,
      background: parsed.background,
      alignment: parsed.alignment,
      rawSystem: parsed.rawSystem,
      items: parsed.items as Prisma.InputJsonValue,
      derived: parsed.derived as unknown as Prisma.InputJsonValue,
      sourceMdHash: parsed.sourceMdHash,
    },
    include: { portraitAsset: true },
  });
  return toCharacterFull(character);
}

export async function reassignOwner(id: string, newOwnerId: string): Promise<CharacterFull> {
  const existing = await getCharacterOrThrow(id);

  const membership = await getMembership(existing.groupId, newOwnerId);
  if (!membership) {
    throw new AppError(422, "OWNER_NOT_GROUP_MEMBER", "El nuevo dueño no pertenece al grupo");
  }

  try {
    const character = await prisma.characterSheet.update({
      where: { id: existing.id },
      data: { ownerId: newOwnerId },
      include: { portraitAsset: true },
    });
    return toCharacterFull(character);
  } catch (err) {
    if (isUniqueConstraintOn(err, "name")) {
      throw new AppError(
        409,
        "CHARACTER_NAME_TAKEN",
        "El nuevo dueño ya tiene un personaje con ese nombre en este grupo",
      );
    }
    throw err;
  }
}

export async function changePortrait(id: string, assetId: string): Promise<CharacterFull> {
  const existing = await getCharacterOrThrow(id);
  await assertValidPortraitAsset(assetId);

  const character = await prisma.characterSheet.update({
    where: { id: existing.id },
    data: { portraitAssetId: assetId },
    include: { portraitAsset: true },
  });
  return toCharacterFull(character);
}

export async function updateCurrentHp(id: string, currentHp: number): Promise<CharacterFull> {
  const existing = await getCharacterOrThrow(id);

  const character = await prisma.characterSheet.update({
    where: { id: existing.id },
    data: { currentHp },
    include: { portraitAsset: true },
  });
  return toCharacterFull(character);
}

export async function updateSpellSlot(
  id: string,
  level: SpellSlotLevel,
  used: number | undefined,
  max: number | undefined,
): Promise<CharacterFull> {
  const existing = await getCharacterOrThrow(id);
  const currentSlots = resolveSpellSlots(existing);
  const currentSlot = currentSlots[level];

  const nextSlots: SpellSlots = {
    ...currentSlots,
    [level]: {
      used: used ?? currentSlot.used,
      max: max ?? currentSlot.max,
    },
  };

  const character = await prisma.characterSheet.update({
    where: { id: existing.id },
    data: { spellSlots: nextSlots },
    include: { portraitAsset: true },
  });
  return toCharacterFull(character);
}

/**
 * Borra la ficha por completo (solo Master). El diario personal cae en
 * cascada (JournalEntry.characterId ON DELETE CASCADE); las imágenes de la
 * galería/retrato de Asset.characterId son ON DELETE SET NULL, así que se
 * borran explícitamente aquí para no dejar bytes huérfanos en la DB.
 */
export async function deleteCharacter(id: string): Promise<void> {
  const existing = await getCharacterOrThrow(id);
  await prisma.$transaction([
    prisma.asset.deleteMany({ where: { characterId: existing.id } }),
    prisma.characterSheet.delete({ where: { id: existing.id } }),
  ]);
}

/**
 * Sube una imagen a la galería del personaje. Si todavía no tiene retrato
 * principal (primera imagen), esta se marca como tal automáticamente.
 */
export async function addCharacterImage(
  characterId: string,
  uploaderId: string,
  data: Buffer,
  originalName: string | null,
): Promise<{ asset: Asset; character: CharacterFull }> {
  const existing = await getCharacterOrThrow(characterId);
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
      // Ver mismo comentario en assetController.ts: Prisma 7 exige
      // `Uint8Array<ArrayBuffer>` estricto para los campos Bytes.
      data: new Uint8Array(converted.data),
      originalName: converted.originalName,
      characterId,
    },
  });

  if (!existing.portraitAssetId) {
    await prisma.characterSheet.update({
      where: { id: characterId },
      data: { portraitAssetId: asset.id },
    });
  }

  const character = await getCharacterOrThrow(characterId);
  return { asset, character: toCharacterFull(character) };
}

export function listCharacterImages(characterId: string): Promise<Asset[]> {
  return prisma.asset.findMany({
    where: { characterId, kind: "IMAGE" },
    orderBy: { createdAt: "desc" },
  });
}

export async function deleteCharacterImage(characterId: string, assetId: string): Promise<void> {
  const character = await getCharacterOrThrow(characterId);
  const asset = await prisma.asset.findUnique({ where: { id: assetId } });
  if (!asset || asset.characterId !== characterId) {
    throw new AppError(404, "IMAGE_NOT_FOUND", "Imagen no encontrada");
  }
  if (character.portraitAssetId === assetId) {
    throw new AppError(
      409,
      "CANNOT_DELETE_ACTIVE_PORTRAIT",
      "No puedes borrar la imagen principal; elige otra como principal primero",
    );
  }
  await prisma.asset.delete({ where: { id: assetId } });
}

export async function getCharacterView(
  userId: string,
  characterId: string,
): Promise<CharacterView> {
  const character = await getCharacterOrThrow(characterId);
  const access = await resolveCharacterAccess(userId, character);

  if (access === "NONE") {
    throw new AppError(403, "NOT_ALLOWED", "No tienes acceso a este personaje");
  }
  if (access === "FULL") {
    return { access: "FULL", character: toCharacterFull(character) };
  }
  return {
    access: "LIMITED",
    character: {
      id: character.id,
      name: character.name,
      portraitUrl: character.portraitAsset ? resolveAssetUrl(character.portraitAsset) : null,
    },
  };
}

export async function listMyCharacters(userId: string): Promise<CharacterListItem[]> {
  const characters = await prisma.characterSheet.findMany({
    where: { ownerId: userId },
    include: { portraitAsset: true, group: true },
    orderBy: { createdAt: "asc" },
  });

  return characters.map((c) => ({
    id: c.id,
    name: c.name,
    level: c.level,
    className: c.className,
    classes: classBreakdown(c.items),
    groupId: c.groupId,
    groupName: c.group.name,
    portraitUrl: c.portraitAsset ? resolveAssetUrl(c.portraitAsset) : null,
  }));
}

export async function duplicateCharacter(
  userId: string,
  characterId: string,
  targetGroupId: string,
): Promise<CharacterFull> {
  const existing = await getCharacterOrThrow(characterId);
  if (existing.ownerId !== userId) {
    throw new AppError(403, "NOT_CHARACTER_OWNER", "Solo el dueño del personaje puede duplicarlo");
  }

  const membership = await getMembership(targetGroupId, userId);
  if (!membership) {
    throw new AppError(422, "NOT_TARGET_GROUP_MEMBER", "No perteneces al grupo destino");
  }

  try {
    const character = await prisma.characterSheet.create({
      data: {
        ownerId: userId,
        groupId: targetGroupId,
        name: existing.name,
        level: existing.level,
        className: existing.className,
        subclassName: existing.subclassName,
        species: existing.species,
        background: existing.background,
        alignment: existing.alignment,
        portraitAssetId: existing.portraitAssetId,
        rawSystem: existing.rawSystem as Prisma.InputJsonValue,
        items: existing.items as Prisma.InputJsonValue,
        derived: existing.derived as Prisma.InputJsonValue,
        sourceMdHash: existing.sourceMdHash,
        personalJournal: { create: { scope: "CHARACTER", title: existing.name } },
      },
      include: { portraitAsset: true },
    });
    return toCharacterFull(character);
  } catch (err) {
    if (isUniqueConstraintOn(err, "name")) {
      throw new AppError(
        409,
        "CHARACTER_NAME_TAKEN",
        "Ya tienes un personaje con ese nombre en el grupo destino",
      );
    }
    throw err;
  }
}
