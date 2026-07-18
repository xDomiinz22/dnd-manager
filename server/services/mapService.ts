import type {
  GroupMap as GroupMapDto,
  MapSummary,
  CreateMapPinInput,
  UpdateMapPinInput,
  UpdateMapMetaInput,
} from "@dnd-manager/shared";
import { prisma } from "../../lib/prisma";
import { convertImageToWebp } from "../../lib/imageConversion";
import { resolveAssetUrl } from "./assetUrl";
import { AppError } from "../errors/AppError";

const PIN_INCLUDE = { pins: { orderBy: { order: "asc" } } } as const;
const MAP_LIST_ORDER = [{ isWorld: "desc" }, { continent: "asc" }, { title: "asc" }] as const;

type GroupMapWithPins = {
  id: string;
  title: string;
  continent: string | null;
  isWorld: boolean;
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
    linkedMapId: string | null;
    order: number;
  }[];
};

function toGroupMapDto(map: GroupMapWithPins): GroupMapDto {
  return {
    id: map.id,
    title: map.title,
    continent: map.continent,
    isWorld: map.isWorld,
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
      linkedMapId: pin.linkedMapId,
      order: pin.order,
    })),
  };
}

export async function listGroupMaps(groupId: string): Promise<MapSummary[]> {
  const maps = await prisma.groupMap.findMany({
    where: { groupId },
    orderBy: [...MAP_LIST_ORDER],
    select: { id: true, title: true, continent: true, isWorld: true },
  });
  return maps;
}

export async function getGroupMap(groupId: string, mapId: string): Promise<GroupMapDto> {
  const map = await prisma.groupMap.findUnique({
    where: { id: mapId },
    include: { asset: { select: { id: true, url: true } }, ...PIN_INCLUDE },
  });
  if (!map || map.groupId !== groupId) {
    throw new AppError(404, "MAP_NOT_FOUND", "Mapa no encontrado");
  }
  return toGroupMapDto(map);
}

/**
 * Crea un mapa nuevo dentro del grupo. El primer mapa que se sube en un
 * grupo se marca automáticamente como el mapa del Mundo (isWorld) — no se
 * ofrece esa opción al Master, es puramente "el primero que hay".
 */
export async function createMap(
  groupId: string,
  ownerId: string,
  fileBuffer: Buffer,
  originalName: string | null,
  title: string,
  continent: string | null,
): Promise<GroupMapDto> {
  const converted = await convertImageToWebp(fileBuffer, originalName).catch(() => {
    throw new AppError(
      400,
      "INVALID_IMAGE",
      "El archivo no es una imagen soportada (JPEG, PNG, WEBP o GIF).",
    );
  });

  const existingCount = await prisma.groupMap.count({ where: { groupId } });
  const isWorld = existingCount === 0;

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

  const map = await prisma.groupMap.create({
    data: {
      groupId,
      assetId: asset.id,
      width: converted.width,
      height: converted.height,
      title,
      continent: isWorld ? null : continent,
      isWorld,
    },
    include: { asset: { select: { id: true, url: true } }, ...PIN_INCLUDE },
  });

  return toGroupMapDto(map);
}

async function getGroupMapRowOrThrow(groupId: string, mapId: string) {
  const map = await prisma.groupMap.findUnique({ where: { id: mapId } });
  if (!map || map.groupId !== groupId) {
    throw new AppError(404, "MAP_NOT_FOUND", "Mapa no encontrado");
  }
  return map;
}

export async function updateMapMeta(
  groupId: string,
  mapId: string,
  input: UpdateMapMetaInput,
): Promise<MapSummary> {
  const map = await getGroupMapRowOrThrow(groupId, mapId);

  if (map.isWorld && input.continent !== undefined && input.continent !== null) {
    throw new AppError(422, "WORLD_MAP_NO_CONTINENT", "El mapa del Mundo no lleva continente");
  }

  const updated = await prisma.groupMap.update({
    where: { id: mapId },
    data: {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.continent !== undefined && !map.isWorld ? { continent: input.continent } : {}),
    },
    select: { id: true, title: true, continent: true, isWorld: true },
  });

  return updated;
}

/**
 * Reemplaza la imagen de un mapa ya existente. Exige que la imagen nueva
 * mida exactamente lo mismo que la actual — los MapPin usan coordenadas
 * relativas (0-1), así que un lienzo distinto los descuadraría visualmente
 * aunque los datos en sí no cambien.
 */
