/** D&D redondea el promedio de un dado hacia arriba: floor(caras/2) + 1 — mismo cálculo que `lib/dnd5e-derive.ts:avgDieValue`, duplicado aquí porque ese módulo es server-only (root `lib/`, fuera del paquete `web`) y esta es una función de una línea. */
function avgDieValue(dieSize: number): number {
  return Math.floor(dieSize / 2) + 1;
}

/**
 * Evaluador de fórmulas de Foundry (`@refs` + aritmética + dados) — ver la
 * guía de escalados D&D 5e entregada por el usuario, §1-§4. Es el
 * prerrequisito de todo el escalado de daño/curación: las fórmulas del
 * `.md` traen referencias `@algo.algo` sin resolver (nunca vienen los
 * valores ya calculados) y a veces aritmética real (`max(1, @abilities.cha.mod)`,
 * `5 * @classes.paladin.levels - @item.uses.spent`...), no basta un
 * `String.replace` con regex.
 */

// ---------------------------------------------------------------------------
// Roll data: el diccionario "@..." que resuelve las referencias.
// ---------------------------------------------------------------------------

export interface ScaleValueResolved {
  value: string | number | null;
  number?: number | null;
  die?: string | null;
  faces?: number | null;
}

/** Rutas que soportamos ahora mismo (fase 1+2 de la guía) — se amplía en fases posteriores. */
export interface RollData {
  abilities: Record<string, { value: number; mod: number }>;
  attributes: { spellcasting: string | null };
  classes: Record<string, { levels: number }>;
  subclasses: Record<string, { levels: number }>;
  details: { level: number };
  prof: number;
  scale: Record<string, Record<string, ScaleValueResolved | null>>;
  /** Modificador de característica resuelto para la activity concreta que se está tirando (equivale a `@mod`). */
  mod: number;
  item?: { level?: number };
}

/**
 * Sustituye cada `@a.b.c` por su valor en `rollData`. Ruta inexistente → `"0"`,
 * igual que hace Foundry (nunca se lanza una excepción por una referencia
 * rota). Si el valor final es un `ScaleValueResolved` (el propio objeto que
 * guarda `resolveScaleValues`), se desenvuelve a su `.value` — así
 * `@scale.rogue.sneak-attack` da directamente `"2d6"` en vez del objeto.
 */
function substituteRefs(formula: string, rollData: RollData): string {
  return formula.replace(/@[A-Za-z0-9_.-]+/g, (match) => {
    const path = match.slice(1).split(".");
    let value: unknown = rollData;
    for (const key of path) {
      if (value === null || typeof value !== "object") {
        value = undefined;
        break;
      }
      value = (value as Record<string, unknown>)[key];
    }
    if (value && typeof value === "object" && "value" in value) {
      value = (value as { value: unknown }).value;
    }
    if (typeof value === "number") return String(value);
    if (typeof value === "string" && value.length > 0) return value;
    return "0";
  });
}

// ---------------------------------------------------------------------------
// (expr)dN — caso especial obligatorio (Booming Blade): el nº de dados puede
// venir como una expresión entre paréntesis pegada directamente a "dN". Se
// resuelve ANTES de tokenizar el resto: se evalúa esa expresión de forma
// determinista (el nº de dados siempre tiene que ser un entero) y se
// sustituye por "{count}dN" literal.
// ---------------------------------------------------------------------------

function resolveParenDiceCounts(formula: string, rollData: RollData): string {
  let result = "";
  let i = 0;
  while (i < formula.length) {
    if (formula[i] === "(") {
      let depth = 1;
      let j = i + 1;
      while (j < formula.length && depth > 0) {
        if (formula[j] === "(") depth++;
        else if (formula[j] === ")") depth--;
        j++;
      }
      const inner = formula.slice(i + 1, j - 1);
      const rest = formula.slice(j);
      const diceMatch = rest.match(/^d(\d+)/);
      if (diceMatch) {
        const count = evaluateFormula(inner, rollData, { deterministic: true });
        result += `${count}d${diceMatch[1]}`;
        i = j + diceMatch[0].length;
        continue;
      }
      result += `(${resolveParenDiceCounts(inner, rollData)})`;
      i = j;
      continue;
    }
    result += formula[i];
    i++;
  }
  return result;
}

// ---------------------------------------------------------------------------
// Tokenizer + parser recursivo-descendente.
// ---------------------------------------------------------------------------

type TokenType = "number" | "dice" | "ident" | "+" | "-" | "*" | "/" | "(" | ")" | ",";
interface Token {
  type: TokenType;
  text: string;
}

// Término de dado: "2d8", "d6", "1d20kh1", "3d6[fire]"... — se preserva como
// unidad opaca (modificadores tipo kh/r1/min2 y el sufijo de sabor [texto]
// no se interpretan, solo se conservan para el string final tirable).
const DICE_TOKEN = /\d*d\d+(?:[a-zA-Z]+\d*)*(?:\[[^\]]*\])?/y;
const NUMBER_TOKEN = /\d+(?:\.\d+)?/y;
const IDENT_TOKEN = /[a-zA-Z]+/y;

