// Esta página trabaja con el objeto `system`/`items` crudo del export de Foundry,
// que no tiene tipos: usamos `any` deliberadamente al indexar esos datos.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  SPELL_SLOT_LEVELS,
  updateHpSchema,
  type AbilityKey,
  type CharacterFull,
  type SpellSlotLevel,
  type SpellSlots,
  type UpdateHpInput,
} from "@dnd-manager/shared";
import { useCharacter, useUpdateHp, useUpdateSpellSlot } from "../features/characters/hooks";
import { PortraitCircle } from "../components/character/PortraitCircle";
import { CharacterImageManager } from "../components/character/CharacterImageManager";
import { SkeletonPage } from "../components/ui/Skeleton";
import { toErrorMessage, useToast } from "../components/ui/Toast";
import {
  ABILITY_FULL_LABELS,
  ABILITY_LABELS,
  SKILL_LABELS,
  formatModifier,
  itemsOfType,
  sanitizeHtml,
} from "../features/characters/foundryDisplay";

const ABILITY_KEYS: AbilityKey[] = ["str", "dex", "con", "int", "wis", "cha"];
const TABS = [
  "Details",
  "Skills & Tools",
  "Inventory",
  "Features",
  "Spellbook",
  "Biography",
] as const;
type Tab = (typeof TABS)[number];

export function CharacterSheetPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, isError, error } = useCharacter(id!);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-10">
        <SkeletonPage rows={4} />
      </div>
    );
  }
  if (isError) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-10 text-oxblood-dark">
        {(error as Error).message}
      </div>
    );
  }
  if (!data) return null;

  if (data.access === "LIMITED") {
    return (
      <div className="mx-auto max-w-sm px-6 py-16 text-center">
        <div className="flex justify-center">
          <PortraitCircle url={data.character.portraitUrl} name={data.character.name} size={128} />
        </div>
        <h1 className="mt-4 font-display text-xl tracking-wide text-oxblood">
          {data.character.name}
        </h1>
        <p className="mt-2 text-sm text-ink-muted">
          Solo puedes ver el nombre y la foto de este personaje.
        </p>
      </div>
    );
  }

  return <FullCharacterSheet character={data.character} />;
}

function FullCharacterSheet({ character }: { character: CharacterFull }) {
  const [tab, setTab] = useState<Tab>("Details");
  const system = (character.rawSystem ?? {}) as Record<string, any>;
  const details = system.details ?? {};
  const attributes = system.attributes ?? {};
  const abilities = system.abilities ?? {};

  const ac = character.derived.armorClass.override ?? character.derived.armorClass.computed;
  const hpMax = character.derived.hitPoints.override ?? character.derived.hitPoints.max;
  const speed = attributes.movement?.walk
    ? `${attributes.movement.walk} ${attributes.movement.units ?? "ft"}`
    : "—";

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      {/* Cabecera hero */}
      <div className="mb-6 flex flex-col items-center gap-4 rounded-sm border border-rule bg-parchment-panel p-6 shadow-[inset_0_0_28px_-6px_rgba(107,22,32,0.22)] sm:flex-row sm:items-start">
        <div className="flex flex-col items-center">
          <PortraitCircle url={character.portraitUrl} name={character.name} size={112} />
          <CharacterImageManager
            characterId={character.id}
            portraitAssetId={character.portraitAssetId}
          />
        </div>
        <div className="flex-1 text-center sm:text-left">
          <h1 className="font-display text-2xl tracking-wide text-oxblood">{character.name}</h1>
          <p className="text-ink">
            {character.className ?? "Sin clase"} {character.level}
            {character.subclassName ? ` · ${character.subclassName}` : ""}
          </p>
          <p className="text-sm text-ink-muted">{character.species ?? "Especie desconocida"}</p>
          <Link
            to={`/characters/${character.id}/journal`}
            className="mt-1 inline-block text-sm text-oxblood hover:underline"
          >
            Diario personal →
          </Link>

          <div className="mt-4 grid grid-cols-3 gap-3 text-center sm:grid-cols-6">
            <Stat label="Nivel" value={String(character.level)} />
            <Stat label="CA" value={ac != null ? String(ac) : "—"} />
            <HpStat characterId={character.id} current={character.currentHp} max={hpMax} />
            <Stat label="Velocidad" value={speed} />
            <Stat label="Bono" value={formatModifier(character.derived.proficiencyBonus)} />
            <Stat label="Perc. pasiva" value={String(character.derived.passivePerception)} />
          </div>
        </div>
      </div>

      {/* Chips de característica */}
      <div className="mb-6 grid grid-cols-3 gap-3 sm:grid-cols-6">
        {ABILITY_KEYS.map((key) => (
          <div
            key={key}
            className="rounded-sm border border-rule bg-parchment-panel py-3 text-center"
            title={ABILITY_FULL_LABELS[key]}
          >
            <div className="font-display text-xs tracking-wide text-ink-muted">
              {ABILITY_LABELS[key]}
            </div>
            <div className="text-lg font-semibold text-ink">{abilities[key]?.value ?? "—"}</div>
            <div className="text-sm text-oxblood">
              {formatModifier(character.derived.abilityModifiers[key])}
            </div>
          </div>
        ))}
      </div>

      {/* Pestañas */}
      <div role="tablist" className="mb-4 flex flex-wrap gap-2 border-b-2 border-rule">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            id={`tab-${t}`}
            aria-selected={tab === t}
            aria-controls={`tabpanel-${t}`}
            onClick={() => setTab(t)}
            className={`px-3 py-2 font-display text-sm tracking-wide focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-oxblood ${
              tab === t
                ? "border-b-2 border-oxblood text-oxblood"
                : "text-ink-muted hover:text-oxblood"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`tabpanel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === "Details" && <DetailsTab character={character} system={system} />}
        {tab === "Skills & Tools" && <SkillsTab character={character} />}
        {tab === "Inventory" && <InventoryTab items={character.items} />}
        {tab === "Features" && <FeaturesTab items={character.items} />}
        {tab === "Spellbook" && (
          <SpellbookTab
            characterId={character.id}
            spellSlots={character.spellSlots}
            items={character.items}
          />
        )}
        {tab === "Biography" && <BiographyTab details={details} />}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-ink-muted">{label}</div>
      <div className="font-semibold text-ink" style={{ fontVariantNumeric: "tabular-nums" }}>
        {value}
      </div>
    </div>
  );
}

