import type { CharacterFull, ImportCharacterInput } from "@dnd-manager/shared";
import { Prisma } from "../../prisma/generated/client";
import type { Asset, CharacterSheet } from "../../prisma/generated/client";
import { prisma } from "../../lib/prisma";
import { parseFoundryMd } from "./foundryParser";
import { getMembership } from "./authorization";
import { resolveAssetUrl } from "./assetUrl";
import { AppError } from "../errors/AppError";

export type CharacterWithPortrait = CharacterSheet & { portraitAsset: Asset | null };

function toCharacterFull(character: CharacterWithPortrait): CharacterFull {
  return {
    id: character.id,
    ownerId: character.ownerId,
    groupId: character.groupId,
    name: character.name,
    level: character.level,
    className: character.className,
    subclassName: character.subclassName,
    species: character.species,
    background: character.background,
    alignment: character.alignment,
    portraitUrl: character.portraitAsset ? resolveAssetUrl(character.portraitAsset) : null,
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
    throw new AppError(422, "INVALID_PORTRAIT_ASSET", "El asset indicado no existe o no es una imagen");
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
    throw new AppError(422, "OWNER_NOT_GROUP_MEMBER", "El propietario indicado no pertenece al grupo");
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