function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < source.length) {
    const ch = source[i]!;
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    if ("+-*/(),".includes(ch)) {
      tokens.push({ type: ch as TokenType, text: ch });
      i++;
      continue;
    }
    DICE_TOKEN.lastIndex = i;
    const diceMatch = DICE_TOKEN.exec(source);
    if (diceMatch && diceMatch.index === i && /d/.test(diceMatch[0])) {
      tokens.push({ type: "dice", text: diceMatch[0] });
      i += diceMatch[0].length;
      continue;
    }
    NUMBER_TOKEN.lastIndex = i;
    const numberMatch = NUMBER_TOKEN.exec(source);
    if (numberMatch && numberMatch.index === i) {
      tokens.push({ type: "number", text: numberMatch[0] });
      i += numberMatch[0].length;
      continue;
    }
    IDENT_TOKEN.lastIndex = i;
    const identMatch = IDENT_TOKEN.exec(source);
    if (identMatch && identMatch.index === i) {
      tokens.push({ type: "ident", text: identMatch[0] });
      i += identMatch[0].length;
      continue;
    }
    // Carácter no reconocido: se ignora (mejor esfuerzo, nunca reventar el parseo).
    i++;
  }
  return tokens;
}

type Node =
  | { kind: "number"; value: number }
  | { kind: "dice"; text: string }
  | { kind: "call"; name: string; args: Node[] }
  | { kind: "binop"; op: "+" | "-" | "*" | "/"; left: Node; right: Node }
  | { kind: "neg"; value: Node };

class Parser {
  private pos = 0;
  constructor(private tokens: Token[]) {}

  private peek(): Token | undefined {
    return this.tokens[this.pos];
  }
  private next(): Token | undefined {
    return this.tokens[this.pos++];
  }

  parseExpr(): Node {
    let node = this.parseTerm();
    for (;;) {
      const tok = this.peek();
      if (tok?.type === "+" || tok?.type === "-") {
        this.next();
        node = { kind: "binop", op: tok.type, left: node, right: this.parseTerm() };
      } else break;
    }
    return node;
  }

  private parseTerm(): Node {
    let node = this.parseUnary();
    for (;;) {
      const tok = this.peek();
      if (tok?.type === "*" || tok?.type === "/") {
        this.next();
        node = { kind: "binop", op: tok.type, left: node, right: this.parseUnary() };
      } else break;
    }
    return node;
  }

  private parseUnary(): Node {
    if (this.peek()?.type === "-") {
      this.next();
      return { kind: "neg", value: this.parseUnary() };
    }
    return this.parsePrimary();
  }

  private parsePrimary(): Node {
    const tok = this.next();
    if (!tok) return { kind: "number", value: 0 };
    if (tok.type === "number") return { kind: "number", value: Number(tok.text) };
    if (tok.type === "dice") return { kind: "dice", text: tok.text };
    if (tok.type === "(") {
      const inner = this.parseExpr();
      if (this.peek()?.type === ")") this.next();
      return inner;
    }
    if (tok.type === "ident") {
      if (this.peek()?.type === "(") {
        this.next();
        const args: Node[] = [];
        if (this.peek()?.type !== ")") {
          args.push(this.parseExpr());
          while (this.peek()?.type === ",") {
            this.next();
            args.push(this.parseExpr());
          }
        }
        if (this.peek()?.type === ")") this.next();
        return { kind: "call", name: tok.text.toLowerCase(), args };
      }
      // Identificador suelto sin paréntesis (no debería pasar con refs ya
      // sustituidas) — se trata como 0 en vez de reventar el parseo.
      return { kind: "number", value: 0 };
    }
    return { kind: "number", value: 0 };
  }
}

function parse(source: string): Node {
  return new Parser(tokenize(source)).parseExpr();
}

// ---------------------------------------------------------------------------
// Evaluador determinista → number (dados promediados). Para CD, usos
// máximos, nº de objetivos... (fases posteriores de la guía).
// ---------------------------------------------------------------------------

function applyFunc(name: string, args: number[]): number {
  switch (name) {
    case "floor":
      return Math.floor(args[0] ?? 0);
    case "ceil":
      return Math.ceil(args[0] ?? 0);
    case "round":
      return Math.round(args[0] ?? 0);
    case "min":
      return Math.min(...args);
    case "max":
      return Math.max(...args);
    case "abs":
      return Math.abs(args[0] ?? 0);
    default:
      return args[0] ?? 0;
  }
}

function diceAverage(text: string): number {
  const match = text.match(/^(\d*)d(\d+)/);
  if (!match) return 0;
  const count = Number(match[1] || "1");
  const faces = Number(match[2]);
  return count * avgDieValue(faces);
}

