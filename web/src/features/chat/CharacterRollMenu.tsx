import { useState, type ReactNode } from "react";
import type { AbilityKey, CharacterFull, CharacterRosterEntry } from "@dnd-manager/shared";
import { useCharacter, useSetRollOverride } from "../characters/hooks";
import { useCreateRoll } from "../dice/hooks";
import { useDiceOverlay } from "../dice/DiceOverlay";
import {
  damageActionLabels,
  getRollableActions,
  rollOverrideKey,
  type CombatBonuses,
  type RollableAction,
} from "../characters/rollableActions";
import type { DetectedItemEffect } from "../characters/detectItemEffect";
import { ScalableDamageButton } from "../characters/ScalableDamageButton";
import { ResourceAmountButton } from "../characters/ResourceAmountButton";
import { EditableRollButton } from "../characters/EditableRollButton";
import { PortraitCircle } from "../../components/character/PortraitCircle";
import { toErrorMessage, useToast } from "../../components/ui/Toast";
import {
  ABILITY_FULL_LABELS,
  ABILITY_LABELS,
  SKILL_LABELS,
  asFoundryItems,
} from "../characters/foundryDisplay";

const ABILITY_KEYS: AbilityKey[] = ["str", "dex", "con", "int", "wis", "cha"];

export type Category = "attacks" | "items" | "saves" | "skills";

export const CATEGORY_LABELS: Record<Category, string> = {
  attacks: "Ataques",
  items: "Objetos",
  saves: "Salvación",
  skills: "Habilidad",
};

interface CharacterRollMenuProps {
  characters: CharacterRosterEntry[];
  currentUserId: string;
  isMaster: boolean;
  diceThemeColor: string | null;
  onClose: () => void;
  /** Categoría con la que arranca el selector — p.ej. al entrar desde el menú fijo de móvil. */
  initialCategory?: Category;
  /** Se llama justo tras lanzar una tirada, además de (no en vez de) seguir en el selector — en móvil cierra la bandeja y vuelve al chat. */
  onRolled?: () => void;
}

/**
 * Menú "estilo Pokémon" para tirar sin salir del chat: elegir personaje (si
 * hace falta) → elegir categoría (ataques/objetos/salvación/habilidad) →
 * elegir el movimiento concreto. Un jugador solo ve sus propios personajes;
 * el Master ve todos los del grupo (para tirar por NPCs u otros jugadores
 * si hace falta). Solo tiene sentido con sesión activa — quien lo monta
 * (ChatDockPanel) ya se encarga de eso.
 */
export function CharacterRollMenu({
  characters,
  currentUserId,
  isMaster,
  diceThemeColor,
  onClose,
  initialCategory,
  onRolled,
}: CharacterRollMenuProps) {
  const eligible = isMaster ? characters : characters.filter((c) => c.ownerId === currentUserId);
  const [manualSelectedId, setManualSelectedId] = useState<string | null>(null);
  const selectedId = manualSelectedId ?? (eligible.length === 1 ? (eligible[0]?.id ?? null) : null);

  if (eligible.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
        <p className="text-sm text-ink-muted">No tienes personajes en este grupo.</p>
        <button type="button" onClick={onClose} className="text-sm text-oxblood hover:underline">
          Volver al chat
        </button>
      </div>
    );
  }

  if (!selectedId) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="font-display text-xs tracking-wide text-oxblood">Elige personaje</h3>
          <button type="button" onClick={onClose} className="text-xs text-ink-muted hover:text-ink">
            Volver al chat
          </button>
        </div>
        <ul className="flex-1 space-y-1.5 overflow-y-auto">
          {eligible.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => setManualSelectedId(c.id)}
                className="flex w-full items-center gap-2 rounded-sm border border-rule bg-parchment-panel px-2.5 py-2 text-left hover:border-rule-strong hover:bg-parchment-deep"
              >
                <PortraitCircle url={c.portraitUrl} name={c.name} size={28} />
                <span className="min-w-0 flex-1 truncate text-sm text-ink">{c.name}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <CharacterRollPicker
      characterId={selectedId}
      diceThemeColor={diceThemeColor}
      onBack={() => (eligible.length === 1 ? onClose() : setManualSelectedId(null))}
      onClose={onClose}
      initialCategory={initialCategory}
      onRolled={onRolled}
    />
  );
}