/** PG editables in situ: click para registrar daño/curación como un nuevo valor absoluto. */
function HpStat({
  characterId,
  current,
  max,
}: {
  characterId: string;
  current: number;
  max: number;
}) {
  const [editing, setEditing] = useState(false);
  const toast = useToast();
  const updateHp = useUpdateHp(characterId);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UpdateHpInput>({
    resolver: zodResolver(updateHpSchema),
    defaultValues: { currentHp: current },
  });

  function startEditing() {
    reset({ currentHp: current });
    setEditing(true);
  }

  function onSubmit(values: UpdateHpInput) {
    updateHp.mutate(values, {
      onSuccess: () => {
        toast.success("PG actualizados.");
        setEditing(false);
      },
      onError: (err) => toast.error(toErrorMessage(err, "No se pudieron actualizar los PG.")),
    });
  }

  if (editing) {
    return (
      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="flex flex-col items-center gap-1"
      >
        <div className="text-xs uppercase tracking-wide text-ink-muted">PG</div>
        <div className="flex items-center gap-1">
          <input
            type="number"
            min={0}
            autoFocus
            aria-label="Puntos de golpe actuales"
            aria-invalid={!!errors.currentHp}
            className="w-14 rounded-sm border border-rule-strong bg-parchment px-1 py-0.5 text-center text-sm text-ink outline-none focus:border-oxblood"
            {...register("currentHp", { valueAsNumber: true })}
          />
          <span className="text-sm text-ink-muted">/{max}</span>
        </div>
        {errors.currentHp && (
          <p className="text-xs text-oxblood-dark">{errors.currentHp.message}</p>
        )}
        <div className="flex gap-2 text-xs">
          <button
            type="submit"
            disabled={updateHp.isPending}
            className="font-semibold text-oxblood hover:underline disabled:opacity-50"
          >
            {updateHp.isPending ? "..." : "Guardar"}
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="text-ink-muted hover:text-ink"
          >
            Cancelar
          </button>
        </div>
      </form>
    );
  }

  return (
    <button
      type="button"
      onClick={startEditing}
      title="Editar PG actuales"
      className="w-full rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-oxblood"
    >
      <div className="text-xs uppercase tracking-wide text-ink-muted">PG</div>
      <div className="font-semibold text-ink" style={{ fontVariantNumeric: "tabular-nums" }}>
        {current}/{max}
      </div>
    </button>
  );
}