export async function replaceMapImage(
  groupId: string,
  mapId: string,
  ownerId: string,
  fileBuffer: Buffer,
  originalName: string | null,
): Promise<GroupMapDto> {
  const existing = await getGroupMapRowOrThrow(groupId, mapId);

  const converted = await convertImageToWebp(fileBuffer, originalName).catch(() => {
    throw new AppError(
      400,
      "INVALID_IMAGE",
      "El archivo no es una imagen soportada (JPEG, PNG, WEBP o GIF).",
    );
  });

  if (existing.width !== converted.width || existing.height !== converted.height) {
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

  const map = await prisma.groupMap.update({
    where: { id: mapId },
    data: { assetId: asset.id, width: converted.width, height: converted.height },
    include: { asset: { select: { id: true, url: true } }, ...PIN_INCLUDE },
  });

  return toGroupMapDto(map);
}

export async function deleteMap(groupId: string, mapId: string): Promise<void> {
  const map = await getGroupMapRowOrThrow(groupId, mapId);
  if (map.isWorld) {
    throw new AppError(422, "CANNOT_DELETE_WORLD_MAP", "El mapa del Mundo no se puede borrar");
  }
  await prisma.groupMap.delete({ where: { id: mapId } });
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

/** Un pin solo puede enlazar a otro mapa del mismo grupo, y no a sí mismo. */
async function assertValidLinkedMap(
  groupId: string,
  ownMapId: string,
  linkedMapId: string | null | undefined,
): Promise<void> {
  if (!linkedMapId) return;
  if (linkedMapId === ownMapId) {
    throw new AppError(422, "INVALID_LINKED_MAP", "Un pin no puede enlazar a su propio mapa");
  }
  const target = await prisma.groupMap.findUnique({ where: { id: linkedMapId } });
  if (!target || target.groupId !== groupId) {
    throw new AppError(
      422,
      "INVALID_LINKED_MAP",
      "El mapa enlazado indicado no pertenece a este grupo",
    );
  }
}

async function reloadMap(mapId: string): Promise<GroupMapDto> {
  const map = await prisma.groupMap.findUniqueOrThrow({
    where: { id: mapId },
    include: { asset: { select: { id: true, url: true } }, ...PIN_INCLUDE },
  });
  return toGroupMapDto(map);
}

export async function createMapPin(
  groupId: string,
  mapId: string,
  input: CreateMapPinInput,
): Promise<GroupMapDto> {
  await getGroupMapRowOrThrow(groupId, mapId);
  await assertValidJournalPage(groupId, input.journalPageId);
  await assertValidLinkedMap(groupId, mapId, input.linkedMapId);

  const maxOrder = await prisma.mapPin.aggregate({
    where: { groupMapId: mapId },
    _max: { order: true },
  });

  await prisma.mapPin.create({
    data: {
      groupMapId: mapId,
      x: input.x,
      y: input.y,
      title: input.title,
      journalPageId: input.journalPageId ?? null,
      linkedMapId: input.linkedMapId ?? null,
      order: (maxOrder._max.order ?? -1) + 1,
    },
  });

  return reloadMap(mapId);
}

export async function updateMapPin(
  groupId: string,
  mapId: string,
  pinId: string,
  input: UpdateMapPinInput,
): Promise<GroupMapDto> {
  await getGroupMapRowOrThrow(groupId, mapId);
  const pin = await prisma.mapPin.findUnique({ where: { id: pinId } });
  if (!pin || pin.groupMapId !== mapId) {
    throw new AppError(404, "MAP_PIN_NOT_FOUND", "Pin no encontrado");
  }
  if (input.journalPageId !== undefined) {
    await assertValidJournalPage(groupId, input.journalPageId);
  }
  if (input.linkedMapId !== undefined) {
    await assertValidLinkedMap(groupId, mapId, input.linkedMapId);
  }

  await prisma.mapPin.update({
    where: { id: pinId },
    data: {
      ...(input.x !== undefined ? { x: input.x } : {}),
      ...(input.y !== undefined ? { y: input.y } : {}),
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.journalPageId !== undefined ? { journalPageId: input.journalPageId } : {}),
      ...(input.linkedMapId !== undefined ? { linkedMapId: input.linkedMapId } : {}),
    },
  });

  return reloadMap(mapId);
}

export async function deleteMapPin(
  groupId: string,
  mapId: string,
  pinId: string,
): Promise<GroupMapDto> {
  await getGroupMapRowOrThrow(groupId, mapId);
  const pin = await prisma.mapPin.findUnique({ where: { id: pinId } });
  if (!pin || pin.groupMapId !== mapId) {
    throw new AppError(404, "MAP_PIN_NOT_FOUND", "Pin no encontrado");
  }

  await prisma.mapPin.delete({ where: { id: pinId } });

  return reloadMap(mapId);
}