function CharacterRollPicker({
  characterId,
  diceThemeColor,
  onBack,
  onClose,
  initialCategory,
  onRolled,
}: {
  characterId: string;
  diceThemeColor: string | null;
  onBack: () => void;
  onClose: () => void;
  initialCategory?: Category;
  onRolled?: () => void;
}) {
  const { data, isLoading } = useCharacter(characterId);
  const toast = useToast();
  const createRoll = useCreateRoll(data?.access === "FULL" ? data.character.groupId : "");
  const { rollPhysics } = useDiceOverlay();

  if (isLoading || !data) {
    return <p className="text-sm text-ink-muted">Cargando personaje...</p>;
  }
  if (data.access !== "FULL") {
    return <p className="text-sm text-ink-muted">No tienes acceso a este personaje.</p>;
  }
  const character = data.character;

  async function handleRoll(label: string, formula: string) {
    // La física de los dados 3D decide el resultado real en este mismo
    // dispositivo (ver DiceOverlay.rollPhysics) — si no se pudo animar
    // (reduced-motion, sin WebGL...), se manda sin `rolls` y tira el
    // servidor como fallback.
    const physics = await rollPhysics({
      formula,
      label,
      characterName: character.name,
      themeColor: diceThemeColor,
    });
    createRoll.mutate(
      { characterId: character.id, label, formula, rolls: physics?.rolls },
      {
        onError: (err) => toast.error(toErrorMessage(err, "No se pudo tirar los dados.")),
      },
    );
    onRolled?.();
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <PortraitCircle url={character.portraitUrl} name={character.name} size={24} />
          <span className="truncate text-sm font-semibold text-ink">{character.name}</span>
        </div>
        <div className="flex shrink-0 gap-2 text-xs">
          <button type="button" onClick={onBack} className="text-ink-muted hover:text-ink">
            Cambiar
          </button>
          <button type="button" onClick={onClose} className="text-ink-muted hover:text-ink">
            Cerrar
          </button>
        </div>
      </div>
      <CharacterActionsPanel
        character={character}
        onRoll={handleRoll}
        initialCategory={initialCategory}
      />
    </div>
  );
}

/**
 * Categorías (ataques/objetos/salvación/habilidad) + búsqueda + lista con
 * scroll propio acotado — el cuerpo del menú "estilo Pokémon", reutilizado
 * tal cual dentro del combate (ver CombatPanel.tsx) para que el turno de un
 * personaje con muchos hechizos no sea una lista larga sin scroll: aquí
 * mismo se limita la altura en vez de dejar que crezca sin límite.
 */
