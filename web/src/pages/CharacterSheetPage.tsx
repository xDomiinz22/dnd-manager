// Esta página trabaja con el objeto `system`/`items` crudo del export de Foundry,
// que no tiene tipos: usamos `any` deliberadamente al indexar esos datos.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { useParams } from "react-router-dom";
import type { AbilityKey, CharacterFull } from "@dnd-manager/shared";
import { useCharacter } from "../features/characters/hooks";
import { PortraitCircle } from "../components/character/PortraitCircle";
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
    return <div className="mx-auto max-w-4xl px-6 py-10 text-slate-400">Cargando ficha...</div>;
  }
  if (isError) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-10 text-red-400">{(error as Error).message}</div>
    );
  }
  if (!data) return null;

  if (data.access === "LIMITED") {
    return (
      <div className="mx-auto max-w-sm px-6 py-16 text-center">
        <div className="flex justify-center">
          <PortraitCircle url={data.character.portraitUrl} name={data.character.name} size={128} />
        </div>
        <h1 className="mt-4 text-xl font-semibold text-slate-100">{data.character.name}</h1>
        <p className="mt-2 text-sm text-slate-500">
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
  const hpCurrent = attributes.hp?.value ?? hpMax;
  const speed = attributes.movement?.walk
    ? `${attributes.movement.walk} ${attributes.movement.units ?? "ft"}`
    : "—";

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      {/* Cabecera hero */}
      <div className="mb-6 flex flex-col items-center gap-4 rounded-lg border border-slate-800 bg-slate-900 p-6 sm:flex-row sm:items-start">
        <PortraitCircle url={character.portraitUrl} name={character.name} size={112} />
        <div className="flex-1 text-center sm:text-left">
          <h1 className="text-2xl font-semibold text-amber-400">{character.name}</h1>
          <p className="text-slate-300">
            {character.className ?? "Sin clase"} {character.level}
            {character.subclassName ? ` · ${character.subclassName}` : ""}
          </p>
          <p className="text-sm text-slate-500">{character.species ?? "Especie desconocida"}</p>

          <div className="mt-4 grid grid-cols-3 gap-3 text-center sm:grid-cols-6">
            <Stat label="Nivel" value={String(character.level)} />
            <Stat label="CA" value={ac != null ? String(ac) : "—"} />
            <Stat label="PG" value={`${hpCurrent}/${hpMax}`} />
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
            className="rounded-lg border border-slate-800 bg-slate-900 py-3 text-center"
            title={ABILITY_FULL_LABELS[key]}
          >
            <div className="text-xs font-medium text-slate-500">{ABILITY_LABELS[key]}</div>
            <div className="text-lg font-semibold text-slate-100">
              {abilities[key]?.value ?? "—"}
            </div>
            <div className="text-sm text-amber-400">
              {formatModifier(character.derived.abilityModifiers[key])}
            </div>
          </div>
        ))}
      </div>

      {/* Pestañas */}
      <div className="mb-4 flex flex-wrap gap-2 border-b border-slate-800">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-3 py-2 text-sm ${
              tab === t
                ? "border-b-2 border-amber-400 text-amber-400"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Details" && <DetailsTab character={character} system={system} />}
      {tab === "Skills & Tools" && <SkillsTab character={character} />}
      {tab === "Inventory" && <InventoryTab items={character.items} />}
      {tab === "Features" && <FeaturesTab items={character.items} />}
      {tab === "Spellbook" && <SpellbookTab items={character.items} />}
      {tab === "Biography" && <BiographyTab details={details} />}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="font-semibold text-slate-100">{value}</div>
    </div>
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
      <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-300">Tiradas de salvación</h2>
        <ul className="space-y-1 text-sm">
          {ABILITY_KEYS.map((key) => (
            <li key={key} className="flex justify-between text-slate-300">
              <span>{ABILITY_FULL_LABELS[key]}</span>
              <span className="text-amber-400">
                {formatModifier(character.derived.savingThrows[key])}
              </span>
            </li>
          ))}
        </ul>
      </div>
      <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-300">General</h2>
        <dl className="space-y-1 text-sm text-slate-300">
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
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right">{value}</dd>
    </div>
  );
}

