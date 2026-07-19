export type Theme = "light" | "dark";
const STORAGE_KEY = "theme";

/** Preferencia explícita del usuario, si la hay — null = sigue al sistema. */
export function getStoredTheme(): Theme | null {
  const value = window.localStorage.getItem(STORAGE_KEY);
  return value === "light" || value === "dark" ? value : null;
}

export function getSystemTheme(): Theme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function getEffectiveTheme(): Theme {
  return getStoredTheme() ?? getSystemTheme();
}

/** Aplica el tema al documento (ver index.css: :root[data-theme], y el script
 * inline de index.html que hace esto mismo antes del primer pintado). */
export function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute("data-theme", theme);
}

export function setStoredTheme(theme: Theme): void {
  window.localStorage.setItem(STORAGE_KEY, theme);
  applyTheme(theme);
}
