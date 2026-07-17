import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { DieGroupResult } from "@dnd-manager/shared";
import { formatModifier } from "../characters/foundryDisplay";

const CANVAS_ID = "dnd-dice-box-canvas";
const DEFAULT_DICE_COLOR = "#6B1620";
// Cuánto se queda visible el resultado ya asentado antes de desaparecer solo.
const RESULT_HOLD_MS = 2500;

export interface DiceOverlayRoll {
  id: string;
  label: string;
  characterName: string | null;
  rolls: DieGroupResult[];
  modifier: number;
  total: number;
  themeColor: string | null;
}

interface DiceOverlayContextValue {
  showRoll: (roll: DiceOverlayRoll) => void;
}

const DiceOverlayContext = createContext<DiceOverlayContextValue | null>(null);

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  );
}

function rollsToNotation(rolls: DieGroupResult[]): string[] {
  return rolls.map((g) => `${g.values.length}${g.die}`);
}

function formatBreakdown(roll: DiceOverlayRoll): string {
  const dice = roll.rolls.map((g) => `${g.die} [${g.values.join(", ")}]`).join(" + ");
  const modifier = roll.modifier !== 0 ? ` ${formatModifier(roll.modifier)}` : "";
  return `${dice}${modifier}`;
}

/**
 * Dados 3D con físicas reales (@3d-dice/dice-box, BabylonJS+Ammo.js) a
 * pantalla completa. La librería no permite forzar en qué cara cae cada
 * dado — el bote es puramente decorativo, "de ambiente"; el resultado real
 * (ya calculado por el servidor, nunca por el cliente) se muestra aparte en
 * cuanto los dados se paran, y ambos desaparecen solos pasados unos segundos.
 *
 * Se dispara solo desde ChatDockPanel al detectar mensajes de tirada nuevos
 * en el chat — así lo ve todo el grupo (incluido quien tira), no hace falta
 * disparo aparte desde donde se crea la tirada.
 */
export function DiceOverlayProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<DiceOverlayRoll[]>([]);
  const [phase, setPhase] = useState<"rolling" | "result" | null>(null);
  const diceBoxRef = useRef<import("@3d-dice/dice-box").default | null>(null);
  const diceBoxLoading = useRef<Promise<import("@3d-dice/dice-box").default> | null>(null);
  // Cierra el paso mientras se reproduce una tirada, para que el efecto de
  // abajo (que reacciona a `queue`) no arranque una segunda en paralelo.
  const isPlayingRef = useRef(false);

  // Deduplicado por id de tirada: el detector de mensajes nuevos en
  // ChatDockPanel puede llamar a showRoll() dos veces para la misma tirada
  // (p.ej. StrictMode re-ejecutando su efecto en desarrollo) — sin este
  // filtro, la misma tirada se reproduce dos veces en paralelo y las dos
  // pelean por el mismo estado de cola.
  const showRoll = useCallback((roll: DiceOverlayRoll) => {
    setQueue((prev) => (prev.some((r) => r.id === roll.id) ? prev : [...prev, roll]));
  }, []);
  const contextValue = useMemo(() => ({ showRoll }), [showRoll]);

  const current = queue[0] ?? null;

  useEffect(() => {
    if (isPlayingRef.current || !current) return;
    isPlayingRef.current = true;
    let cancelled = false;

    async function play(roll: DiceOverlayRoll) {
      const themeColor = roll.themeColor ?? DEFAULT_DICE_COLOR;

      if (!prefersReducedMotion()) {
        try {
          setPhase("rolling");
          if (!diceBoxRef.current) {
            if (!diceBoxLoading.current) {
              diceBoxLoading.current = import("@3d-dice/dice-box").then(({ default: DiceBox }) => {
                const box = new DiceBox({
                  container: `#${CANVAS_ID}`,
                  assetPath: "/assets/dice-box/",
                  theme: "default",
                  themeColor,
                  // La física en un Web Worker (opción por defecto) da mejor
                  // rendimiento en teoría, pero verificar de forma fiable si
                  // se cuelga en según qué navegador/pestaña es imposible
                  // desde fuera del worker. Para 1-4s de físicas de unos
                  // pocos dados, el coste de hacerlo en el hilo principal es
                  // imperceptible — se prioriza la fiabilidad confirmada.
                  offscreen: false,
                });
                return box.init();
              });
            }
            diceBoxRef.current = await diceBoxLoading.current;
          }
          if (cancelled) return;
          await diceBoxRef.current.roll(rollsToNotation(roll.rolls), { themeColor });
        } catch (err) {
          console.error("No se pudo animar los dados 3D, se muestra solo el resultado.", err);
        }
      }

      if (cancelled) return;
      setPhase("result");
      await new Promise((resolve) => setTimeout(resolve, RESULT_HOLD_MS));
      if (cancelled) return;
      diceBoxRef.current?.clear();
      setPhase(null);
      setQueue((prev) => prev.slice(1));
      isPlayingRef.current = false;
    }

    play(current);
    return () => {
      cancelled = true;
    };
  }, [current]);

  return (
    <DiceOverlayContext.Provider value={contextValue}>
      {children}
      <div className="pointer-events-none fixed inset-0 z-[60]">
        <div id={CANVAS_ID} className="absolute inset-0" />
        {current && phase === "result" && (
          <div className="absolute inset-x-0 bottom-[12%] flex justify-center px-4">
            <div className="max-w-sm rounded-sm border-2 border-gold bg-parchment-panel/95 px-6 py-4 text-center shadow-[0_8px_32px_-8px_rgba(0,0,0,0.5)] backdrop-blur-sm">
              <p className="text-sm text-ink">
                <span className="font-semibold text-oxblood">
                  {current.characterName ?? "Tirada"}
                </span>
                {" — "}
                {current.label}
              </p>
              <p className="mt-1 text-xs text-ink-muted">{formatBreakdown(current)}</p>
              <p className="mt-1 font-display text-4xl font-semibold text-oxblood">
                {current.total}
              </p>
            </div>
          </div>
        )}
      </div>
    </DiceOverlayContext.Provider>
  );
}

export function useDiceOverlay() {
  const ctx = useContext(DiceOverlayContext);
  if (!ctx) throw new Error("useDiceOverlay debe usarse dentro de DiceOverlayProvider");
  return ctx;
}