function DetailsTab({
  character,
  system,
}: {
  character: CharacterFull;
  system: Record<string, any>;
}) {
  const traits = system.traits ?? {};
  const senses = system.attributes?.senses?.ranges ?? {};
  const languages = [...(traits.languages?.value ?? []), traits.languages?.custom].filter(Boolean);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="rounded-sm border border-rule bg-parchment-panel p-4">
        <h2 className="mb-3 font-display text-sm tracking-wide text-oxblood">
          Tiradas de salvación
        </h2>
        <ul className="space-y-1 text-sm">
          {ABILITY_KEYS.map((key) => (
            <li key={key} className="flex justify-between text-ink">
              <span>{ABILITY_FULL_LABELS[key]}</span>
              <span className="text-oxblood" style={{ fontVariantNumeric: "tabular-nums" }}>
                {formatModifier(character.derived.savingThrows[key])}
              </span>
            </li>
          ))}
        </ul>
      </div>
      <div className="rounded-sm border border-rule bg-parchment-panel p-4">
        <h2 className="mb-3 font-display text-sm tracking-wide text-oxblood">General</h2>
        <dl className="space-y-1 text-sm text-ink">
          <Row label="Trasfondo" value={character.background ?? "—"} />
          <Row label="Alineamiento" value={character.alignment ?? "—"} />
          <Row label="Tamaño" value={traits.size ?? "—"} />
          <Row label="Idiomas" value={languages.length ? languages.join(", ") : "—"} />
          <Row
            label="Sentidos"
            value={
              Object.entries(senses)
                .filter(([, v]) => v)
                .map(([k, v]) => `${k} ${v}`)
                .join(", ") || "—"
            }
          />
        </dl>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="text-right">{value}</dd>
    </div>
  );
}

function SkillsTab({ character }: { character: CharacterFull }) {
  const entries = Object.entries(character.derived.skills);
  return (
    <div className="overflow-x-auto rounded-sm border border-rule bg-parchment-panel">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-rule text-left text-ink-muted">
            <th className="px-4 py-2 font-display font-normal tracking-wide">Habilidad</th>
            <th className="px-4 py-2 font-display font-normal tracking-wide">Car.</th>
            <th className="px-4 py-2 font-display font-normal tracking-wide">Bono</th>
            <th className="px-4 py-2 font-display font-normal tracking-wide">Pasiva</th>
          </tr>
        </thead>
        <tbody>
          {entries.map(([code, skill]) => (
            <tr key={code} className="border-b border-rule/60 last:border-0">
              <td className="px-4 py-2 text-ink">{SKILL_LABELS[code] ?? code}</td>
              <td className="px-4 py-2 text-ink-muted">{ABILITY_LABELS[skill.ability]}</td>
              <td className="px-4 py-2 text-oxblood" style={{ fontVariantNumeric: "tabular-nums" }}>
                {formatModifier(skill.bonus)}
              </td>
              <td className="px-4 py-2 text-ink" style={{ fontVariantNumeric: "tabular-nums" }}>
                {skill.passive}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function InventoryTab({ items }: { items: unknown }) {
  const inventory = itemsOfType(items, ["weapon", "equipment", "consumable", "container", "loot"]);
  if (inventory.length === 0) {
    return <p className="text-ink-muted">Sin objetos.</p>;
  }
  return (
    <ul className="space-y-2">
      {inventory.map((item) => (
        <li key={item._id} className="rounded-sm border border-rule bg-parchment-panel p-4">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-ink">{item.name}</span>
            {item.system?.quantity != null && (
              <span className="text-sm text-ink-muted">x{item.system.quantity}</span>
            )}
          </div>
          {item.system?.description?.value && (
            <details className="mt-2 text-sm text-ink">
              <summary className="cursor-pointer text-ink-muted">Descripción</summary>
              <div
                className="prose-sm mt-2"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.system.description.value) }}
              />
            </details>
          )}
        </li>
      ))}
    </ul>
  );
}

function FeaturesTab({ items }: { items: unknown }) {
  const features = itemsOfType(items, ["feat", "class", "subclass", "race", "background"]);
  if (features.length === 0) {
    return <p className="text-ink-muted">Sin rasgos.</p>;
  }
  return (
    <ul className="space-y-2">
      {features.map((item) => (
        <li key={item._id} className="rounded-sm border border-rule bg-parchment-panel p-4">
          <div className="font-semibold text-ink">{item.name}</div>
          {item.system?.description?.value && (
            <details className="mt-2 text-sm text-ink">
              <summary className="cursor-pointer text-ink-muted">Descripción</summary>
              <div
                className="prose-sm mt-2"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.system.description.value) }}
              />
            </details>
          )}
        </li>
      ))}
    </ul>
  );
}

