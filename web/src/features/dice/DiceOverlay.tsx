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
  // g.die ya viene como "NdM" (p.ej. "1d20", "-1d4") desde el servidor — el
  // signo solo importa para el total, no para qué dado animar.
  return rolls.map((g) => g.die.replace(/^-/, ""));
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
  // TEMPORAL: diagnóstico de un fallo solo reproducible en Android Chrome real
  // (el panel de resultado sale bien pero los dados 3D no se ven, sin
  // reduced-motion activo) — se quita en cuanto tengamos el mensaje de error.
  const [debugInfo, setDebugInfo] = useState<string | null>(null);
  const diceBoxRef = useRef<import("@3d-dice/dice-box").default | null>(null);
  const diceBoxLoading = useRef<Promise<import("@3d-dice/dice-box").default> | null>(null);
  // Ids ya encolados o en curso, para deduplicar. Un Set en un ref (no un
  // useState) porque la comprobación tiene que ser síncrona e inmune al
  // batching: en desarrollo, React puede invocar dos veces tanto el efecto
  // de ChatDockPanel que llama a showRoll() como la función que se le pasa a
  // setQueue — deduplicar solo dentro del updater de setQueue no basta,
  // porque esas dos invocaciones pueden partir ambas del mismo `prev` antes
  // de que ninguna se confirme, y la tirada se reproduce dos veces.
  const seenIdsRef = useRef<Set<string>>(new Set());

  const showRoll = useCallback((roll: DiceOverlayRoll) => {
    if (seenIdsRef.current.has(roll.id)) return;
    seenIdsRef.current.add(roll.id);
    setQueue((prev) => [...prev, roll]);
  }, []);
  const contextValue = useMemo(() => ({ showRoll }), [showRoll]);

  const current = queue[0] ?? null;
  // Mismo motivo que seenIdsRef: evita que el efecto de abajo reproduzca la
  // misma `current` dos veces si React lo invoca por duplicado.
  const playingIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!current || playingIdRef.current === current.id) return;
    playingIdRef.current = current.id;
    let cancelled = false;

    async function play(roll: DiceOverlayRoll) {
      const themeColor = roll.themeColor ?? DEFAULT_DICE_COLOR;

      if (prefersReducedMotion()) {
        setDebugInfo("DEBUG: reduced-motion activo, se salta la animación");
      } else {
        try {
          setPhase("rolling");
          const canvasEl = document.getElementById(CANVAS_ID);
          setDebugInfo(
            `DEBUG: iniciando. contenedor=${canvasEl?.clientWidth}x${canvasEl?.clientHeight} webgl2=${!!document.createElement("canvas").getContext("webgl2")} webgl=${!!document.createElement("canvas").getContext("webgl")}`,
          );
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
          setDebugInfo("DEBUG: dice-box inicializado, lanzando roll()");
          await diceBoxRef.current.roll(rollsToNotation(roll.rolls), { themeColor });
          setDebugInfo("DEBUG: roll() completado sin error");
        } catch (err) {
          console.error("No se pudo animar los dados 3D, se muestra solo el resultado.", err);
          setDebugInfo(
            `DEBUG ERROR: ${err instanceof Error ? `${err.name}: ${err.message}` : String(err)}`,
          );
        }
      }

      if (cancelled) return;
      setPhase("result");
      await new Promise((resolve) => setTimeout(resolve, RESULT_HOLD_MS));
      if (cancelled) return;
      diceBoxRef.current?.clear();
      setPhase(null);
      setQueue((prev) => prev.slice(1));
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
        {debugInfo && (
          <div className="absolute inset-x-0 top-0 z-[61] break-words bg-black/80 p-2 text-[10px] text-lime-300">
            {debugInfo}
          </div>
        )}
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
