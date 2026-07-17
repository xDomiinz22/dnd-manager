/**
 * @3d-dice/dice-box no distribuye tipos propios (paquete sin .d.ts). Se
 * declara aquí solo la parte de la API que usamos de verdad — ver
 * node_modules/@3d-dice/dice-box/dist/dice-box.es.js para el resto.
 */
declare module "@3d-dice/dice-box" {
  export interface DiceBoxRollResult {
    sides: number | string;
    value: number;
    groupId: number;
    rollId: number;
    theme: string;
    themeColor?: string;
  }

  export interface DiceBoxConfig {
    /** Selector CSS del contenedor donde se monta el canvas. */
    container: string;
    assetPath?: string;
    origin?: string;
    theme?: string;
    themeColor?: string;
    scale?: number;
    gravity?: number;
    friction?: number;
    restitution?: number;
    delay?: number;
    offscreen?: boolean;
    onRollComplete?: (results: DiceBoxRollResult[]) => void;
  }

  export default class DiceBox {
    constructor(config: DiceBoxConfig);
    init(): Promise<DiceBox>;
    roll(
      notation: string | string[] | { qty: number; sides: number | string }[],
      options?: { theme?: string; themeColor?: string },
    ): Promise<DiceBoxRollResult[]>;
    clear(): void;
    hide(): void;
    show(): void;
  }
}
