import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useCreateGroup, useGroups, useJoinGroup } from "../features/groups/hooks";

export function GroupsPage() {
  const { data: groups, isLoading } = useGroups();
  const createGroup = useCreateGroup();
  const joinGroup = useJoinGroup();
  const [groupName, setGroupName] = useState("");
  const [inviteCode, setInviteCode] = useState("");

  function handleCreate(e: FormEvent) {
    e.preventDefault();
    createGroup.mutate({ name: groupName }, { onSuccess: () => setGroupName("") });
  }

  function handleJoin(e: FormEvent) {
    e.preventDefault();
    joinGroup.mutate({ inviteCode }, { onSuccess: () => setInviteCode("") });
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="mb-6 text-2xl font-semibold text-amber-400">Tus grupos</h1>

      <div className="mb-8 grid gap-4 sm:grid-cols-2">
        <form onSubmit={handleCreate} className="rounded-lg border border-slate-800 bg-slate-900 p-4">
          <h2 className="mb-3 text-sm font-medium text-slate-300">Crear grupo</h2>
          <input
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="Nombre del grupo"
            required
            className="mb-3 w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100 outline-none focus:border-amber-400"
          />
          {createGroup.isError && (
            <p className="mb-3 text-sm text-red-400">{(createGroup.error as Error).message}</p>
          )}
          <button
            type="submit"
            disabled={createGroup.isPending}
            className="w-full rounded bg-amber-400 px-3 py-2 font-medium text-slate-950 disabled:opacity-50"
          >
            {createGroup.isPending ? "Creando..." : "Crear"}
          </button>
        </form>

        <form onSubmit={handleJoin} className="rounded-lg border border-slate-800 bg-slate-900 p-4">
          <h2 className="mb-3 text-sm font-medium text-slate-300">Unirse con código</h2>
          <input
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
            placeholder="Código de invitación"
            required
            className="mb-3 w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 uppercase tracking-widest text-slate-100 outline-none focus:border-amber-400"
          />
          {joinGroup.isError && (
            <p className="mb-3 text-sm text-red-400">{(joinGroup.error as Error).message}</p>
          )}
          <button
            type="submit"
            disabled={joinGroup.isPending}
            className="w-full rounded bg-amber-400 px-3 py-2 font-medium text-slate-950 disabled:opacity-50"
          >
            {joinGroup.isPending ? "Uniéndote..." : "Unirse"}
          </button>
        </form>
      </div>

      {isLoading && <p className="text-slate-400">Cargando grupos...</p>}
      {!isLoading && groups?.length === 0 && (
        <p className="text-slate-400">Aún no perteneces a ningún grupo.</p>
      )}

      <ul className="space-y-2">
        {groups?.map((g) => (
          <li key={g.id}>
            <Link
              to={`/groups/${g.id}`}
              className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900 px-4 py-3 hover:border-amber-400"
            >
              <span className="font-medium text-slate-100">{g.name}</span>
              <span className="flex items-center gap-3 text-sm text-slate-400">
                <span className={g.role === "MASTER" ? "text-amber-400" : undefined}>
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
