import { useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  importCharacterMdSchema,
  importCharacterSchema,
  type ImportCharacterInput,
  type ImportCharacterMdInput,
} from "@dnd-manager/shared";
import { useAuth } from "../context/AuthContext";
import {
  useGroupDetail,
  useRegenerateInviteCode,
  useRemoveMember,
  useSetMemberMusicPermission,
} from "../features/groups/hooks";
import {
  useDeleteCharacter,
  useImportCharacter,
  useImportCharacterMd,
} from "../features/characters/hooks";
import { PortraitCircle } from "../components/character/PortraitCircle";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { SelectField } from "../components/ui/SelectField";
import { FileDropTextArea } from "../components/ui/FileDropTextArea";
import { EmptyState } from "../components/ui/EmptyState";
import { ChapterHeading } from "../components/ui/ChapterHeading";
import { ConfirmPanel } from "../components/ui/ConfirmPanel";
import { SkeletonPage } from "../components/ui/Skeleton";
import { toErrorMessage, useToast } from "../components/ui/Toast";

export function GroupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const location = useLocation();
  const toast = useToast();
  const { data: group, isLoading } = useGroupDetail(id!);
  const regenerate = useRegenerateInviteCode(id!);
  const removeMember = useRemoveMember(id!);
  const setMemberMusicPermission = useSetMemberMusicPermission(id!);
  const [copied, setCopied] = useState(false);
  const [importing, setImporting] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmingMemberId, setConfirmingMemberId] = useState<string | null>(null);

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
      onSuccess: () => {
        toast.success(isSelf ? "Has salido del grupo." : "Miembro expulsado del grupo.");
        setConfirmingMemberId(null);
      },
      onError: (err) =>
        toast.error(
          toErrorMessage(
            err,
            isSelf ? "No se pudo salir del grupo." : "No se pudo expulsar al miembro.",
          ),
        ),
    });
  }

  function handleToggleMusicPermission(userId: string, canEditMusic: boolean) {
    setMemberMusicPermission.mutate(
      { userId, input: { canEditMusic } },
      {
        onError: (err) =>
          toast.error(toErrorMessage(err, "No se pudo cambiar el permiso de música.")),
      },
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <ChapterHeading
        action={
          <div className="flex flex-wrap gap-2">
            <Link
              to={`/groups/${group.id}/music`}
              className="rounded-sm border border-rule px-3 py-1.5 text-ink transition-colors hover:border-oxblood hover:bg-oxblood hover:text-parchment"
            >
              Música ambiente
            </Link>
            <Link
              to={`/groups/${group.id}/journal`}
              className="rounded-sm border border-rule px-3 py-1.5 text-ink transition-colors hover:border-oxblood hover:bg-oxblood hover:text-parchment"
            >
              Diario de grupo
            </Link>
          </div>
        }
      >
        {group.name}
      </ChapterHeading>
      <p className="-mt-4 mb-6 text-sm text-ink-muted">Master: {group.master.username}</p>

      <Card className="mb-6 flex flex-wrap items-center gap-3">
        <span className="text-sm text-ink-muted">Código de invitación</span>
        <code className="rounded-sm bg-parchment px-2 py-1 font-mono tracking-widest text-oxblood">
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

      <h2 className="mb-3 font-display text-lg tracking-wide text-oxblood">
        Miembros ({group.members.length})
      </h2>
      <ul className="mb-6 space-y-2">
        {group.members.map((m) => {
          const isSelf = m.userId === user?.id;
          return (
            <li
              key={m.userId}
              className="rounded-sm border border-rule bg-parchment-panel px-4 py-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-ink">{m.username}</span>
                <div className="flex items-center gap-3">
                  <span
                    className={`text-sm ${m.role === "MASTER" ? "text-oxblood" : "text-ink-muted"}`}
                  >
                    {m.role === "MASTER" ? "Master" : "Jugador"}
                  </span>
                  {isMaster && m.role !== "MASTER" && (
                    <label className="flex items-center gap-1 text-sm text-ink-muted">
                      <input
                        type="checkbox"
                        checked={m.canEditMusic}
                        onChange={(e) => handleToggleMusicPermission(m.userId, e.target.checked)}
                        className="accent-oxblood"
                      />
                      Gestiona música
                    </label>
                  )}
                  {m.role !== "MASTER" && (isMaster || isSelf) && (
                    <Button
                      variant="danger"
                      onClick={() =>
                        setConfirmingMemberId(confirmingMemberId === m.userId ? null : m.userId)
                      }
                    >
                      {isSelf ? "Salir" : "Expulsar"}
                    </Button>
                  )}
                </div>
              </div>
              {confirmingMemberId === m.userId && (
                <ConfirmPanel
                  message={
                    isSelf
                      ? "Vas a salir de este grupo. Tendrás que volver a unirte con el código de invitación si quieres volver."
                      : `Vas a expulsar a ${m.username} del grupo. Podrá volver a unirse con el código de invitación.`
                  }
                  confirmLabel={isSelf ? "Confirmar salida" : "Confirmar expulsión"}
                  loadingText={isSelf ? "Saliendo..." : "Expulsando..."}
                  isLoading={removeMember.isPending}
                  onConfirm={() => handleRemoveMember(m.userId, isSelf)}
                  onCancel={() => setConfirmingMemberId(null)}
                />
              )}
            </li>
          );
        })}
      </ul>

      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-lg tracking-wide text-oxblood">
          Personajes ({group.characters.length})
        </h2>
        {isMaster && (
          <Button variant="ghost" onClick={() => setImporting((v) => !v)}>
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
          {group.characters.map((c) => {
            const isLimited = !isMaster && c.ownerId !== user?.id;
            return (
              <li key={c.id} className="rounded-sm border border-rule bg-parchment-panel p-4">
                <div className="flex items-center gap-3">
                  <PortraitCircle url={c.portraitUrl} name={c.name} size={48} />
                  <div className="flex-1">
                    <Link
                      to={`/characters/${c.id}`}
                      state={isLimited ? { backgroundLocation: location } : undefined}
                      className="font-semibold text-ink hover:text-oxblood"
                    >
                      {c.name}
                    </Link>
                    {c.className && (
                      <p className="text-sm text-ink-muted">
                        {c.classes && c.classes.length > 0
                          ? c.classes.map((cl) => `${cl.name} ${cl.level}`).join(" / ")
                          : `${c.className} ${c.level}`}
                        {c.ownerUsername ? ` · ${c.ownerUsername}` : ""}
                      </p>
                    )}
                  </div>
                  {isMaster && (
                    <>
                      <Button
                        variant="ghost"
                        onClick={() => setUpdatingId(updatingId === c.id ? null : c.id)}
                      >
                        Actualizar .md
                      </Button>
                      <Button
                        variant="danger"
                        onClick={() => setDeletingId(deletingId === c.id ? null : c.id)}
                      >
                        Borrar
                      </Button>
                    </>
                  )}
                </div>
                {updatingId === c.id && (
                  <UpdateCharacterMdForm
                    characterId={c.id}
                    groupId={group.id}
                    onDone={() => setUpdatingId(null)}
                  />
                )}
                {deletingId === c.id && (
                  <DeleteCharacterConfirm
                    characterId={c.id}
                    characterName={c.name}
                    groupId={group.id}
                    onDone={() => setDeletingId(null)}
                  />
                )}
              </li>
            );
          })}
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

function DeleteCharacterConfirm({
  characterId,
  characterName,
  groupId,
  onDone,
}: {
  characterId: string;
  characterName: string;
  groupId: string;
  onDone: () => void;
}) {
  const deleteCharacter = useDeleteCharacter(characterId, groupId);
  const toast = useToast();

  function handleConfirm() {
    deleteCharacter.mutate(undefined, {
      onSuccess: () => {
        toast.success(`${characterName} borrado.`);
        onDone();
      },
      onError: (err) => toast.error(toErrorMessage(err, "No se pudo borrar el personaje.")),
    });
  }

  return (
    <ConfirmPanel
      message={`Esto borra a ${characterName} por completo, junto con su diario personal y sus imágenes. No se puede deshacer.`}
      confirmLabel="Confirmar borrado"
      loadingText="Borrando..."
      isLoading={deleteCharacter.isPending}
      onConfirm={handleConfirm}
      onCancel={onDone}
    />
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
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-3 border-t border-rule pt-3">
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
