import { Link, useParams } from "react-router-dom";
import type { DiceRollDto } from "@dnd-manager/shared";
import { useGroupDetail } from "../features/groups/hooks";
import { useGroupRolls } from "../features/dice/hooks";
import { EmptyState } from "../components/ui/EmptyState";
import { ChapterHeading } from "../components/ui/ChapterHeading";
import { SkeletonPage } from "../components/ui/Skeleton";

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function GroupDiceLogPage() {
  const { id: groupId } = useParams<{ id: string }>();
  const { data: group, isLoading: isLoadingGroup } = useGroupDetail(groupId!);
  const { data: rolls, isLoading: isLoadingRolls } = useGroupRolls(groupId!, { poll: true });

  if (isLoadingGroup || isLoadingRolls || !group) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-10">
        <SkeletonPage rows={4} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <ChapterHeading
        action={
          <Link
            to={`/groups/${groupId}`}
            className="rounded-sm border border-rule px-3 py-1.5 text-ink transition-colors hover:border-oxblood hover:bg-oxblood hover:text-parchment"
          >
            Volver al grupo
          </Link>
        }
      >
        Tiradas — {group.name}
      </ChapterHeading>

      {!rolls || rolls.length === 0 ? (
        <EmptyState
          title="Todavía no se ha tirado ningún dado en este grupo."
          description="Las tiradas de salvación y de ataque/daño desde la ficha de personaje aparecerán aquí."
        />
      ) : (
        <ul className="space-y-2">
          {rolls.map((roll) => (
            <RollRow key={roll.id} roll={roll} />
          ))}
        </ul>
      )}
    </div>
  );
}

function RollRow({ roll }: { roll: DiceRollDto }) {
  const breakdown = roll.rolls
    .map((group) => `${group.die} [${group.values.join(", ")}]`)
    .join(" ");
  return (
    <li className="rounded-sm border border-rule bg-parchment-panel p-3">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm text-ink">
          <span className="font-semibold text-oxblood">{roll.characterName ?? roll.username}</span>
          {" — "}
          {roll.label}
        </span>
        <span className="whitespace-nowrap text-xs text-ink-muted">
          {formatTime(roll.createdAt)}
        </span>
      </div>
      <div className="mt-1 flex items-baseline justify-between gap-3">
        <span className="text-xs text-ink-muted">
          {roll.formula}
          {breakdown && ` · ${breakdown}`}
        </span>
        <span
          className="font-display text-lg font-semibold text-oxblood"
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {roll.total}
        </span>
      </div>
    </li>
  );
}
