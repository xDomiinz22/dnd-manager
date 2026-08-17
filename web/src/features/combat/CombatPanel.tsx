import { useState, type ReactNode } from "react";
import type {
  CharacterFull,
  CharacterRosterEntry,
  CombatParticipantDto,
} from "@dnd-manager/shared";
import { useEnemies, useEnemy } from "../enemies/hooks";
import { useCharacter } from "../characters/hooks";
import { useCreateRoll } from "../dice/hooks";
import { useDiceOverlay } from "../dice/DiceOverlay";
import { type ActionTypeKey, type CombatBonuses } from "../characters/rollableActions";
import type { DetectedItemEffect } from "../characters/detectItemEffect";
import { EditableRollButton } from "../characters/EditableRollButton";
import { CharacterActionsPanel } from "../chat/CharacterRollMenu";
import {
  useApplyEffect,
  useCombatEncounter,
  useEndCombat,
  useLockOrder,
  useNextTurn,
  useRemoveEffect,
  useRollInitiative,
  useStartCombat,
} from "./hooks";
import { PortraitCircle } from "../../components/character/PortraitCircle";
import { Button } from "../../components/ui/Button";
import { toErrorMessage, useToast } from "../../components/ui/Toast";
import XIcon from "../../components/icons/x-icon";

interface CombatPanelProps {
  groupId: string;
  isMaster: boolean;
  currentUserId: string;
  diceThemeColor: string | null;
  sessionActive: boolean;
  characters: CharacterRosterEntry[];
}

/**
 * Rastreador de combate dentro del propio panel de chat (no un panel aparte):
 * el Master lo inicia desde aquí una vez hay sesión de chat activa, cada
 * combatiente tira su iniciativa con la misma física de dados que el resto
 * de tiradas, y el orden de turnos queda fijado y visible aquí para todos
 * mientras dura el combate.
 */
export function CombatPanel({
  groupId,
  isMaster,
  currentUserId,
  diceThemeColor,
  sessionActive,
  characters,
}: CombatPanelProps) {
  const { data: combat } = useCombatEncounter(groupId, { enabled: sessionActive });
  const [starting, setStarting] = useState(false);

  if (!sessionActive) return null;

  if (!combat) {
    if (!isMaster) return null;
    return (
      <div className="mb-3 border-b border-rule pb-3">
        <Button variant="ghost" onClick={() => setStarting((v) => !v)}>
          {starting ? "Cancelar" : "⚔ Iniciar combate"}
        </Button>
        {starting && (
          <StartCombatForm
            groupId={groupId}
            characters={characters}
            onDone={() => setStarting(false)}
          />
        )}
      </div>
    );
  }

  return (
    <CombatSidebar
      groupId={groupId}
      combat={combat.participants}
      round={combat.round}
      currentTurnIndex={combat.currentTurnIndex}
      isMaster={isMaster}
      currentUserId={currentUserId}
      diceThemeColor={diceThemeColor}
    />
  );
}

