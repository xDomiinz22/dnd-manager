import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { duplicateCharacterSchema, type DuplicateCharacterInput } from "@dnd-manager/shared";
import { useGroups } from "../features/groups/hooks";
import { useDuplicateCharacter, useMyCharacters } from "../features/characters/hooks";
import { PortraitCircle } from "../components/character/PortraitCircle";
import { Button } from "../components/ui/Button";
import { SelectField } from "../components/ui/SelectField";
import { EmptyState } from "../components/ui/EmptyState";
import { ChapterHeading } from "../components/ui/ChapterHeading";
import { SkeletonPage } from "../components/ui/Skeleton";
import { toErrorMessage, useToast } from "../components/ui/Toast";

export function MyCharactersPage() {
  const { data: characters, isLoading } = useMyCharacters();
  const { data: groups } = useGroups();
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <ChapterHeading>Mis personajes</ChapterHeading>

      {isLoading && <SkeletonPage />}

      {!isLoading && characters?.length === 0 && (
        <EmptyState
          title="Todavía no tienes personajes."
          description="Pídele al Master de tu grupo que importe uno."
        />
      )}

      <ul className="space-y-3">
        {characters?.map((c) => (
          <li key={c.id} className="rounded-sm border border-rule bg-parchment-panel p-4">
            <div className="flex flex-wrap items-center gap-4">
              <PortraitCircle url={c.portraitUrl} name={c.name} size={56} />
              <div className="min-w-0 flex-1">
                <Link
                  to={`/characters/${c.id}`}
                  className="block truncate font-semibold text-ink hover:underline"
                >
                  {c.name}
                </Link>
                <p className="truncate text-sm text-ink-muted">
                  {c.classes.length > 0
                    ? c.classes.map((cl) => `${cl.name} ${cl.level}`).join(" / ")
                    : `${c.className ?? "Sin clase"} ${c.level}`}{" "}
                  · {c.groupName}
                </p>
              </div>
              <Button
                variant="ghost"
                className="w-full sm:w-auto"
                onClick={() => setDuplicatingId(duplicatingId === c.id ? null : c.id)}
              >
                Añadir a otro grupo
              </Button>
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
  const duplicate = useDuplicateCharacter(characterId);
  const toast = useToast();
  const { register, handleSubmit } = useForm<DuplicateCharacterInput>({
    resolver: zodResolver(duplicateCharacterSchema),
    defaultValues: { targetGroupId: otherGroups[0]?.id ?? "" },
  });

  if (otherGroups.length === 0) {
    return <p className="mt-3 text-sm text-ink-muted">No perteneces a ningún otro grupo.</p>;
  }

  function onSubmit(values: DuplicateCharacterInput) {
    duplicate.mutate(values, {
      onSuccess: () => {
        toast.success("Personaje añadido al otro grupo.");
        onDone();
      },
      onError: (err) => toast.error(toErrorMessage(err, "No se pudo duplicar el personaje.")),
    });
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="mt-3 flex items-center gap-2 border-t border-rule pt-3"
    >
      <SelectField
        label="Grupo destino"
        hideLabel
        wrapperClassName="mb-0 flex-1"
        {...register("targetGroupId")}
      >
        {otherGroups.map((g) => (
          <option key={g.id} value={g.id}>
            {g.name}
          </option>
        ))}
      </SelectField>
      <Button type="submit" isLoading={duplicate.isPending} loadingText="Duplicando...">
        Duplicar
      </Button>
    </form>
  );
}
