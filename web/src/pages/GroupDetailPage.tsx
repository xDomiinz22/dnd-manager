import { useRef, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  importCharacterMdSchema,
  importCharacterSchema,
  type GroupMemberSummary,
  type ImportCharacterInput,
  type ImportCharacterMdInput,
} from "@dnd-manager/shared";
import { useAuth } from "../context/AuthContext";
import {
  useGroupDetail,
  usePromoteMember,
  useRegenerateInviteCode,
  useRemoveMember,
  useSetMemberMusicPermission,
} from "../features/groups/hooks";
import {
  useDeleteCharacter,
  useImportCharacter,
  useImportCharacterMd,
  useResetGroupHp,
} from "../features/characters/hooks";
import { useCloseOnOutsideClick } from "../lib/useCloseOnOutsideClick";
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
  const promoteMember = usePromoteMember(id!);
  const resetGroupHp = useResetGroupHp(id!);
  const [copied, setCopied] = useState(false);
  const [importing, setImporting] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmingMemberId, setConfirmingMemberId] = useState<string | null>(null);
  const [confirmingPromoteId, setConfirmingPromoteId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [confirmingGroupRest, setConfirmingGroupRest] = useState(false);

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

  function handlePromote(userId: string, username: string) {
    promoteMember.mutate(userId, {
      onSuccess: () => {
        toast.success(`${username} ahora tiene todos los permisos de Master.`);
        setConfirmingPromoteId(null);
      },
      onError: (err) => toast.error(toErrorMessage(err, "No se pudieron conceder los permisos.")),
    });
  }

  function handleResetGroupHp() {
    resetGroupHp.mutate(undefined, {
      onSuccess: ({ count }) => {
        toast.success(`PG restablecidos al máximo (${count} personaje${count === 1 ? "" : "s"}).`);
        setConfirmingGroupRest(false);
      },
      onError: (err) => toast.error(toErrorMessage(err, "No se pudo hacer el descanso de grupo.")),
    });
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
              to={`/groups/${group.id}/map`}
              className="rounded-sm border border-rule px-3 py-1.5 text-ink transition-colors hover:border-oxblood hover:bg-oxblood hover:text-parchment"
            >
              Mapa
            </Link>
            <Link
              to={`/groups/${group.id}/rolls`}
              className="rounded-sm border border-rule px-3 py-1.5 text-ink transition-colors hover:border-oxblood hover:bg-oxblood hover:text-parchment"
            >
              Tiradas
            </Link>
            <Link
              to={`/groups/${group.id}/chat`}
              className="rounded-sm border border-rule px-3 py-1.5 text-ink transition-colors hover:border-oxblood hover:bg-oxblood hover:text-parchment"
            >
              Chat
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
          const hasMenu = m.role !== "MASTER" && (isMaster || isSelf);
          return (
            <li
              key={m.userId}
              className="rounded-sm border border-rule bg-parchment-panel px-4 py-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-ink">{m.username}</span>
                <div className="flex flex-wrap items-center gap-3">
                  <span
                    className={`whitespace-nowrap text-sm ${m.role === "MASTER" ? "text-oxblood" : "text-ink-muted"}`}
                  >
                    {m.role === "MASTER" ? "Master" : "Jugador"}
                  </span>
                  {hasMenu && (
                    <MemberMenu
                      member={m}
                      isMaster={isMaster}
                      isSelf={isSelf}
                      isOpen={openMenuId === m.userId}
                      onOpenChange={(open) => setOpenMenuId(open ? m.userId : null)}
                      onToggleMusic={(canEditMusic) =>
                        handleToggleMusicPermission(m.userId, canEditMusic)
                      }
                      onPromote={() => {
                        setOpenMenuId(null);
                        setConfirmingPromoteId(m.userId);
                      }}
                      onRemove={() => {
                        setOpenMenuId(null);
                        setConfirmingMemberId(m.userId);
                      }}
                    />
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
              {confirmingPromoteId === m.userId && (
                <ConfirmPanel
                  message={`Vas a dar a ${m.username} todos los permisos que tiene el Master (mapa, música, personajes, tiradas, chat...). No hay forma de revocarlo desde aquí.`}
                  confirmLabel="Confirmar"
                  loadingText="Concediendo..."
                  isLoading={promoteMember.isPending}
                  onConfirm={() => handlePromote(m.userId, m.username)}
                  onCancel={() => setConfirmingPromoteId(null)}
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
          <div className="flex gap-2">
            {group.characters.length > 0 && (
              <Button variant="ghost" onClick={() => setConfirmingGroupRest((v) => !v)}>
                Descanso de grupo
              </Button>
            )}
            <Button variant="ghost" onClick={() => setImporting((v) => !v)}>
              {importing ? "Cancelar" : "Importar ficha"}
            </Button>
          </div>
        )}
      </div>

      {confirmingGroupRest && (
        <ConfirmPanel
          message="Vas a restablecer los PG de TODOS los personajes de este grupo a su máximo. No se puede deshacer."
          confirmLabel="Confirmar descanso de grupo"
          loadingText="Restableciendo..."
          isLoading={resetGroupHp.isPending}
          onConfirm={handleResetGroupHp}
          onCancel={() => setConfirmingGroupRest(false)}
          className="mb-4 border-t-0 pt-0"
        />
      )}

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
                <div className="flex flex-wrap items-center gap-3">
                  <PortraitCircle url={c.portraitUrl} name={c.name} size={48} />
                  <div className="min-w-0 flex-1">
                    <Link
                      to={`/characters/${c.id}`}
                      state={isLimited ? { backgroundLocation: location } : undefined}
                      className="block truncate font-semibold text-ink hover:text-oxblood"
                    >
                      {c.name}
                    </Link>
                    {c.className && (
                      <p className="truncate text-sm text-ink-muted">
                        {c.classes && c.classes.length > 0
                          ? c.classes.map((cl) => `${cl.name} ${cl.level}`).join(" / ")
                          : `${c.className} ${c.level}`}
                        {c.ownerUsername ? ` · ${c.ownerUsername}` : ""}
                      </p>
                    )}
                  </div>
                  {isMaster && (
                    <div className="flex w-full flex-wrap gap-2 sm:w-auto">
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
                    </div>
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

/**
 * Menú de "más opciones" por miembro: en escritorio se abre al pasar el
 * ratón por encima (CSS `group-hover`, sin JS); en móvil/touch (donde no hay
 * hover persistente) se abre con un tap y se cierra al pulsar fuera o con
 * Escape (`useCloseOnOutsideClick`). `isOpen` fuerza que se muestre aunque
 * no haya hover, para que el tap funcione igual en ambos casos.
 */
function MemberMenu({
  member,
  isMaster,
  isSelf,
  isOpen,
  onOpenChange,
  onToggleMusic,
  onPromote,
  onRemove,
}: {
  member: GroupMemberSummary;
  isMaster: boolean;
  isSelf: boolean;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onToggleMusic: (canEditMusic: boolean) => void;
  onPromote: () => void;
  onRemove: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useCloseOnOutsideClick(ref, () => onOpenChange(false));

  return (
    <div ref={ref} className="group relative">
      <button
        type="button"
        onClick={() => onOpenChange(!isOpen)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={`Más opciones para ${member.username}`}
        className="flex h-7 w-7 items-center justify-center rounded-sm text-lg leading-none text-ink-muted hover:bg-parchment-deep/60 hover:text-oxblood focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-oxblood"
      >
        ⋮
      </button>
      <div
        role="menu"
        className={`absolute right-0 top-full z-40 mt-1 w-56 rounded-sm border border-rule bg-parchment-panel p-1 shadow-[0_4px_16px_-4px_rgba(0,0,0,0.3)] ${
          isOpen ? "block" : "hidden group-hover:block"
        }`}
      >
        {isMaster && (
          <label className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-ink hover:bg-parchment-deep/60">
            <input
              type="checkbox"
              checked={member.canEditMusic}
              onChange={(e) => onToggleMusic(e.target.checked)}
              className="accent-oxblood"
            />
            Gestiona música
          </label>
        )}
        {isMaster && (
          <button
            type="button"
            role="menuitem"
            onClick={onPromote}
            className="block w-full rounded-sm px-2 py-1.5 text-left text-sm text-ink hover:bg-parchment-deep/60 hover:text-oxblood"
          >
            Dar todos los permisos de Master
          </button>
        )}
        {(isMaster || isSelf) && (
          <button
            type="button"
            role="menuitem"
            onClick={onRemove}
            className="block w-full rounded-sm px-2 py-1.5 text-left text-sm text-oxblood-dark hover:bg-parchment-deep/60"
          >
            {isSelf ? "Salir" : "Expulsar"}
          </button>
        )}
      </div>
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
