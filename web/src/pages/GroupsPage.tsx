import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createGroupSchema,
  joinGroupSchema,
  type CreateGroupInput,
  type JoinGroupInput,
} from "@dnd-manager/shared";
import { useCreateGroup, useGroups, useJoinGroup } from "../features/groups/hooks";
import { Card } from "../components/ui/Card";
import { TextField } from "../components/ui/TextField";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { ChapterHeading } from "../components/ui/ChapterHeading";
import { SkeletonPage } from "../components/ui/Skeleton";
import { toErrorMessage, useToast } from "../components/ui/Toast";

export function GroupsPage() {
  const { data: groups, isLoading } = useGroups();
  const createGroup = useCreateGroup();
  const joinGroup = useJoinGroup();
  const toast = useToast();

  const createForm = useForm<CreateGroupInput>({ resolver: zodResolver(createGroupSchema) });
  const joinForm = useForm<JoinGroupInput>({ resolver: zodResolver(joinGroupSchema) });

  function handleCreate(values: CreateGroupInput) {
    createGroup.mutate(values, {
      onSuccess: () => {
        createForm.reset();
        toast.success(`Grupo "${values.name}" creado.`);
      },
      onError: (err) => toast.error(toErrorMessage(err, "No se pudo crear el grupo.")),
    });
  }

  function handleJoin(values: JoinGroupInput) {
    joinGroup.mutate(values, {
      onSuccess: () => {
        joinForm.reset();
        toast.success("Te has unido al grupo.");
      },
      onError: (err) => toast.error(toErrorMessage(err, "No se pudo unir al grupo.")),
    });
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <ChapterHeading>Tus grupos</ChapterHeading>

      <div className="mb-8 grid gap-4 sm:grid-cols-2">
        <Card as="form" onSubmit={createForm.handleSubmit(handleCreate)} noValidate>
          <h2 className="mb-3 font-display text-sm tracking-wide text-oxblood">Crear grupo</h2>
          <TextField
            label="Nombre del grupo"
            placeholder="Nombre del grupo"
            error={createForm.formState.errors.name?.message}
            {...createForm.register("name")}
          />
          <Button
            type="submit"
            isLoading={createGroup.isPending}
            loadingText="Creando..."
            className="w-full"
          >
            Crear
          </Button>
        </Card>

        <Card as="form" onSubmit={joinForm.handleSubmit(handleJoin)} noValidate>
          <h2 className="mb-3 font-display text-sm tracking-wide text-oxblood">
            Unirse con código
          </h2>
          <TextField
            label="Código de invitación"
            placeholder="Código de invitación"
            className="uppercase tracking-widest"
            error={joinForm.formState.errors.inviteCode?.message}
            {...joinForm.register("inviteCode", {
              onChange: (e) => {
                e.target.value = e.target.value.toUpperCase();
              },
            })}
          />
          <Button
            type="submit"
            isLoading={joinGroup.isPending}
            loadingText="Uniéndote..."
            className="w-full"
          >
            Unirse
          </Button>
        </Card>
      </div>

      {isLoading && <SkeletonPage rows={2} />}

      {!isLoading && groups?.length === 0 && (
        <EmptyState
          title="Aún no perteneces a ningún grupo."
          description="Crea uno nuevo o pídele a tu Master el código de invitación."
        />
      )}

      <ul className="space-y-2">
        {groups?.map((g) => (
          <li key={g.id}>
            <Link
              to={`/groups/${g.id}`}
              className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-sm border border-rule bg-parchment-panel px-4 py-3 hover:border-rule-strong hover:bg-parchment-deep/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-oxblood"
            >
              <span className="min-w-0 flex-1 truncate font-semibold text-ink">{g.name}</span>
              <span className="flex shrink-0 items-center gap-3 text-sm text-ink-muted">
                <span className={g.role === "MASTER" ? "text-oxblood" : undefined}>
                  {g.role === "MASTER" ? "Master" : "Jugador"}
                </span>
                <span>
                  {g.memberCount} miembro{g.memberCount === 1 ? "" : "s"}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