function evalDeterministicNode(node: Node): number {
  switch (node.kind) {
    case "number":
      return node.value;
    case "dice":
      return diceAverage(node.text);
    case "call":
      return applyFunc(node.name, node.args.map(evalDeterministicNode));
    case "neg":
      return -evalDeterministicNode(node.value);
    case "binop": {
      const l = evalDeterministicNode(node.left);
      const r = evalDeterministicNode(node.right);
      switch (node.op) {
        case "+":
          return l + r;
        case "-":
          return l - r;
        case "*":
          return l * r;
        case "/":
          return r === 0 ? 0 : l / r;
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Evaluador "fórmula" → string tirable. Colapsa la aritmética pura a un
// número; preserva los términos de dado tal cual (incluida la
// multiplicación escalar×dado, p.ej. "2 * @scale.bard.inspiration" con
// inspiration="d8" → "2d8", necesaria para el canal B del escalado).
// ---------------------------------------------------------------------------

interface FormulaVal {
  text: string;
  numeric: number | null;
}

function numericVal(n: number): FormulaVal {
  return { text: String(n), numeric: n };
}
function textVal(text: string): FormulaVal {
  return { text, numeric: null };
}

/** Multiplica el Nº de dados de un término "NdM..." por `scalar`; null si `text` no es un único término de dado. */
function scaleDiceTerm(text: string, scalar: number): string | null {
  const match = text.match(/^(\d*)d(\d+)(.*)$/s);
  if (!match) return null;
  const count = Number(match[1] || "1") * scalar;
  return `${count}d${match[2]}${match[3] ?? ""}`;
}

function evalFormulaNode(node: Node): FormulaVal {
  switch (node.kind) {
    case "number":
      return numericVal(node.value);
    case "dice":
      return textVal(node.text);
    case "call":
      return numericVal(applyFunc(node.name, node.args.map(evalDeterministicNode)));
    case "neg": {
      const v = evalFormulaNode(node.value);
      return v.numeric !== null ? numericVal(-v.numeric) : textVal(`-${v.text}`);
    }
    case "binop": {
      const l = evalFormulaNode(node.left);
      const r = evalFormulaNode(node.right);
      if (l.numeric !== null && r.numeric !== null) {
        switch (node.op) {
          case "+":
            return numericVal(l.numeric + r.numeric);
          case "-":
            return numericVal(l.numeric - r.numeric);
          case "*":
            return numericVal(l.numeric * r.numeric);
          case "/":
            return numericVal(r.numeric === 0 ? 0 : l.numeric / r.numeric);
        }
      }
      if (node.op === "*") {
        const scalar = l.numeric ?? r.numeric;
        const diceText = l.numeric !== null ? r.text : l.text;
        const scaled = scalar !== null ? scaleDiceTerm(diceText, scalar) : null;
        if (scaled) return textVal(scaled);
      }
      if (node.op === "+" || node.op === "-") {
        return textVal(`${l.text} ${node.op} ${r.text}`);
      }
      // "/" entre términos con dados, o "*" no combinable: mejor esfuerzo, se concatena tal cual.
      return textVal(`${l.text} ${node.op} ${r.text}`);
    }
  }
}

// ---------------------------------------------------------------------------
// API pública
// ---------------------------------------------------------------------------

export interface EvaluateFormulaOptions {
  deterministic?: boolean;
}

export function evaluateFormula(
  formula: string,
  rollData: RollData,
  options: { deterministic: true },
): number;
export function evaluateFormula(
  formula: string,
  rollData: RollData,
  options?: { deterministic?: false },
): string;
export function evaluateFormula(
  formula: string,
  rollData: RollData,
  options: EvaluateFormulaOptions = {},
): number | string {
  const substituted = substituteRefs(formula, rollData);
  const withDiceCounts = resolveParenDiceCounts(substituted, rollData);
  const ast = parse(withDiceCounts);
  if (options.deterministic) return evalDeterministicNode(ast);
  const result = evalFormulaNode(ast);
  return result.text;
}

/**
 * Canal B del escalado (§4.1, `Roll#alter(increase, 0, {multiplyNumeric:true})`):
 * multiplica el Nº de dados de cada término `NdM` Y cada número suelto por
 * `factor`. No usa `@refs` (se aplica siempre sobre una `scaling.formula` ya
 * literal, tipo `"1d6 + 2"`) — un simple escaneo léxico basta, no hace falta
 * el parser completo.
 */
export function multiplyFormulaTerms(formula: string, factor: number): string {
  return formula.replace(
    /(\d*)d(\d+)([a-zA-Z]*)|(\d+(?:\.\d+)?)/g,
    (match, diceCount: string, diceFaces: string, diceMods: string, bareNumber: string) => {
      if (diceFaces !== undefined) {
        const count = (Number(diceCount) || 1) * factor;
        return `${count}d${diceFaces}${diceMods ?? ""}`;
      }
      return String(Number(bareNumber) * factor);
    },
  );
}
