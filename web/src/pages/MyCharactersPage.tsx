import { useState } from "react";
import { Link } from "react-router-dom";
import { useGroups } from "../features/groups/hooks";
import { useDuplicateCharacter, useMyCharacters } from "../features/characters/hooks";
import { PortraitCircle } from "../components/character/PortraitCircle";

export function MyCharactersPage() {
  const { data: characters, isLoading } = useMyCharacters();
  const { data: groups } = useGroups();
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="mb-6 text-2xl font-semibold text-amber-400">Mis personajes</h1>

      {isLoading && <p className="text-slate-400">Cargando...</p>}
      {!isLoading && characters?.length === 0 && (
        <p className="text-slate-400">
          Todavía no tienes personajes. Pídele al Master de tu grupo que importe uno.
        </p>
      )}

      <ul className="space-y-3">
        {characters?.map((c) => (
          <li key={c.id} className="rounded-lg border border-slate-800 bg-slate-900 p-4">
            <div className="flex items-center gap-4">
              <PortraitCircle url={c.portraitUrl} name={c.name} size={56} />
              <div className="flex-1">
                <Link
                  to={`/characters/${c.id}`}
                  className="font-medium text-slate-100 hover:text-amber-400"
                >
                  {c.name}
                </Link>
                <p className="text-sm text-slate-500">
                  {c.className ?? "Sin clase"} {c.level} · {c.groupName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDuplicatingId(duplicatingId === c.id ? null : c.id)}
                className="text-sm text-slate-300 hover:text-amber-400"
              >
                Añadir a otro grupo
              </button>
            </div>

            {duplicatingId === c.id && (
              <DuplicateForm
                characterId={c.id}
                currentGroupId={c.groupId}
                groups={groups ?? []}
                onDone={() => setDuplicatingId(null)}
              />
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

interface DuplicateFormProps {
  characterId: string;
  currentGroupId: string;
  groups: { id: string; name: string }[];
  onDone: () => void;
}

function DuplicateForm({ characterId, currentGroupId, groups, onDone }: DuplicateFormProps) {
  const otherGroups = groups.filter((g) => g.id !== currentGroupId);
  const [targetGroupId, setTargetGroupId] = useState(otherGroups[0]?.id ?? "");
  const duplicate = useDuplicateCharacter(characterId);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!targetGroupId) return;
    duplicate.mutate({ targetGroupId }, { onSuccess: onDone });
  }

  if (otherGroups.length === 0) {
    return <p className="mt-3 text-sm text-slate-500">No perteneces a ningún otro grupo.</p>;
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-3 flex items-center gap-2 border-t border-slate-800 pt-3"
    >
      <select
        value={targetGroupId}
        onChange={(e) => setTargetGroupId(e.target.value)}
        className="flex-1 rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100"
      >
        {otherGroups.map((g) => (
          <option key={g.id} value={g.id}>
            {g.name}
          </option>
        ))}
      </select>
      <button
        type="submit"
        disabled={duplicate.isPending}
        className="rounded bg-amber-400 px-3 py-2 text-sm font-medium text-slate-950 disabled:opacity-50"
      >
        {duplicate.isPending ? "Duplicando..." : "Duplicar"}
      </button>
      {duplicate.isError && (
        <p className="text-sm text-red-400">{(duplicate.error as Error).message}</p>
      )}
    </form>
  );
}
