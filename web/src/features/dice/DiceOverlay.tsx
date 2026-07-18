import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { parseDiceFormula, diceFormulaGroupLabel, type DieGroupResult } from "@dnd-manager/shared";
import { formatModifier } from "../characters/foundryDisplay";

const CANVAS_ID = "dnd-dice-box-canvas";
const DEFAULT_DICE_COLOR = "#6B1620";
// Cuánto se queda visible el resultado ya asentado antes de desaparecer solo.
const RESULT_HOLD_MS = 2500;
// Salvaguarda: en algunos móviles roll() no llega a rechazar nunca (contexto
// WebGL perdido a media física, p.ej.) — sin este timeout, una tirada
// colgada dejaría el visor bloqueado para siempre.
const ROLL_TIMEOUT_MS = 8000;

export interface RollPhysicsParams {
  formula: string;
  label: string;
  characterName: string | null;
  themeColor: string | null;
}

export interface RollPhysicsResult {
  rolls: DieGroupResult[];
  modifier: number;
  total: number;
}

interface LocalResult extends RollPhysicsResult {
  label: string;
  characterName: string | null;
}

interface DiceOverlayContextValue {
  /**
   * Tira la física real de los dados 3D EN ESTE dispositivo para la fórmula
   * dada, la anima a pantalla completa y devuelve los valores exactos que
   * salieron — son el resultado real de la tirada (ver
   * lib/diceRoll.ts:buildRollFromClientValues), no uno decorativo aparte.
   * Solo se ve en el dispositivo de quien tira; el resto del grupo se
   * entera por el log de texto en el chat, sin animación.
   *
   * Devuelve null si no se pudo animar (reduced-motion, sin WebGL, fallo de
   * dice-box, tirada ya en curso...) — en ese caso el caller debe mandar la
   * tirada sin `rolls` para que el servidor tire él mismo como fallback.
   */
  rollPhysics: (params: RollPhysicsParams) => Promise<RollPhysicsResult | null>;
}

const DiceOverlayContext = createContext<DiceOverlayContextValue | null>(null);

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  );
}

function formatBreakdown(result: LocalResult): string {
  const dice = result.rolls.map((g) => `${g.die} [${g.values.join(", ")}]`).join(" + ");
  const modifier = result.modifier !== 0 ? ` ${formatModifier(result.modifier)}` : "";
  return `${dice}${modifier}`;
}

/**
 * Dados 3D con físicas reales (@3d-dice/dice-box, BabylonJS+Ammo.js) a
 * pantalla completa. La física decide el resultado real de la tirada — no
 * hay un número "de verdad" aparte calculado por el servidor, así que la
 * cara en la que cae el dado y el total mostrado siempre coinciden. El
 * servidor solo valida que los valores recibidos encajen con la fórmula
 * (mismo número de dados, mismo tipo, dentro de rango), no los genera él.
 */
export function DiceOverlayProvider({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<"rolling" | "result" | null>(null);
  const [result, setResult] = useState<LocalResult | null>(null);
  const diceBoxRef = useRef<import("@3d-dice/dice-box").default | null>(null);
  const diceBoxLoading = useRef<Promise<import("@3d-dice/dice-box").default> | null>(null);
  // Evita que dos tiradas se pisen si se pulsa el botón varias veces seguidas.
  const busyRef = useRef(false);

  const rollPhysics = useCallback(async (params: RollPhysicsParams) => {
    if (busyRef.current || prefersReducedMotion()) return null;
    busyRef.current = true;

    try {
      const { groups, modifier } = parseDiceFormula(params.formula);
      const notation = groups.map((g) => `${g.count}d${g.faces}`);
      const themeColor = params.themeColor ?? DEFAULT_DICE_COLOR;

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
              // rendimiento en teoría, pero verificar de forma fiable si se
              // cuelga en según qué navegador/pestaña es imposible desde
              // fuera del worker. Para 1-4s de físicas de unos pocos dados,
              // el coste de hacerlo en el hilo principal es imperceptible —
              // se prioriza la fiabilidad confirmada.
              offscreen: false,
            });
            return box.init();
          });
        }
        diceBoxRef.current = await diceBoxLoading.current;
      }

      const diceResults = (await Promise.race([
        diceBoxRef.current.roll(notation, { themeColor }),
        new Promise((_resolve, reject) =>
          setTimeout(() => reject(new Error("roll() no respondió a tiempo")), ROLL_TIMEOUT_MS),
        ),
      ])) as { groupId: number; value: number }[];

      let total = modifier;
      const rolls: DieGroupResult[] = groups.map((group, groupId) => {
        const values = diceResults.filter((r) => r.groupId === groupId).map((r) => r.value);
        total += group.sign * values.reduce((a, b) => a + b, 0);
        return { die: diceFormulaGroupLabel(group), values };
      });

      setResult({
        rolls,
        modifier,
        total,
        label: params.label,
        characterName: params.characterName,
      });
      setPhase("result");

      // No bloquea la promesa que se devuelve: el caller ya puede mandar la
      // tirada al servidor en cuanto la física termina, sin esperar a que
      // el panel de resultado desaparezca solo.
      setTimeout(() => {
        diceBoxRef.current?.clear();
        setPhase(null);
        setResult(null);
        busyRef.current = false;
      }, RESULT_HOLD_MS);

      return { rolls, modifier, total };
    } catch (err) {
      console.error("No se pudo animar los dados 3D, tira el servidor en su lugar.", err);
      // El visor puede haber quedado en mal estado (contexto WebGL
      // perdido, físicas a medias...) — se descarta para forzar una
      // reinicialización limpia en la siguiente tirada.
      diceBoxRef.current = null;
      diceBoxLoading.current = null;
      setPhase(null);
      setResult(null);
      busyRef.current = false;
      return null;
    }
  }, []);

  const contextValue = useMemo(() => ({ rollPhysics }), [rollPhysics]);

  return (
    <DiceOverlayContext.Provider value={contextValue}>
      {children}
      <div className="pointer-events-none fixed inset-0 z-[60]">
        <div id={CANVAS_ID} className="absolute inset-0" />
        {result && phase === "result" && (
          <div className="absolute inset-x-0 bottom-[12%] flex justify-center px-4">
            <div className="max-w-sm rounded-sm border-2 border-gold bg-parchment-panel/95 px-6 py-4 text-center shadow-[0_8px_32px_-8px_rgba(0,0,0,0.5)] backdrop-blur-sm">
              <p className="text-sm text-ink">
                <span className="font-semibold text-oxblood">
                  {result.characterName ?? "Tirada"}
                </span>
                {" — "}
                {result.label}
              </p>
              <p className="mt-1 text-xs text-ink-muted">{formatBreakdown(result)}</p>
              <p className="mt-1 font-display text-4xl font-semibold text-oxblood">
                {result.total}
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
