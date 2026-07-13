const DIACRITICS_PATTERN = new RegExp("[\\u0300-\\u036f]", "g");

/** Normaliza para comparar texto ignorando mayúsculas/minúsculas y acentos. */
export function normalizeSearch(value: string): string {
  return value.normalize("NFD").replace(DIACRITICS_PATTERN, "").toLowerCase();
}