function SpellbookTab({
  characterId,
  spellSlots,
  items,
}: {
  characterId: string;
  spellSlots: SpellSlots;
  items: unknown;
}) {
  const spells = itemsOfType(items, ["spell"]);

  const byLevel = new Map<number, typeof spells>();
  for (const spell of spells) {
    const level = Number(spell.system?.level) || 0;
    byLevel.set(level, [...(byLevel.get(level) ?? []), spell]);
  }
  const levels = [...byLevel.keys()].sort((a, b) => a - b);

  return (
    <div className="space-y-4">
      <SpellSlotsPanel characterId={characterId} spellSlots={spellSlots} />

      {spells.length === 0 && <p className="text-ink-muted">Sin conjuros.</p>}

      {levels.map((level) => (
        <div key={level}>
          <h3 className="mb-2 font-display text-sm tracking-wide text-oxblood">
            {level === 0 ? "Trucos" : `Nivel ${level}`}
          </h3>
          <ul className="space-y-2">
            {byLevel.get(level)!.map((spell) => (
              <li key={spell._id} className="rounded-sm border border-rule bg-parchment-panel p-4">
                <div className="font-semibold text-ink">{spell.name}</div>
                {spell.system?.description?.value && (
                  <details className="mt-2 text-sm text-ink">
                    <summary className="cursor-pointer text-ink-muted">Descripción</summary>
                    <div
                      className="prose-sm mt-2"
                      dangerouslySetInnerHTML={{
                        __html: sanitizeHtml(spell.system.description.value),
                      }}
                    />
                  </details>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

/**
 * Huecos de conjuro nivel 1-7: el .md de Foundry no trae de forma fiable el
 * máximo real, así que tanto usados como máximo se editan a mano aquí, igual
 * que los PG. Cada input guarda al perder el foco, solo si cambió el valor.
 */
function SpellSlotsPanel({
  characterId,
  spellSlots,
}: {
  characterId: string;
  spellSlots: SpellSlots;
}) {
  const updateSlot = useUpdateSpellSlot(characterId);
  const toast = useToast();

  function handleBlur(level: SpellSlotLevel, field: "used" | "max", raw: string, original: number) {
    const value = Number(raw);
    if (!Number.isInteger(value) || value < 0 || value === original) return;
    updateSlot.mutate(
      { level, [field]: value },
      {
        onError: (err) =>
          toast.error(toErrorMessage(err, "No se pudo actualizar el hueco de conjuro.")),
      },
    );
  }

  return (
    <div>
      <h3 className="mb-2 font-display text-sm tracking-wide text-oxblood">Huecos de conjuro</h3>
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
        {SPELL_SLOT_LEVELS.map((level) => {
          const slot = spellSlots[level];
          return (
            <div
              key={level}
              className="rounded-sm border border-rule bg-parchment-panel p-2 text-center"
            >
              <div className="font-display text-xs tracking-wide text-ink-muted">Nivel {level}</div>
              <div className="mt-1 flex items-center justify-center gap-1">
                <input
                  key={`used-${level}-${slot.used}`}
                  type="number"
                  min={0}
                  defaultValue={slot.used}
                  onBlur={(e) => handleBlur(level, "used", e.target.value, slot.used)}
                  aria-label={`Huecos de nivel ${level} usados`}
                  className="w-10 rounded-sm border border-rule-strong bg-parchment px-1 py-0.5 text-center text-sm text-ink outline-none focus:border-oxblood"
                />
                <span className="text-ink-muted">/</span>
                <input
                  key={`max-${level}-${slot.max}`}
                  type="number"
                  min={0}
                  defaultValue={slot.max}
                  onBlur={(e) => handleBlur(level, "max", e.target.value, slot.max)}
                  aria-label={`Huecos de nivel ${level} máximos`}
                  className="w-10 rounded-sm border border-rule-strong bg-parchment px-1 py-0.5 text-center text-sm text-ink outline-none focus:border-oxblood"
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BiographyTab({ details }: { details: Record<string, any> }) {
  const bio = details.biography?.value;
  return (
    <div className="rounded-sm border border-rule bg-parchment-panel p-4">
      {bio ? (
        <div className="prose-sm" dangerouslySetInnerHTML={{ __html: sanitizeHtml(bio) }} />
      ) : (
        <p className="text-ink-muted">Sin biografía.</p>
      )}
    </div>
  );
}
