import { asFoundryItems } from "./foundryDisplay";
import type { ScaleValueResolved } from "./formulaEval";

export type ScaleValueMap = Record<string, Record<string, ScaleValueResolved | null>>;

// El export de Foundry no tiene tipos oficiales y un advancement trae muchos
// campos que no nos interesan — tipamos laxo a propósito, igual que
// `FoundryItem` en foundryDisplay.ts.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FoundryAdvancement = Record<string, any>;

/**
 * Slugify de Foundry (`formatIdentifier`) — usado cuando `configuration.identifier`
 * o `system.identifier` vienen vacíos (mitad de los casos reales, ver la guía
 * de escalados §3.2). Ojo con el apóstrofo: "Hunter's Mark Damage" →
 * "hunter-s-mark-damage", NO "hunters-...".
 */
export function formatIdentifier(input: string): string {
  return input
    .replace(/(\w+)([\\|/])(\w+)/g, "$1-$3")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Mayor clave numérica de `scale` que sea ≤ `level`; `null` si ninguna clave califica (el rasgo aún no aplica a ese nivel). */
function valueForLevel(scale: Record<string, unknown>, level: number): unknown {
  const keys = Object.keys(scale)
    .map(Number)
    .filter((n) => Number.isFinite(n) && n <= level)
    .sort((a, b) => a - b);
  if (keys.length === 0) return null;
  return scale[String(keys[keys.length - 1])];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatScaleEntry(configuration: any, raw: any): ScaleValueResolved | null {
  if (raw == null) return null;
  switch (configuration?.type) {
    case "dice": {
      const faces = raw.faces ?? null;
      if (!faces) return null;
      const number = raw.number ?? null;
      const modifiers = Array.isArray(raw.modifiers) ? raw.modifiers.join("") : "";
      const die = `d${faces}${modifiers}`;
      return { value: `${number ?? ""}d${faces}${modifiers}`, number, die, faces };
    }
    case "number":
    case "cr":
    case "distance":
    case "string":
      return { value: raw.value ?? null };
    default:
      return raw.value !== undefined ? { value: raw.value } : null;
  }
}

/**
 * Resuelve todos los `@scale.<clase>.<valor>` de un personaje (ver §3 de la
 * guía de escalados) — el mecanismo #1 de escalado de rasgos de clase
 * (Ataque Furtivo, Furia, Inspiración Bárdica, Marca del Cazador...).
 *
 * `originalClassId` es `rawSystem.details.originalClass` (el `_id` de la
 * clase "original" del personaje) — decide `classRestriction`. Si no se
 * pasa, se trata cualquier clase como si fuera la original (solo afecta a
 * advancements con restricción `primary`/`secondary`, poco frecuentes).
 */
export function resolveScaleValues(items: unknown, originalClassId: string | null): ScaleValueMap {
  const map: ScaleValueMap = {};
  const list = asFoundryItems(items);
  const classItems = list.filter((item) => item.type === "class");

  for (const item of list) {
    if (item.type !== "class" && item.type !== "subclass") continue;
    const advancement = item.system?.advancement;
    if (!advancement || typeof advancement !== "object") continue;

    const itemKey: string = item.system?.identifier || formatIdentifier(item.name ?? "");
    if (!itemKey) continue;

    // Nivel de consulta: clase → su propio nivel; subclase → nivel de SU
    // CLASE PADRE (nunca el nivel total de personaje — el gotcha de multiclase).
    let queryLevel: number;
    if (item.type === "class") {
      queryLevel = Number(item.system?.levels) || 0;
    } else {
      const parent = classItems.find((c) => c.system?.identifier === item.system?.classIdentifier);
      queryLevel = Number(parent?.system?.levels) || 0;
    }

    const isOriginalClass = originalClassId ? item._id === originalClassId : true;

    for (const adv of Object.values(advancement as Record<string, FoundryAdvancement>)) {
      if (adv?.type !== "ScaleValue") continue;
      const restriction = adv.classRestriction;
      if (restriction === "primary" && !isOriginalClass) continue;
      if (restriction === "secondary" && isOriginalClass) continue;

      const valueKey: string = adv.configuration?.identifier || formatIdentifier(adv.title ?? "");
      if (!valueKey) continue;

      const scaleTable = adv.configuration?.scale ?? {};
      const raw = valueForLevel(scaleTable, queryLevel);
      const resolved = formatScaleEntry(adv.configuration, raw);

      map[itemKey] ??= {};
      map[itemKey]![valueKey] = resolved;
    }
  }

  return map;
}
