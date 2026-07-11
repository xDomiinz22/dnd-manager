import DOMPurify from "dompurify";
import type { AbilityKey } from "@dnd-manager/shared";

export const ABILITY_LABELS: Record<AbilityKey, string> = {
  str: "FUE",
  dex: "DES",
  con: "CON",
  int: "INT",
  wis: "SAB",
  cha: "CAR",
};

export const ABILITY_FULL_LABELS: Record<AbilityKey, string> = {
  str: "Fuerza",
  dex: "Destreza",
  con: "Constitución",
  int: "Inteligencia",
  wis: "Sabiduría",
  cha: "Carisma",
};

export const SKILL_LABELS: Record<string, string> = {
  acr: "Acrobacias",
  ani: "Trato con animales",
  arc: "Conocimiento arcano",
  ath: "Atletismo",
  dec: "Engaño",
  his: "Historia",
  ins: "Perspicacia",
  itm: "Intimidación",
  inv: "Investigación",
  med: "Medicina",
  nat: "Naturaleza",
  prc: "Percepción",
  prf: "Interpretación",
  per: "Persuasión",
  rel: "Religión",
  slt: "Juego de manos",
  ste: "Sigilo",
  sur: "Supervivencia",
};

export function formatModifier(n: number): string {
  return n >= 0 ? `+${n}` : `${n}`;
}

export interface FoundryItem {
  _id?: string;
  name?: string;
  type?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  system?: any;
}

export function asFoundryItems(items: unknown): FoundryItem[] {
  return Array.isArray(items) ? (items as FoundryItem[]) : [];
}

export function itemsOfType(items: unknown, types: string[]): FoundryItem[] {
  return asFoundryItems(items).filter((item) => types.includes(item.type ?? ""));
}

export interface ClassLevel {
  name: string;
  level: number;
}

/**
 * `CharacterSheet.className`/`level` guardan solo la clase original + el
 * nivel TOTAL sumado entre todas las clases (para multiclase, eso mezcla el
 * nombre de una clase con la suma de todas) — aquí se reconstruye el desglose
 * real clase por clase a partir de los items `type: "class"` del .md.
 */
export function classBreakdown(items: unknown): ClassLevel[] {
  return itemsOfType(items, ["class"])
    .map((item) => ({
      name: item.name ?? "Clase desconocida",
      level: Number(item.system?.levels) || 0,
    }))
    .sort((a, b) => b.level - a.level);
}

export function sanitizeHtml(html: string | undefined | null): string {
  if (!html) return "";
  return DOMPurify.sanitize(html);
}
