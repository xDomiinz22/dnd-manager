import { useState } from "react";
import type { AbilityKey, CharacterRosterEntry } from "@dnd-manager/shared";
import { useCharacter } from "../characters/hooks";
import { useCreateRoll } from "../dice/hooks";
import { useDiceRollFeedback } from "../dice/DiceRollFeedback";
import { getRollableActions, type RollableAction } from "../characters/rollableActions";
import { PortraitCircle } from "../../components/character/PortraitCircle";
import { toErrorMessage, useToast } from "../../components/ui/Toast";
import {
  ABILITY_FULL_LABELS,
  ABILITY_LABELS,
  SKILL_LABELS,
  asFoundryItems,
} from "../characters/foundryDisplay";

const ABILITY_KEYS: AbilityKey[] = ["str", "dex", "con", "int", "wis", "cha"];

type Category = "attacks" | "items" | "saves" | "skills";

const CATEGORY_LABELS: Record<Category, string> = {
  attacks: "Ataques",
  items: "Objetos",
  saves: "Salvación",
  skills: "Habilidad",
};

interface CharacterRollMenuProps {
  characters: CharacterRosterEntry[];
  currentUserId: string;
  isMaster: boolean;
  onClose: () => void;
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
  onClose,
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
      onBack={() => (eligible.length === 1 ? onClose() : setManualSelectedId(null))}
      onClose={onClose}
    />
  );
}

function CharacterRollPicker({
  characterId,
  onBack,
  onClose,
}: {
  characterId: string;
  onBack: () => void;
  onClose: () => void;
}) {
  const { data, isLoading } = useCharacter(characterId);
  const toast = useToast();
  const diceFeedback = useDiceRollFeedback();
  const createRoll = useCreateRoll(data?.access === "FULL" ? data.character.groupId : "");
  const [category, setCategory] = useState<Category>("attacks");

  if (isLoading || !data) {
    return <p className="text-sm text-ink-muted">Cargando personaje...</p>;
  }
  if (data.access !== "FULL") {
    return <p className="text-sm text-ink-muted">No tienes acceso a este personaje.</p>;
  }
  const character = data.character;

  function handleRoll(label: string, formula: string) {
    createRoll.mutate(
      { characterId: character.id, label, formula },
      {
        onSuccess: (roll) => diceFeedback.show(roll),
        onError: (err) => toast.error(toErrorMessage(err, "No se pudo tirar los dados.")),
      },
    );
  }

  const actions = getRollableActions(character.items, character);
  const itemTypeById = new Map<string, string>();
  for (const item of asFoundryItems(character.items)) {
    if (item._id) itemTypeById.set(item._id, item.type ?? "");
  }
  const attackActions = actions.filter((a) =>
    ["weapon", "spell"].includes(itemTypeById.get(a.itemId) ?? ""),
  );
  const itemActions = actions.filter(
    (a) => !["weapon", "spell"].includes(itemTypeById.get(a.itemId) ?? ""),
  );

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

      <div role="tablist" className="mb-2 flex flex-wrap gap-1 border-b border-rule pb-2">
        {(Object.keys(CATEGORY_LABELS) as Category[]).map((cat) => (
          <button
            key={cat}
            type="button"
            role="tab"
            aria-selected={category === cat}
            onClick={() => setCategory(cat)}
            className={`rounded-sm px-2 py-1 font-display text-xs tracking-wide ${
              category === cat ? "bg-oxblood text-parchment" : "text-ink-muted hover:text-ink"
            }`}
          >
            {CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {category === "attacks" && (
          <ActionList actions={attackActions} onRoll={handleRoll} empty="Sin ataques." />
        )}
        {category === "items" && (
          <ActionList actions={itemActions} onRoll={handleRoll} empty="Sin objetos tirables." />
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
                    onClick={() => handleRoll(`Salvación de ${ABILITY_FULL_LABELS[key]}`, formula)}
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
                    onClick={() => handleRoll(label, formula)}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function ActionList({
  actions,
  onRoll,
  empty,
}: {
  actions: RollableAction[];
  onRoll: (label: string, formula: string) => void;
  empty: string;
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
              {action.attackFormula && (
                <MoveButton
                  text={`Atacar (${action.attackFormula})`}
                  onClick={() => onRoll(`Ataque: ${label}`, action.attackFormula!)}
                />
              )}
              {action.damageFormula && (
                <MoveButton
                  text={`Daño (${action.damageFormula})`}
                  onClick={() => onRoll(`Daño: ${label}`, action.damageFormula!)}
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
