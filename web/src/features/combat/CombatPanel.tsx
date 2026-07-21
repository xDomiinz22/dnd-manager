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
import { getRollableActions, type RollableAction } from "../characters/rollableActions";
import {
  useCombatEncounter,
  useEndCombat,
  useLockOrder,
  useNextTurn,
  useRollInitiative,
  useStartCombat,
} from "./hooks";
import { PortraitCircle } from "../../components/character/PortraitCircle";
import { Button } from "../../components/ui/Button";
import { toErrorMessage, useToast } from "../../components/ui/Toast";

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
          return (
            <li
              key={p.id}
              className={`flex items-center gap-2 rounded-sm border px-2 py-1.5 ${
                isCurrentTurn
                  ? "border-oxblood bg-oxblood/[0.08]"
                  : "border-rule bg-parchment-panel"
              }`}
            >
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

function ActionButtons({
  actions,
  onRoll,
}: {
  actions: RollableAction[];
  onRoll: (label: string, formula: string) => void;
}) {
  if (actions.length === 0) return <p className="text-xs text-ink-muted">Sin ataques.</p>;
  return (
    <ul className="space-y-1.5">
      {actions.map((action, index) => {
        const label = action.activityName
          ? `${action.itemName} (${action.activityName})`
          : action.itemName;
        return (
          <li
            key={`${action.itemId}-${action.activityId}-${index}`}
            className="rounded-sm border border-rule bg-parchment px-2 py-1.5"
          >
            <div className="mb-1 truncate text-xs text-ink">{label}</div>
            <div className="flex flex-wrap gap-1.5">
              {action.attackFormula && (
                <MiniButton onClick={() => onRoll(`Ataque: ${label}`, action.attackFormula!)}>
                  🎲 Atacar ({action.attackFormula})
                </MiniButton>
              )}
              {action.damageFormula && (
                <MiniButton onClick={() => onRoll(`Daño: ${label}`, action.damageFormula!)}>
                  🎲 Daño ({action.damageFormula})
                </MiniButton>
              )}
            </div>
          </li>
        );
      })}
    </ul>
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

  let content: ReactNode;

  if (participant.kind === "ENEMY") {
    const enemy = enemyQuery.data?.access === "FULL" ? enemyQuery.data.enemy : null;
    if (!enemy) {
      content = <p className="text-xs text-ink-muted">Cargando ficha...</p>;
    } else if (enemy.quickAttacks && enemy.quickAttacks.length > 0) {
      content = (
        <ul className="space-y-1.5">
          {enemy.quickAttacks.map((a, i) => (
            <li key={i} className="rounded-sm border border-rule bg-parchment px-2 py-1.5">
              <div className="mb-1 truncate text-xs text-ink">{a.name}</div>
              <div className="flex flex-wrap gap-1.5">
                <MiniButton onClick={() => handleRoll(`Ataque: ${a.name}`, a.attackFormula)}>
                  🎲 Atacar ({a.attackFormula})
                </MiniButton>
                {a.damageFormula && (
                  <MiniButton onClick={() => handleRoll(`Daño: ${a.name}`, a.damageFormula!)}>
                    🎲 Daño ({a.damageFormula})
                  </MiniButton>
                )}
              </div>
            </li>
          ))}
        </ul>
      );
    } else if (enemy.items && enemy.derived) {
      const actions = getRollableActions(enemy.items, enemy as unknown as CharacterFull);
      content = <ActionButtons actions={actions} onRoll={handleRoll} />;
    } else {
      content = <p className="text-xs text-ink-muted">Este enemigo no tiene ataques definidos.</p>;
    }
  } else {
    const character = characterQuery.data?.access === "FULL" ? characterQuery.data.character : null;
    if (!character) {
      content = <p className="text-xs text-ink-muted">Cargando ficha...</p>;
    } else {
      const actions = getRollableActions(character.items, character);
      content = <ActionButtons actions={actions} onRoll={handleRoll} />;
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
