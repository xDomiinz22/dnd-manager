import { useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useGroupDetail, useRegenerateInviteCode, useRemoveMember } from "../features/groups/hooks";
import { useImportCharacter, useImportCharacterMd } from "../features/characters/hooks";
import { PortraitCircle } from "../components/character/PortraitCircle";

export function GroupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { data: group, isLoading } = useGroupDetail(id!);
  const regenerate = useRegenerateInviteCode(id!);
  const removeMember = useRemoveMember(id!);
  const [copied, setCopied] = useState(false);
  const [importing, setImporting] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  if (isLoading || !group) {
    return <div className="mx-auto max-w-2xl px-6 py-10 text-slate-400">Cargando grupo...</div>;
  }

  const isMaster = group.role === "MASTER";

  function handleCopy() {
    if (!group) return;
    navigator.clipboard.writeText(group.inviteCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="mb-1 text-2xl font-semibold text-amber-400">{group.name}</h1>
      <p className="mb-6 text-sm text-slate-400">Master: {group.master.username}</p>

      <div className="mb-6 flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-900 px-4 py-3">
        <span className="text-sm text-slate-400">Código de invitación</span>
        <code className="rounded bg-slate-800 px-2 py-1 font-mono tracking-widest text-amber-400">
          {group.inviteCode}
        </code>
        <button
          type="button"
          onClick={handleCopy}
          className="text-sm text-slate-300 hover:text-amber-400"
        >
          {copied ? "¡Copiado!" : "Copiar"}
        </button>
        {isMaster && (
          <button
            type="button"
            onClick={() => regenerate.mutate()}
            disabled={regenerate.isPending}
            className="ml-auto text-sm text-slate-300 hover:text-amber-400 disabled:opacity-50"
          >
            {regenerate.isPending ? "Regenerando..." : "Regenerar"}
          </button>
        )}
      </div>

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
                <button
                  type="button"
                  onClick={() => removeMember.mutate(m.userId)}
                  disabled={removeMember.isPending}
                  className="text-sm text-red-400 hover:underline disabled:opacity-50"
                >
                  {m.userId === user?.id ? "Salir" : "Expulsar"}
                </button>
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
          <button
            type="button"
            onClick={() => setImporting((v) => !v)}
            className="text-sm text-amber-400 hover:underline"
          >
            {importing ? "Cancelar" : "Importar ficha"}
          </button>
        )}
      </div>

      {importing && (
        <ImportCharacterForm
          groupId={group.id}
          members={group.members}
          onDone={() => setImporting(false)}
        />
      )}

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
                <button
                  type="button"
                  onClick={() => setUpdatingId(updatingId === c.id ? null : c.id)}
                  className="text-sm text-slate-300 hover:text-amber-400"
                >
                  Actualizar .md
                </button>
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
        {group.characters.length === 0 && (
          <p className="text-slate-500">Aún no hay personajes en este grupo.</p>
        )}
      </ul>
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
  const [md, setMd] = useState("");
  const [ownerId, setOwnerId] = useState(players[0]?.userId ?? "");
  const importCharacter = useImportCharacter(groupId);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    importCharacter.mutate(
      { md, ownerId: ownerId || undefined },
      {
        onSuccess: () => {
          setMd("");
          onDone();
        },
      },
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-4 rounded-lg border border-slate-800 bg-slate-900 p-4"
    >
      <label className="mb-1 block text-sm text-slate-400" htmlFor="owner">
        Dueño
      </label>
      <select
        id="owner"
        value={ownerId}
        onChange={(e) => setOwnerId(e.target.value)}
        className="mb-3 w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100"
      >
        {players.map((p) => (
          <option key={p.userId} value={p.userId}>
            {p.username}
          </option>
        ))}
      </select>

      <label className="mb-1 block text-sm text-slate-400" htmlFor="md">
        Contenido del .md (export Foundry)
      </label>
      <textarea
        id="md"
        value={md}
        onChange={(e) => setMd(e.target.value)}
        required
        rows={6}
        className="mb-3 w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 font-mono text-xs text-slate-100"
        placeholder={"---\ntitle: ...\n```Actor\n...\n```"}
      />

      {importCharacter.isError && (
        <p className="mb-3 text-sm text-red-400">{(importCharacter.error as Error).message}</p>
      )}

      <button
        type="submit"
        disabled={importCharacter.isPending}
        className="rounded bg-amber-400 px-3 py-2 text-sm font-medium text-slate-950 disabled:opacity-50"
      >
        {importCharacter.isPending ? "Importando..." : "Importar"}
      </button>
    </form>
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
  const [md, setMd] = useState("");
  const importMd = useImportCharacterMd(characterId, groupId);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    importMd.mutate({ md }, { onSuccess: onDone });
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 border-t border-slate-800 pt-3">
      <textarea
        value={md}
        onChange={(e) => setMd(e.target.value)}
        required
        rows={5}
        className="mb-3 w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 font-mono text-xs text-slate-100"
        placeholder="Pega el nuevo contenido del .md"
      />
      {importMd.isError && (
        <p className="mb-3 text-sm text-red-400">{(importMd.error as Error).message}</p>
      )}
      <button
        type="submit"
        disabled={importMd.isPending}
        className="rounded bg-amber-400 px-3 py-2 text-sm font-medium text-slate-950 disabled:opacity-50"
      >
        {importMd.isPending ? "Actualizando..." : "Actualizar"}
      </button>
    </form>
  );
}