export function CharacterActionsPanel({
  character,
  onRoll,
  initialCategory,
  combatBonuses,
  onApplyDetectedEffect,
  canPersistOverrides = true,
  scrollClassName = "flex-1 overflow-y-auto",
}: {
  character: CharacterFull;
  onRoll: (label: string, formula: string) => void;
  initialCategory?: Category;
  combatBonuses?: CombatBonuses;
  onApplyDetectedEffect?: (effect: DetectedItemEffect) => void;
  /** `false` cuando `character` en realidad es un enemigo disfrazado de
   * `CharacterFull` (ver CombatPanel.tsx) — no hay fila de personaje real
   * donde guardar un override, así que se omiten los iconos 💾/↺. */
  canPersistOverrides?: boolean;
  /** Clase Tailwind del contenedor con scroll — `flex-1 overflow-y-auto` (por
   * defecto, sigue el alto disponible del cajón de chat) o un `max-h-*
   * overflow-y-auto` cuando el padre no tiene una altura fija (combate). */
  scrollClassName?: string;
}) {
  const [category, setCategory] = useState<Category>(initialCategory ?? "attacks");
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const setRollOverride = useSetRollOverride(character.id);

  const onSaveOverride = canPersistOverrides
    ? (key: string, formula: string) => setRollOverride.mutate({ key, formula })
    : undefined;
  const onClearOverride = canPersistOverrides
    ? (key: string) => setRollOverride.mutate({ key, formula: null })
    : undefined;

  const actions = getRollableActions(character.items, character, combatBonuses);
  const itemTypeById = new Map<string, string>();
  for (const item of asFoundryItems(character.items)) {
    if (item._id) itemTypeById.set(item._id, item.type ?? "");
  }
  const attackActions = actions.filter((a) => isAttackCategory(a, itemTypeById));
  const itemActions = actions.filter((a) => !isAttackCategory(a, itemTypeById));

  return (
    <>
      <div className="mb-2 flex flex-wrap items-center gap-1 border-b border-rule pb-2">
        <div role="tablist" className="flex flex-1 flex-wrap gap-1">
          {(Object.keys(CATEGORY_LABELS) as Category[]).map((cat) => (
            <button
              key={cat}
              type="button"
              role="tab"
              aria-selected={category === cat}
              onClick={() => setCategory(cat)}
              className={`rounded-sm px-2 py-1 font-display text-xs tracking-wide ${
                category === cat ? "bg-oxblood text-ivory" : "text-ink-muted hover:text-ink"
              }`}
            >
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>
        {searchOpen ? (
          <div className="flex items-center gap-1">
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar..."
              className="w-28 rounded-sm border border-rule-strong bg-parchment px-2 py-1 text-xs text-ink outline-none focus:border-oxblood"
            />
            <button
              type="button"
              onClick={() => {
                setSearchOpen(false);
                setQuery("");
              }}
              aria-label="Cerrar búsqueda"
              className="text-ink-muted hover:text-ink"
            >
              ×
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            aria-label="Buscar"
            title="Buscar entre hechizos, ataques y objetos"
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-sm border border-rule text-ink-muted hover:border-rule-strong hover:bg-parchment-deep hover:text-ink"
          >
            <SearchIcon />
          </button>
        )}
      </div>

      <div className={scrollClassName}>
        {query.trim() ? (
          <SearchResults
            query={query}
            actions={actions}
            itemTypeById={itemTypeById}
            character={character}
            onRoll={onRoll}
            onApplyDetectedEffect={onApplyDetectedEffect}
            onSaveOverride={onSaveOverride}
            onClearOverride={onClearOverride}
          />
        ) : (
          <>
            {category === "attacks" && (
              <ActionList
                actions={attackActions}
                onRoll={onRoll}
                empty="Sin ataques."
                onApplyDetectedEffect={onApplyDetectedEffect}
                onSaveOverride={onSaveOverride}
                onClearOverride={onClearOverride}
              />
            )}
            {category === "items" && (
              <ActionList
                actions={itemActions}
                onRoll={onRoll}
                empty="Sin objetos tirables."
                onApplyDetectedEffect={onApplyDetectedEffect}
                onSaveOverride={onSaveOverride}
                onClearOverride={onClearOverride}
              />
            )}
            {category === "saves" && (
              <ul className="space-y-1.5">
                {ABILITY_KEYS.map((key) => {
                  const mod = character.derived.savingThrows[key];
                  const formula = `1d20${mod >= 0 ? "+" : ""}${mod}`;
                  return (
                    <li key={key}>
                      <MoveButton
                        text={`${ABILITY_FULL_LABELS[key]} (${formula})`}
                        onClick={() => onRoll(`Salvación de ${ABILITY_FULL_LABELS[key]}`, formula)}
                      />
                    </li>
                  );
                })}
              </ul>
            )}
            {category === "skills" && (
              <ul className="space-y-1.5">
                {Object.entries(character.derived.skills).map(([code, skill]) => {
                  const label = SKILL_LABELS[code] ?? code;
                  const formula = `1d20${skill.bonus >= 0 ? "+" : ""}${skill.bonus}`;
                  return (
                    <li key={code}>
                      <MoveButton
                        text={`${label} (${ABILITY_LABELS[skill.ability]}) — ${formula}`}
                        onClick={() => onRoll(label, formula)}
                      />
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </div>
    </>
  );
}

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      className="h-3.5 w-3.5"
    >
      <circle cx="8.5" cy="8.5" r="5.5" />
      <path d="M16.5 16.5 13 13" strokeLinecap="round" />
    </svg>
  );
}

// Marcas diacríticas combinantes (acentos sueltos tras normalize("NFD")) —
// para que "pocion" encuentre "Poción" y viceversa.
const DIACRITICS_REGEX = /[̀-ͯ]/g;
function normalizeSearch(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(DIACRITICS_REGEX, "");
}

/**
 * "Ataques" = armas/conjuros (por tipo de ítem) O cualquier acción que
 * reparte daño de verdad (kind "damage" con una fórmula real, o con tirada
 * de ataque propia) — dotes de clase como Ataque Furtivo son `type: "feat"`,
 * no `weapon`/`spell`, pero sí que reparten daño en combate, así que antes
 * acababan en "Objetos" solo por el tipo de ítem.
 */
function isAttackCategory(action: RollableAction, itemTypeById: Map<string, string>): boolean {
  if (["weapon", "spell"].includes(itemTypeById.get(action.itemId) ?? "")) return true;
  return (
    action.attackFormula !== null || (action.kind === "damage" && action.damageFormula !== null)
  );
}

interface RollOverrideCallbacks {
  onSaveOverride?: (key: string, formula: string) => void;
  onClearOverride?: (key: string) => void;
}

/** Botón de ataque de una RollableAction — editable y (si se pasan los
 * callbacks) guardable. `renderButton` deja que cada superficie (chat,
 * ficha, combate) pinte su propio estilo de botón. */
export function AttackRollButton({
  action,
  label,
  onRoll,
  onSaveOverride,
  onClearOverride,
  renderButton,
}: RollOverrideCallbacks & {
  action: RollableAction;
  label: string;
  onRoll: (label: string, formula: string) => void;
  renderButton: (text: string, onClick: () => void) => ReactNode;
}) {
  if (!action.attackFormula) return null;
  const key = rollOverrideKey(action, "attack");
  return (
    <EditableRollButton
      formula={action.attackFormula}
      onRoll={(formula) => onRoll(`Ataque: ${label}`, formula)}
      onSave={onSaveOverride ? (f) => onSaveOverride(key, f) : undefined}
      onClearSaved={onClearOverride ? () => onClearOverride(key) : undefined}
      renderButton={(formula, onClick) => renderButton(`Atacar (${formula})`, onClick)}
    />
  );
}

/** Botón de daño/curación de una RollableAction — cubre tanto el caso
 * escalable por hueco (ScalableDamageButton) como el de recurso gastable
 * (ResourceAmountButton), editable y guardable igual que `AttackRollButton`. */
export function DamageRollButton({
  action,
  label,
  onRoll,
  onSaveOverride,
  onClearOverride,
  renderButton,
}: RollOverrideCallbacks & {
  action: RollableAction;
  label: string;
  onRoll: (label: string, formula: string) => void;
  renderButton: (text: string, onClick: () => void) => ReactNode;
}) {
  const key = rollOverrideKey(action, action.kind === "heal" ? "heal" : "damage");
  const onSave = onSaveOverride ? (f: string) => onSaveOverride(key, f) : undefined;
  const onClearSaved = onClearOverride ? () => onClearOverride(key) : undefined;
  const rollLabel = `${damageActionLabels(action.kind).prefix}: ${label}`;
  const verb = damageActionLabels(action.kind).verb;

  if (action.resourceScaling) {
    return (
      <ResourceAmountButton
        label={rollLabel}
        action={action.resourceScaling}
        onRoll={onRoll}
        renderButton={(formula) => (
          <EditableRollButton
            formula={formula}
            onRoll={(f) => onRoll(rollLabel, f)}
            onSave={onSave}
            onClearSaved={onClearSaved}
            renderButton={(f, editClick) => renderButton(`${verb} (${f})`, editClick)}
          />
        )}
      />
    );
  }
  return (
    <ScalableDamageButton
      label={rollLabel}
      action={action}
      onRoll={onRoll}
      renderButton={(formula) => (
        <EditableRollButton
          formula={formula}
          onRoll={(f) => onRoll(rollLabel, f)}
          onSave={onSave}
          onClearSaved={onClearSaved}
          renderButton={(f, editClick) => renderButton(`${verb} (${f})`, editClick)}
        />
      )}
    />
  );
}

/**
 * Búsqueda unificada: mezcla ataques, objetos, salvaciones y habilidades en
 * una sola lista (a diferencia de las pestañas, separadas por categoría) —
 * para no obligar a saber de antemano si "bola de fuego" es un ataque o un
 * objeto, ni tener que cambiar de pestaña para encontrar una salvación.
 */
function SearchResults({
  query,
  actions,
  itemTypeById,
  character,
  onRoll,
  onApplyDetectedEffect,
  onSaveOverride,
  onClearOverride,
}: {
  query: string;
  actions: RollableAction[];
  itemTypeById: Map<string, string>;
  character: CharacterFull;
  onRoll: (label: string, formula: string) => void;
  onApplyDetectedEffect?: (effect: DetectedItemEffect) => void;
  onSaveOverride?: (key: string, formula: string) => void;
  onClearOverride?: (key: string) => void;
}) {
  const normalizedQuery = normalizeSearch(query.trim());

  const actionMatches = actions
    .map((action, index) => ({
      action,
      index,
      label: action.activityName ? `${action.itemName} (${action.activityName})` : action.itemName,
      category: isAttackCategory(action, itemTypeById) ? "Ataque" : "Objeto",
    }))
    .filter(({ label }) => normalizeSearch(label).includes(normalizedQuery));

  const saveMatches = ABILITY_KEYS.filter((key) =>
    normalizeSearch(ABILITY_FULL_LABELS[key]).includes(normalizedQuery),
  );

  const skillMatches = Object.entries(character.derived.skills).filter(([code]) =>
    normalizeSearch(SKILL_LABELS[code] ?? code).includes(normalizedQuery),
  );

  if (actionMatches.length === 0 && saveMatches.length === 0 && skillMatches.length === 0) {
    return <p className="text-sm text-ink-muted">Sin resultados para «{query.trim()}».</p>;
  }

  return (
    <ul className="space-y-1.5">
      {actionMatches.map(({ action, index, label, category }) => (
        <li
          key={`${action.itemId}-${action.activityId}-${index}`}
          className="rounded-sm border border-rule bg-parchment-panel px-2.5 py-2"
        >
          <div className="mb-1 flex items-center justify-between gap-2">
            <span className="truncate text-sm text-ink">{label}</span>
            <span className="shrink-0 text-[0.65rem] uppercase tracking-wide text-ink-muted">
              {category}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <AttackRollButton
              action={action}
              label={label}
              onRoll={onRoll}
              onSaveOverride={onSaveOverride}
              onClearOverride={onClearOverride}
              renderButton={(text, onClick) => <MoveButton text={text} onClick={onClick} />}
            />
            <DamageRollButton
              action={action}
              label={label}
              onRoll={onRoll}
              onSaveOverride={onSaveOverride}
              onClearOverride={onClearOverride}
              renderButton={(text, onClick) => <MoveButton text={text} onClick={onClick} />}
            />
            {action.targetCount ? (
              <span className="self-center text-xs text-ink-muted">
                Objetivos: {action.targetCount}
              </span>
            ) : null}
            {action.detectedEffect && onApplyDetectedEffect && (
              <MoveButton
                text={`+ ${action.detectedEffect.name} (${action.detectedEffect.roundsRemaining})`}
                onClick={() => onApplyDetectedEffect(action.detectedEffect!)}
              />
            )}
          </div>
        </li>
      ))}
      {saveMatches.map((key) => {
        const mod = character.derived.savingThrows[key];
        const formula = `1d20${mod >= 0 ? "+" : ""}${mod}`;
        return (
          <li key={`save-${key}`}>
            <MoveButton
              text={`Salvación de ${ABILITY_FULL_LABELS[key]} (${formula})`}
              onClick={() => onRoll(`Salvación de ${ABILITY_FULL_LABELS[key]}`, formula)}
            />
          </li>
        );
      })}
      {skillMatches.map(([code, skill]) => {
        const label = SKILL_LABELS[code] ?? code;
        const formula = `1d20${skill.bonus >= 0 ? "+" : ""}${skill.bonus}`;
        return (
          <li key={`skill-${code}`}>
            <MoveButton
              text={`${label} (${ABILITY_LABELS[skill.ability]}) — ${formula}`}
              onClick={() => onRoll(label, formula)}
            />
          </li>
        );
      })}
    </ul>
  );
}

function ActionList({
  actions,
  onRoll,
  empty,
  onApplyDetectedEffect,
  onSaveOverride,
  onClearOverride,
}: {
  actions: RollableAction[];
  onRoll: (label: string, formula: string) => void;
  empty: string;
  onApplyDetectedEffect?: (effect: DetectedItemEffect) => void;
  onSaveOverride?: (key: string, formula: string) => void;
  onClearOverride?: (key: string) => void;
}) {
  if (actions.length === 0) return <p className="text-sm text-ink-muted">{empty}</p>;
  return (
    <ul className="space-y-1.5">
      {actions.map((action, index) => {
        const label = action.activityName
          ? `${action.itemName} (${action.activityName})`
          : action.itemName;
        return (
          // itemId cae a activityId cuando el item no trae _id (ver
          // rollableActions.ts): con varios items así en la misma ficha,
          // itemId+activityId puede repetirse. El índice desempata — la
          // lista es estable (se recalcula entera cada vez, sin reordenar).
          <li
            key={`${action.itemId}-${action.activityId}-${index}`}
            className="rounded-sm border border-rule bg-parchment-panel px-2.5 py-2"
          >
            <div className="mb-1 truncate text-sm text-ink">{label}</div>
            <div className="flex flex-wrap gap-1.5">
              <AttackRollButton
                action={action}
                label={label}
                onRoll={onRoll}
                onSaveOverride={onSaveOverride}
                onClearOverride={onClearOverride}
                renderButton={(text, onClick) => <MoveButton text={text} onClick={onClick} />}
              />
              <DamageRollButton
                action={action}
                label={label}
                onRoll={onRoll}
                onSaveOverride={onSaveOverride}
                onClearOverride={onClearOverride}
                renderButton={(text, onClick) => <MoveButton text={text} onClick={onClick} />}
              />
              {action.targetCount ? (
                <span className="self-center text-xs text-ink-muted">
                  Objetivos: {action.targetCount}
                </span>
              ) : null}
              {action.detectedEffect && onApplyDetectedEffect && (
                <MoveButton
                  text={`+ ${action.detectedEffect.name} (${action.detectedEffect.roundsRemaining})`}
                  onClick={() => onApplyDetectedEffect(action.detectedEffect!)}
                />
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function MoveButton({ text, onClick }: { text: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-sm border border-rule-strong px-2 py-1.5 text-left text-xs text-ink hover:border-rule-strong hover:bg-parchment-deep/40 hover:text-ink"
    >
      🎲 {text}
    </button>
  );
}
