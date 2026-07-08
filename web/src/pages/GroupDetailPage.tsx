import { useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useGroupDetail, useRegenerateInviteCode, useRemoveMember } from "../features/groups/hooks";

export function GroupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { data: group, isLoading } = useGroupDetail(id!);
  const regenerate = useRegenerateInviteCode(id!);
  const removeMember = useRemoveMember(id!);
  const [copied, setCopied] = useState(false);

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
      <ul className="space-y-2">
        {group.members.map((m) => (
          <li
            key={m.userId}
            className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900 px-4 py-3"
          >
            <span className="text-slate-100">{m.username}</span>
            <div className="flex items-center gap-3">
              <span className={`text-sm ${m.role === "MASTER" ? "text-amber-400" : "text-slate-400"}`}>
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
    </div>
  );
}
