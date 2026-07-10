import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  importCharacterMdSchema,
  importCharacterSchema,
  type ImportCharacterInput,
  type ImportCharacterMdInput,
} from "@dnd-manager/shared";
import { useAuth } from "../context/AuthContext";
import { useGroupDetail, useRegenerateInviteCode, useRemoveMember } from "../features/groups/hooks";
import { useImportCharacter, useImportCharacterMd } from "../features/characters/hooks";
import { PortraitCircle } from "../components/character/PortraitCircle";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { SelectField } from "../components/ui/SelectField";
import { FileDropTextArea } from "../components/ui/FileDropTextArea";
import { EmptyState } from "../components/ui/EmptyState";
import { SkeletonPage } from "../components/ui/Skeleton";
import { toErrorMessage, useToast } from "../components/ui/Toast";

export function GroupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const toast = useToast();
  const { data: group, isLoading } = useGroupDetail(id!);
  const regenerate = useRegenerateInviteCode(id!);
  const removeMember = useRemoveMember(id!);
  const [copied, setCopied] = useState(false);
  const [importing, setImporting] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  if (isLoading || !group) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-10">
        <SkeletonPage rows={4} />
      </div>
    );
  }

  const isMaster = group.role === "MASTER";

  function handleCopy() {
    if (!group) return;
    navigator.clipboard.writeText(group.inviteCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  function handleRegenerate() {
    regenerate.mutate(undefined, {
      onSuccess: () => toast.success("Código de invitación regenerado."),
      onError: (err) => toast.error(toErrorMessage(err, "No se pudo regenerar el código.")),
    });
  }

  function handleRemoveMember(userId: string, isSelf: boolean) {
    removeMember.mutate(userId, {
      onSuccess: () =>
        toast.success(isSelf ? "Has salido del grupo." : "Miembro expulsado del grupo."),
      onError: (err) =>
        toast.error(
          toErrorMessage(
            err,
            isSelf ? "No se pudo salir del grupo." : "No se pudo expulsar al miembro.",
          ),
        ),
    });
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <div className="mb-1 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-amber-400">{group.name}</h1>
        <Link
          to={`/groups/${group.id}/journal`}
          className="text-sm text-slate-300 hover:text-amber-400"
        >
          Diario de grupo →
        </Link>
      </div>
      <p className="mb-6 text-sm text-slate-400">Master: {group.master.username}</p>

      <Card className="mb-6 flex flex-wrap items-center gap-3">
        <span className="text-sm text-slate-400">Código de invitación</span>
        <code className="rounded bg-slate-800 px-2 py-1 font-mono tracking-widest text-amber-400">
          {group.inviteCode}
        </code>
        <Button variant="ghost" onClick={handleCopy}>
          {copied ? "¡Copiado!" : "Copiar"}
        </Button>
        {isMaster && (
          <Button
            variant="ghost"
            onClick={handleRegenerate}
            isLoading={regenerate.isPending}
            loadingText="Regenerando..."
            className="sm:ml-auto"
          >
            Regenerar
          </Button>
        )}
      </Card>

      <h2 className="mb-3 text-lg font-medium text-slate-200">Miembros ({group.members.length})</h2>
      <ul className="mb-6 space-y-2">
        {group.members.map((m) => (
          <li
            key={m.userId}
            className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900 px-4 py-3"
          >
            <span className="text-slate-100">{m.username}</span>
            <div className="flex items-center gap-3">
              <span
                className={`text-sm ${m.role === "MASTER" ? "text-amber-400" : "text-slate-400"}`}
              >
                {m.role === "MASTER" ? "Master" : "Jugador"}
              </span>
              {m.role !== "MASTER" && (isMaster || m.userId === user?.id) && (
                <Button
                  variant="danger"
                  onClick={() => handleRemoveMember(m.userId, m.userId === user?.id)}
                  isLoading={removeMember.isPending}
                >
                  {m.userId === user?.id ? "Salir" : "Expulsar"}
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>

      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-medium text-slate-200">
          Personajes ({group.characters.length})
        </h2>
        {isMaster && (
          <Button
            variant="ghost"
            className="text-amber-400"
            onClick={() => setImporting((v) => !v)}
          >
            {importing ? "Cancelar" : "Importar ficha"}
          </Button>
        )}
      </div>

      {importing && (
        <ImportCharacterForm
          groupId={group.id}
          members={group.members}
          onDone={() => setImporting(false)}
        />
      )}

      {group.characters.length === 0 ? (
        <EmptyState
          title="Aún no hay personajes en este grupo."
          description={isMaster ? "Importa una ficha desde el export .md de Foundry." : undefined}
        />
      ) : (
        <ul className="space-y-2">
          {group.characters.map((c) => (
            <li key={c.id} className="rounded-lg border border-slate-800 bg-slate-900 p-4">
              <div className="flex items-center gap-3">
                <PortraitCircle url={c.portraitUrl} name={c.name} size={48} />
                <div className="flex-1">
                  <Link
                    to={`/characters/${c.id}`}
                    className="font-medium text-slate-100 hover:text-amber-400"
                  >
                    {c.name}
                  </Link>
                  {c.className && (
                    <p className="text-sm text-slate-500">
                      {c.className} {c.level} {c.ownerUsername ? `· ${c.ownerUsername}` : ""}
                    </p>
                  )}
                </div>
                {isMaster && (
                  <Button
                    variant="ghost"
                    onClick={() => setUpdatingId(updatingId === c.id ? null : c.id)}
                  >
                    Actualizar .md
                  </Button>
                )}
              </div>
              {updatingId === c.id && (
                <UpdateCharacterMdForm
                  characterId={c.id}
                  groupId={group.id}
                  onDone={() => setUpdatingId(null)}
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

interface ImportCharacterFormProps {
  groupId: string;
  members: { userId: string; username: string; role: string }[];
  onDone: () => void;
}

function ImportCharacterForm({ groupId, members, onDone }: ImportCharacterFormProps) {
  const players = members.filter((m) => m.role !== "MASTER");
  const importCharacter = useImportCharacter(groupId);
  const toast = useToast();
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ImportCharacterInput>({
    resolver: zodResolver(importCharacterSchema),
    defaultValues: { ownerId: players[0]?.userId ?? "", md: "" },
  });

  function onSubmit(values: ImportCharacterInput) {
    importCharacter.mutate(values, {
      onSuccess: () => {
        toast.success("Ficha importada.");
        onDone();
      },
      onError: (err) => toast.error(toErrorMessage(err, "No se pudo importar la ficha.")),
    });
  }

  return (
    <Card as="form" onSubmit={handleSubmit(onSubmit)} noValidate className="mb-4">
      <SelectField label="Dueño" {...register("ownerId")}>
        {players.map((p) => (
          <option key={p.userId} value={p.userId}>
            {p.username}
          </option>
        ))}
      </SelectField>

      <FileDropTextArea
        label="Contenido del .md (export Foundry)"
        rows={6}
        className="font-mono text-xs"
        placeholder={"---\ntitle: ...\n```Actor\n...\n```"}
        error={errors.md?.message}
        onFileDrop={(text) => setValue("md", text, { shouldValidate: true })}
        {...register("md")}
      />

      <Button type="submit" isLoading={importCharacter.isPending} loadingText="Importando...">
        Importar
      </Button>
    </Card>
  );
}

function UpdateCharacterMdForm({
  characterId,
  groupId,
  onDone,
}: {
  characterId: string;
  groupId: string;
  onDone: () => void;
}) {
  const importMd = useImportCharacterMd(characterId, groupId);
  const toast = useToast();
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ImportCharacterMdInput>({
    resolver: zodResolver(importCharacterMdSchema),
    defaultValues: { md: "" },
  });

  function onSubmit(values: ImportCharacterMdInput) {
    importMd.mutate(values, {
      onSuccess: () => {
        toast.success("Ficha actualizada.");
        onDone();
      },
      onError: (err) => toast.error(toErrorMessage(err, "No se pudo actualizar la ficha.")),
    });
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="mt-3 border-t border-slate-800 pt-3"
    >
      <FileDropTextArea
        label="Nuevo contenido del .md"
        hideLabel
        rows={5}
        className="font-mono text-xs"
        placeholder="Pega el nuevo contenido del .md"
        error={errors.md?.message}
        onFileDrop={(text) => setValue("md", text, { shouldValidate: true })}
        {...register("md")}
      />
      <Button type="submit" isLoading={importMd.isPending} loadingText="Actualizando...">
        Actualizar
      </Button>
    </form>
  );
}