function StartCombatForm({
  groupId,
  characters,
  onDone,
}: {
  groupId: string;
  characters: CharacterRosterEntry[];
  onDone: () => void;
}) {
  const { data: enemies } = useEnemies(groupId);
  const startCombat = useStartCombat(groupId);
  const toast = useToast();
  const [selectedCharacters, setSelectedCharacters] = useState<Set<string>>(new Set());
  const [enemyCounts, setEnemyCounts] = useState<Record<string, number>>({});

  const masterEnemies = (enemies ?? []).filter(
    (e): e is Extract<typeof e, { access: "FULL" }> => e.access === "FULL",
  );

  function toggleCharacter(id: string) {
    setSelectedCharacters((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleSubmit() {
    const enemyEntries = Object.entries(enemyCounts)
      .filter(([, count]) => count > 0)
      .map(([enemyId, count]) => ({ enemyId, count }));
    startCombat.mutate(
      { characterIds: Array.from(selectedCharacters), enemies: enemyEntries },
      {
        onSuccess: () => {
          toast.success("Combate iniciado — ¡que tiren iniciativa!");
          onDone();
        },
        onError: (err) => toast.error(toErrorMessage(err, "No se pudo iniciar el combate.")),
      },
    );
  }

  return (
    <div className="mt-2 space-y-3 rounded-sm border border-rule bg-parchment-panel p-3">
      <div>
        <p className="mb-1 text-xs text-ink-muted">Personajes</p>
        <ul className="space-y-1">
          {characters.map((c) => (
            <li key={c.id}>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={selectedCharacters.has(c.id)}
                  onChange={() => toggleCharacter(c.id)}
                  className="accent-oxblood"
                />
                <PortraitCircle url={c.portraitUrl} name={c.name} size={22} />
                {c.name}
              </label>
            </li>
          ))}
        </ul>
      </div>

      {masterEnemies.length > 0 && (
        <div>
          <p className="mb-1 text-xs text-ink-muted">Enemigos</p>
          <ul className="space-y-1">
            {masterEnemies.map((item) => (
              <li key={item.enemy.id} className="flex items-center gap-2 text-sm text-ink">
                <PortraitCircle url={item.enemy.portraitUrl} name={item.enemy.name} size={22} />
                <span className="min-w-0 flex-1 truncate">{item.enemy.name}</span>
                <input
                  type="number"
                  min={0}
                  max={20}
                  value={enemyCounts[item.enemy.id] ?? 0}
                  onChange={(e) =>
                    setEnemyCounts((prev) => ({
                      ...prev,
                      [item.enemy.id]: Number(e.target.value),
                    }))
                  }
                  className="w-14 rounded-sm border border-rule-strong bg-parchment px-1.5 py-0.5 text-center text-ink"
                />
              </li>
            ))}
          </ul>
        </div>
      )}

      <Button onClick={handleSubmit} isLoading={startCombat.isPending} loadingText="Iniciando...">
        Empezar combate
      </Button>
    </div>
  );
}

function CombatSidebar({
  groupId,
  combat: participants,
  round,
  currentTurnIndex,
  isMaster,
  currentUserId,
  diceThemeColor,
}: {
  groupId: string;
  combat: CombatParticipantDto[];
  round: number;
  currentTurnIndex: number | null;
  isMaster: boolean;
  currentUserId: string;
  diceThemeColor: string | null;
}) {
  const rollInitiative = useRollInitiative(groupId);
  const lockOrder = useLockOrder(groupId);
  const nextTurn = useNextTurn(groupId);
  const endCombat = useEndCombat(groupId);
  const { rollPhysics } = useDiceOverlay();
  const toast = useToast();

  const allRolled = participants.every((p) => p.initiativeTotal !== null);
  const orderLocked = currentTurnIndex !== null;

  async function handleRollInitiative(p: CombatParticipantDto) {
    const physics = await rollPhysics({
      formula: `1d20${p.initiativeBonus >= 0 ? "+" : ""}${p.initiativeBonus}`,
      label: `Iniciativa — ${p.displayName}`,
      characterName: p.displayName,
      themeColor: diceThemeColor,
    });
    rollInitiative.mutate(
      { participantId: p.id, rolls: physics?.rolls },
      { onError: (err) => toast.error(toErrorMessage(err, "No se pudo tirar iniciativa.")) },
    );
  }

  function handleLockOrder() {
    lockOrder.mutate(undefined, {
      onError: (err) => toast.error(toErrorMessage(err, "No se pudo fijar el orden.")),
    });
  }

  function handleNextTurn() {
    nextTurn.mutate(undefined, {
      onError: (err) => toast.error(toErrorMessage(err, "No se pudo avanzar el turno.")),
    });
  }

  function handleEndCombat() {
    endCombat.mutate(undefined, {
      onError: (err) => toast.error(toErrorMessage(err, "No se pudo terminar el combate.")),
    });
  }

  return (
    <div className="mb-3 border-b border-rule pb-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="font-display text-xs tracking-wide text-oxblood">
          ⚔ Combate {orderLocked ? `— Ronda ${round}` : "— tirando iniciativa"}
        </h3>
        {isMaster && (
          <div className="flex flex-wrap gap-1.5">
            {!orderLocked && (
              <Button
                variant="ghost"
                className="!px-2 !py-1 !text-xs !normal-case !tracking-normal"
                onClick={handleLockOrder}
                disabled={!allRolled}
                isLoading={lockOrder.isPending}
                loadingText="..."
              >
                Fijar orden
              </Button>
            )}
            {orderLocked && (
              <Button
                variant="ghost"
                className="!px-2 !py-1 !text-xs !normal-case !tracking-normal"
                onClick={handleNextTurn}
                isLoading={nextTurn.isPending}
                loadingText="..."
              >
                Siguiente turno
              </Button>
            )}
            <Button
              variant="danger"
              className="!px-2 !py-1 !text-xs !normal-case !tracking-normal"
              onClick={handleEndCombat}
              isLoading={endCombat.isPending}
              loadingText="..."
            >
              Terminar
            </Button>
          </div>
        )}
      </div>

      <ul className="space-y-1.5">
        {participants.map((p, index) => {
          const isCurrentTurn = orderLocked && currentTurnIndex === index;
          const canRoll =
            p.initiativeTotal === null && (isMaster || (p.ownerId && p.ownerId === currentUserId));
          const canControl = isMaster || (!!p.ownerId && p.ownerId === currentUserId);
          return (
            <li
              key={p.id}
              className={`rounded-sm border px-2 py-1.5 ${
                isCurrentTurn
                  ? "border-oxblood bg-oxblood/[0.08]"
                  : "border-rule bg-parchment-panel"
              }`}
            >
              <div className="flex items-center gap-2">
                <PortraitCircle url={p.portraitUrl} name={p.displayName} size={24} />
                <span className="min-w-0 flex-1 truncate text-sm text-ink">{p.displayName}</span>
                {p.initiativeTotal !== null ? (
                  <span className="font-display text-sm font-semibold text-oxblood">
                    {p.initiativeTotal}
                  </span>
                ) : canRoll ? (
                  <Button
                    variant="ghost"
                    className="!px-2 !py-1 !text-xs !normal-case !tracking-normal"
                    onClick={() => handleRollInitiative(p)}
                    isLoading={rollInitiative.isPending}
                    loadingText="..."
                  >
                    🎲 Iniciativa
                  </Button>
                ) : (
                  <span className="text-xs text-ink-muted">esperando</span>
                )}
              </div>
              {(orderLocked || p.effects.length > 0) && (
                <EffectBadges groupId={groupId} participant={p} canControl={canControl} />
              )}
            </li>
          );
        })}
      </ul>

      {orderLocked && (
        <CurrentTurnActions
          groupId={groupId}
          participant={participants[currentTurnIndex] ?? null}
          isMaster={isMaster}
          currentUserId={currentUserId}
          diceThemeColor={diceThemeColor}
        />
      )}
    </div>
  );
}

const EFFECT_UNIT_TO_ROUNDS: Record<"rounds" | "minutes" | "hours", number> = {
  rounds: 1,
  minutes: 10, // 1 ronda = 6s en 5e → 1 minuto = 10 rondas.
  hours: 600,
};

/**
 * Buffs/debuffs temporales aplicados a mano a un combatiente (Bendecido,
 * Hechizado...), contados en rondas de combate reales — se descuentan solos
 * en el servidor cada vez que se completa una ronda (ver
 * `combatService.tickEffectsForNewRound`), así que aquí solo hace falta
 * pintar lo que ya viene del polling, sin countdown en el cliente.
 */
function EffectBadges({
  groupId,
  participant,
  canControl,
}: {
  groupId: string;
  participant: CombatParticipantDto;
  canControl: boolean;
}) {
  const applyEffect = useApplyEffect(groupId);
  const removeEffect = useRemoveEffect(groupId);
  const toast = useToast();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState(1);
  const [unit, setUnit] = useState<"rounds" | "minutes" | "hours">("rounds");

  function handleApply() {
    const trimmed = name.trim();
    if (!trimmed) return;
    applyEffect.mutate(
      {
        participantId: participant.id,
        input: { name: trimmed, roundsRemaining: amount * EFFECT_UNIT_TO_ROUNDS[unit] },
      },
      {
        onSuccess: () => {
          setName("");
          setAmount(1);
          setUnit("rounds");
          setAdding(false);
        },
        onError: (err) => toast.error(toErrorMessage(err, "No se pudo aplicar el efecto.")),
      },
    );
  }

  function handleRemove(effectId: string) {
    removeEffect.mutate(
      { participantId: participant.id, effectId },
      { onError: (err) => toast.error(toErrorMessage(err, "No se pudo quitar el efecto.")) },
    );
  }

  if (!canControl && participant.effects.length === 0) return null;

  return (
    <div className="mt-1 flex flex-wrap items-center gap-1">
      {participant.effects.map((effect) => (
        <span
          key={effect.id}
          className="inline-flex items-center gap-1 rounded-full border border-rule-strong bg-parchment px-1.5 py-0.5 text-[0.65rem] text-ink"
        >
          {effect.name} · {effect.roundsRemaining}
          {canControl && (
            <button
              type="button"
              onClick={() => handleRemove(effect.id)}
              className="text-ink-muted hover:text-oxblood"
              aria-label={`Quitar ${effect.name}`}
            >
              <XIcon size={11} />
            </button>
          )}
        </span>
      ))}
      {canControl &&
        (adding ? (
          <span className="inline-flex items-center gap-1">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Efecto"
              className="w-20 rounded-sm border border-rule-strong bg-parchment px-1 py-0.5 text-[0.65rem] text-ink outline-none focus:border-oxblood"
            />
            <input
              type="number"
              min={1}
              value={amount}
              onChange={(e) => setAmount(Math.max(1, Number(e.target.value) || 1))}
              className="w-10 rounded-sm border border-rule-strong bg-parchment px-1 py-0.5 text-[0.65rem] text-ink outline-none focus:border-oxblood"
            />
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value as "rounds" | "minutes" | "hours")}
              className="rounded-sm border border-rule-strong bg-parchment px-1 py-0.5 text-[0.65rem] text-ink outline-none focus:border-oxblood"
            >
              <option value="rounds">rondas</option>
              <option value="minutes">min</option>
              <option value="hours">horas</option>
            </select>
            <button
              type="button"
              onClick={handleApply}
              disabled={applyEffect.isPending}
              className="text-[0.65rem] text-oxblood hover:underline"
            >
              Aplicar
            </button>
            <button
              type="button"
              onClick={() => setAdding(false)}
              className="text-[0.65rem] text-ink-muted hover:underline"
            >
              Cancelar
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="text-[0.65rem] text-ink-muted hover:text-oxblood"
          >
            + efecto
          </button>
        ))}
    </div>
  );
}

/**
 * Fusiona los bonos de todos los efectos activos de un combatiente en el
 * formato que espera `getRollableActions` — cuando hay varios efectos que
 * tocan el mismo campo (p.ej. dos bonos a mwak.damage) se concatenan con
 * "+", no se pisan.
 */
function mergeCombatBonuses(effects: CombatParticipantDto["effects"]): CombatBonuses {
  const byActionType: Partial<Record<ActionTypeKey, { attack?: string; damage?: string }>> = {};
  let spellDc: string | undefined;

  for (const effect of effects) {
    const bonuses = effect.bonuses;
    if (!bonuses) continue;
    (["mwak", "rwak", "msak", "rsak"] as const).forEach((key) => {
      const entry = bonuses[key];
      if (!entry) return;
      const current = byActionType[key] ?? {};
      byActionType[key] = {
        attack:
          current.attack && entry.attack
            ? `${current.attack} + ${entry.attack}`
            : (current.attack ?? entry.attack),
        damage:
          current.damage && entry.damage
            ? `${current.damage} + ${entry.damage}`
            : (current.damage ?? entry.damage),
      };
    });
    if (bonuses.spellDc) {
      spellDc = spellDc ? `${spellDc} + ${bonuses.spellDc}` : bonuses.spellDc;
    }
  }

  return { byActionType, spellDc };
}

function MiniButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-sm border border-rule-strong px-2 py-1 text-left text-xs text-ink hover:border-rule-strong hover:bg-parchment-deep/40"
    >
      {children}
    </button>
  );
}

