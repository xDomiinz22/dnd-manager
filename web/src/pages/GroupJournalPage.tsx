import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useGroupDetail } from "../features/groups/hooks";
import {
  useCreateGroupPage,
  useDeleteGroupPage,
  useGroupJournal,
  useJournalPage,
  useUpdateGroupPage,
} from "../features/journal/hooks";
import { buildTitleIndex } from "../features/journal/render";
import { JournalTreeSidebar } from "../components/journal/JournalTreeSidebar";
import { JournalPageView } from "../components/journal/JournalPageView";
import { ImportJournalZipForm } from "../components/journal/ImportJournalZipForm";
import { NewJournalPageForm } from "../components/journal/NewJournalPageForm";

export function GroupJournalPage() {
  const { id: groupId, pageId } = useParams<{ id: string; pageId?: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: group } = useGroupDetail(groupId!);
  const { data: journal, isLoading, isError, error } = useGroupJournal(groupId!);
  const { data: page } = useJournalPage(pageId ?? null);

  const createPage = useCreateGroupPage(groupId!);
  const updatePage = useUpdateGroupPage(groupId!);
  const deletePage = useDeleteGroupPage(groupId!);

  const [showImport, setShowImport] = useState(false);
  const [showNewPage, setShowNewPage] = useState(false);

  const isMaster = group?.role === "MASTER";
  const titleToId = buildTitleIndex(journal);

  function goToPage(id: string) {
    navigate(`/groups/${groupId}/journal/${id}`);
  }

  if (isLoading) {
    return <div className="mx-auto max-w-4xl px-6 py-10 text-slate-400">Cargando diario...</div>;
  }

  if (isError) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-10">
        <p className="mb-4 text-slate-400">{(error as Error).message}</p>
        {isMaster && (
          <ImportJournalZipForm groupId={groupId!} onDone={() => window.location.reload()} />
        )}
      </div>
    );
  }
  if (!journal) return null;

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-amber-400">Diario de grupo</h1>
        <div className="flex gap-3 text-sm">
          <button
            type="button"
            onClick={() => setShowNewPage((v) => !v)}
            className="text-slate-300 hover:text-amber-400"
          >
            Nueva página
          </button>
          {isMaster && (
            <button
              type="button"
              onClick={() => setShowImport((v) => !v)}
              className="text-slate-300 hover:text-amber-400"
            >
              {showImport ? "Cerrar" : "Reimportar .zip"}
            </button>
          )}
        </div>
      </div>

      {showImport && isMaster && (
        <ImportJournalZipForm groupId={groupId!} onDone={() => setShowImport(false)} />
      )}
      {showNewPage && (
        <NewJournalPageForm
          isPending={createPage.isPending}
          onCreate={(input) => createPage.mutate(input)}
          onDone={() => setShowNewPage(false)}
        />
      )}

      <div className="flex gap-4">
        <JournalTreeSidebar
          title={journal.title}
          nodes={journal.pages}
          selectedId={pageId ?? null}
          onSelect={goToPage}
        />

        {page ? (
          <JournalPageView
            page={page}
            titleToId={titleToId}
            onNavigate={goToPage}
            canEdit
            isSaving={updatePage.isPending}
            onSave={(input) => updatePage.mutate({ pageId: page.id, input })}
            onDelete={() => {
              deletePage.mutate(page.id);
              navigate(`/groups/${groupId}/journal`);
            }}
          />
        ) : (
          <div className="flex-1 rounded-lg border border-slate-800 bg-slate-900 p-6 text-slate-500">
            Elige una página del árbol para leerla.
          </div>
        )}
      </div>
      <p className="mt-3 text-xs text-slate-600">Conectado como {user?.username}</p>
    </div>
  );
}
