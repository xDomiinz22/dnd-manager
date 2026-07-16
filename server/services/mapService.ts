import type {
  GroupMap as GroupMapDto,
  CreateMapPinInput,
  UpdateMapPinInput,
} from "@dnd-manager/shared";
import { prisma } from "../../lib/prisma";
import { convertImageToWebp } from "../../lib/imageConversion";
import { resolveAssetUrl } from "./assetUrl";
import { AppError } from "../errors/AppError";

const PIN_INCLUDE = { pins: { orderBy: { order: "asc" } } } as const;

type GroupMapWithPins = {
  updatedAt: Date;
  width: number;
  height: number;
  asset: { id: string; url: string | null };
  pins: {
    id: string;
    x: number;
    y: number;
    title: string;
    journalPageId: string | null;
    order: number;
  }[];
};

function toGroupMapDto(map: GroupMapWithPins): GroupMapDto {
  return {
    imageUrl: resolveAssetUrl(map.asset),
    width: map.width,
    height: map.height,
    updatedAt: map.updatedAt.toISOString(),
    pins: map.pins.map((pin) => ({
      id: pin.id,
      x: pin.x,
      y: pin.y,
      title: pin.title,
      journalPageId: pin.journalPageId,
      order: pin.order,
    })),
  };
}

export async function getGroupMap(groupId: string): Promise<GroupMapDto | null> {
  const map = await prisma.groupMap.findUnique({
    where: { groupId },
    include: { asset: { select: { id: true, url: true } }, ...PIN_INCLUDE },
  });
  return map ? toGroupMapDto(map) : null;
}

/**
 * Sube/reemplaza la imagen del mapa. Si ya existe un mapa, exige que la
 * imagen nueva mida exactamente lo mismo que la actual — los MapPin usan
 * coordenadas relativas (0-1), así que un lienzo distinto los descuadraría
 * visualmente aunque los datos en sí no cambien. El Master debe exportar
 * desde el mismo PSD (mismo tamaño de lienzo) para cada actualización.
 */
export async function uploadGroupMap(
  groupId: string,
  ownerId: string,
  fileBuffer: Buffer,
  originalName: string | null,
): Promise<GroupMapDto> {
  const existing = await prisma.groupMap.findUnique({ where: { groupId } });

  const converted = await convertImageToWebp(fileBuffer, originalName).catch(() => {
    throw new AppError(
      400,
      "INVALID_IMAGE",
      "El archivo no es una imagen soportada (JPEG, PNG, WEBP o GIF).",
    );
  });

  if (existing && (existing.width !== converted.width || existing.height !== converted.height)) {
    throw new AppError(
      400,
      "MAP_DIMENSIONS_MISMATCH",
      `La imagen nueva mide ${converted.width}x${converted.height}px, pero el mapa actual mide ${existing.width}x${existing.height}px. Exporta desde el mismo lienzo para que los pines no se descuadren.`,
    );
  }

  const asset = await prisma.asset.create({
    data: {
      ownerId,
      kind: "IMAGE",
      mime: converted.mime,
      size: converted.data.length,
      data: new Uint8Array(converted.data),
      originalName: converted.originalName,
    },
  });

  const map = await prisma.groupMap.upsert({
    where: { groupId },
    create: { groupId, assetId: asset.id, width: converted.width, height: converted.height },
    update: { assetId: asset.id, width: converted.width, height: converted.height },
    include: { asset: { select: { id: true, url: true } }, ...PIN_INCLUDE },
  });

  return toGroupMapDto(map);
}

async function getGroupMapOrThrow(groupId: string) {
  const map = await prisma.groupMap.findUnique({ where: { groupId } });
  if (!map) {
    throw new AppError(404, "MAP_NOT_FOUND", "Este grupo todavía no tiene un mapa subido");
  }
  return map;
}

/** Un pin solo puede enlazar a una página del diario DE GRUPO (no personal), y del mismo grupo. */
async function assertValidJournalPage(
  groupId: string,
  journalPageId: string | null | undefined,
): Promise<void> {
  if (!journalPageId) return;
  const page = await prisma.journalPage.findUnique({
    where: { id: journalPageId },
    include: { journalEntry: { select: { groupId: true } } },
  });
  if (!page || page.journalEntry.groupId !== groupId) {
    throw new AppError(
      422,
      "INVALID_JOURNAL_PAGE",
      "La página de diario indicada no pertenece al diario de este grupo",
    );
  }
}

async function reloadMap(groupId: string): Promise<GroupMapDto> {
  const map = await prisma.groupMap.findUniqueOrThrow({
    where: { groupId },
    include: { asset: { select: { id: true, url: true } }, ...PIN_INCLUDE },
  });
  return toGroupMapDto(map);
}

export async function createMapPin(
  groupId: string,
  input: CreateMapPinInput,
): Promise<GroupMapDto> {
  const map = await getGroupMapOrThrow(groupId);
  await assertValidJournalPage(groupId, input.journalPageId);

  const maxOrder = await prisma.mapPin.aggregate({
    where: { groupMapId: map.id },
    _max: { order: true },
  });

  await prisma.mapPin.create({
    data: {
      groupMapId: map.id,
      x: input.x,
      y: input.y,
      title: input.title,
      journalPageId: input.journalPageId ?? null,
      order: (maxOrder._max.order ?? -1) + 1,
    },
  });

  return reloadMap(groupId);
}

export async function updateMapPin(
  groupId: string,
  pinId: string,
  input: UpdateMapPinInput,
): Promise<GroupMapDto> {
  const map = await getGroupMapOrThrow(groupId);
  const pin = await prisma.mapPin.findUnique({ where: { id: pinId } });
  if (!pin || pin.groupMapId !== map.id) {
    throw new AppError(404, "MAP_PIN_NOT_FOUND", "Pin no encontrado");
  }
  if (input.journalPageId !== undefined) {
    await assertValidJournalPage(groupId, input.journalPageId);
  }

  await prisma.mapPin.update({
    where: { id: pinId },
    data: {
      ...(input.x !== undefined ? { x: input.x } : {}),
      ...(input.y !== undefined ? { y: input.y } : {}),
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.journalPageId !== undefined ? { journalPageId: input.journalPageId } : {}),
    },
  });

  return reloadMap(groupId);
}

export async function deleteMapPin(groupId: string, pinId: string): Promise<GroupMapDto> {
  const map = await getGroupMapOrThrow(groupId);
  const pin = await prisma.mapPin.findUnique({ where: { id: pinId } });
  if (!pin || pin.groupMapId !== map.id) {
    throw new AppError(404, "MAP_PIN_NOT_FOUND", "Pin no encontrado");
  }

  await prisma.mapPin.delete({ where: { id: pinId } });

  return reloadMap(groupId);
}