/**
 * Botones de ataque para el combatiente en turno: enemigos siempre los
 * maneja el Master (ficha rápida → quickAttacks como texto libre; ficha
 * importada → getRollableActions sobre los mismos items/derived de Foundry,
 * igual que un personaje); personajes los tira su dueño o el Master, igual
 * que en CharacterRollMenu.
 */
function CurrentTurnActions({
  groupId,
  participant,
  isMaster,
  currentUserId,
  diceThemeColor,
}: {
  groupId: string;
  participant: CombatParticipantDto | null;
  isMaster: boolean;
  currentUserId: string;
  diceThemeColor: string | null;
}) {
  const canAct =
    !!participant &&
    (isMaster || (participant.kind === "CHARACTER" && participant.ownerId === currentUserId));

  const isEnemyTurn = !!participant && participant.kind === "ENEMY";
  const isCharacterTurn = !!participant && participant.kind === "CHARACTER";
  const enemyQuery = useEnemy(groupId, isEnemyTurn ? (participant!.enemyId ?? "") : "");
  const characterQuery = useCharacter(isCharacterTurn ? (participant!.characterId ?? "") : "");
  const createRoll = useCreateRoll(groupId);
  const applyEffect = useApplyEffect(groupId);
  const { rollPhysics } = useDiceOverlay();
  const toast = useToast();

  if (!participant || !canAct) return null;

  async function handleRoll(label: string, formula: string) {
    const physics = await rollPhysics({
      formula,
      label,
      characterName: participant!.displayName,
      themeColor: diceThemeColor,
    });
    createRoll.mutate(
      { characterId: participant!.characterId, label, formula, rolls: physics?.rolls },
      { onError: (err) => toast.error(toErrorMessage(err, "No se pudo tirar los dados.")) },
    );
  }

  function handleApplyDetectedEffect(effect: DetectedItemEffect) {
    applyEffect.mutate(
      {
        participantId: participant!.id,
        input: {
          name: effect.name,
          roundsRemaining: effect.roundsRemaining,
          bonuses: effect.bonuses,
        },
      },
      {
        onSuccess: () => {
          const warning =
            effect.unrecognizedChangeCount > 0
              ? ` (además cambia ${effect.unrecognizedChangeCount} cosa${effect.unrecognizedChangeCount > 1 ? "s" : ""} más que no se aplica${effect.unrecognizedChangeCount > 1 ? "n" : ""} sola${effect.unrecognizedChangeCount > 1 ? "s" : ""} — revísalo a mano)`
              : "";
          toast.success(`${effect.name} aplicado${warning}`);
        },
        onError: (err) => toast.error(toErrorMessage(err, "No se pudo aplicar el efecto.")),
      },
    );
  }

  // Bonos de los efectos de combate activos de este combatiente (ver
  // `mergeCombatBonuses`) — se suman a los bonos globales de la ficha (A14)
  // solo mientras dure el combate, no tocan la ficha en sí.
  const combatBonuses = mergeCombatBonuses(participant.effects);

  let content: ReactNode;

  if (participant.kind === "ENEMY") {
    const enemy = enemyQuery.data?.access === "FULL" ? enemyQuery.data.enemy : null;
    if (!enemy) {
      content = <p className="text-xs text-ink-muted">Cargando ficha...</p>;
    } else if (enemy.quickAttacks && enemy.quickAttacks.length > 0) {
      content = (
        <ul className="max-h-72 space-y-1.5 overflow-y-auto">
          {enemy.quickAttacks.map((a, i) => (
            <li key={i} className="rounded-sm border border-rule bg-parchment px-2 py-1.5">
              <div className="mb-1 truncate text-xs text-ink">{a.name}</div>
              <div className="flex flex-wrap gap-1.5">
                <EditableRollButton
                  formula={a.attackFormula}
                  onRoll={(formula) => handleRoll(`Ataque: ${a.name}`, formula)}
                  renderButton={(formula, onClick) => (
                    <MiniButton onClick={onClick}>🎲 Atacar ({formula})</MiniButton>
                  )}
                />
                {a.damageFormula && (
                  <EditableRollButton
                    formula={a.damageFormula}
                    onRoll={(formula) => handleRoll(`Daño: ${a.name}`, formula)}
                    renderButton={(formula, onClick) => (
                      <MiniButton onClick={onClick}>🎲 Daño ({formula})</MiniButton>
                    )}
                  />
                )}
              </div>
            </li>
          ))}
        </ul>
      );
    } else if (enemy.items && enemy.derived) {
      content = (
        <CharacterActionsPanel
          character={enemy as unknown as CharacterFull}
          onRoll={handleRoll}
          combatBonuses={combatBonuses}
          onApplyDetectedEffect={handleApplyDetectedEffect}
          canPersistOverrides={false}
          scrollClassName="max-h-72 overflow-y-auto"
        />
      );
    } else {
      content = <p className="text-xs text-ink-muted">Este enemigo no tiene ataques definidos.</p>;
    }
  } else {
    const character = characterQuery.data?.access === "FULL" ? characterQuery.data.character : null;
    if (!character) {
      content = <p className="text-xs text-ink-muted">Cargando ficha...</p>;
    } else {
      content = (
        <CharacterActionsPanel
          character={character}
          onRoll={handleRoll}
          combatBonuses={combatBonuses}
          onApplyDetectedEffect={handleApplyDetectedEffect}
          scrollClassName="max-h-72 overflow-y-auto"
        />
      );
    }
  }

  return (
    <div className="mt-2 rounded-sm border border-oxblood/40 bg-oxblood/[0.05] p-2">
      <p className="mb-1.5 text-xs font-semibold text-oxblood">
        Turno de {participant.displayName}
      </p>
      {content}
    </div>
  );
}