function SkillsTab({ character }: { character: CharacterFull }) {
  const entries = Object.entries(character.derived.skills);
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-800 text-left text-slate-500">
            <th className="px-4 py-2 font-medium">Habilidad</th>
            <th className="px-4 py-2 font-medium">Car.</th>
            <th className="px-4 py-2 font-medium">Bono</th>
            <th className="px-4 py-2 font-medium">Pasiva</th>
          </tr>
        </thead>
        <tbody>
          {entries.map(([code, skill]) => (
            <tr key={code} className="border-b border-slate-800/60 last:border-0">
              <td className="px-4 py-2 text-slate-100">{SKILL_LABELS[code] ?? code}</td>
              <td className="px-4 py-2 text-slate-500">{ABILITY_LABELS[skill.ability]}</td>
              <td className="px-4 py-2 text-amber-400">{formatModifier(skill.bonus)}</td>
              <td className="px-4 py-2 text-slate-300">{skill.passive}</td>
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
    return <p className="text-slate-500">Sin objetos.</p>;
  }
  return (
    <ul className="space-y-2">
      {inventory.map((item) => (
        <li key={item._id} className="rounded-lg border border-slate-800 bg-slate-900 p-4">
          <div className="flex items-center justify-between">
            <span className="font-medium text-slate-100">{item.name}</span>
            {item.system?.quantity != null && (
              <span className="text-sm text-slate-500">x{item.system.quantity}</span>
            )}
          </div>
          {item.system?.description?.value && (
            <details className="mt-2 text-sm text-slate-400">
              <summary className="cursor-pointer text-slate-500">Descripción</summary>
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
    return <p className="text-slate-500">Sin rasgos.</p>;
  }
  return (
    <ul className="space-y-2">
      {features.map((item) => (
        <li key={item._id} className="rounded-lg border border-slate-800 bg-slate-900 p-4">
          <div className="font-medium text-slate-100">{item.name}</div>
          {item.system?.description?.value && (
            <details className="mt-2 text-sm text-slate-400">
              <summary className="cursor-pointer text-slate-500">Descripción</summary>
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

function SpellbookTab({ items }: { items: unknown }) {
  const spells = itemsOfType(items, ["spell"]);
  if (spells.length === 0) {
    return <p className="text-slate-500">Sin conjuros.</p>;
  }

  const byLevel = new Map<number, typeof spells>();
  for (const spell of spells) {
    const level = Number(spell.system?.level) || 0;
    byLevel.set(level, [...(byLevel.get(level) ?? []), spell]);
  }
  const levels = [...byLevel.keys()].sort((a, b) => a - b);

  return (
    <div className="space-y-4">
      {levels.map((level) => (
        <div key={level}>
          <h3 className="mb-2 text-sm font-semibold text-slate-400">
            {level === 0 ? "Trucos" : `Nivel ${level}`}
          </h3>
          <ul className="space-y-2">
            {byLevel.get(level)!.map((spell) => (
              <li key={spell._id} className="rounded-lg border border-slate-800 bg-slate-900 p-4">
                <div className="font-medium text-slate-100">{spell.name}</div>
                {spell.system?.description?.value && (
                  <details className="mt-2 text-sm text-slate-400">
                    <summary className="cursor-pointer text-slate-500">Descripción</summary>
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

function BiographyTab({ details }: { details: Record<string, any> }) {
  const bio = details.biography?.value;
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
      {bio ? (
        <div className="prose-sm" dangerouslySetInnerHTML={{ __html: sanitizeHtml(bio) }} />
      ) : (
        <p className="text-slate-500">Sin biografía.</p>
      )}
    </div>
  );
}
