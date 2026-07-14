import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
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
import { Button } from "../components/ui/Button";
import { ChapterHeading } from "../components/ui/ChapterHeading";
import { SkeletonPage } from "../components/ui/Skeleton";
import { toErrorMessage, useToast } from "../components/ui/Toast";

export function GroupJournalPage() {
  const { id: groupId, pageId } = useParams<{ id: string; pageId?: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();
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
    return (
      <div className="mx-auto max-w-5xl px-6 py-10">
        <SkeletonPage />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-10">
        <p className="mb-4 text-ink-muted">{(error as Error).message}</p>
        {isMaster && (
          <ImportJournalZipForm groupId={groupId!} onDone={() => window.location.reload()} />
        )}
      </div>
    );
  }
  if (!journal) return null;

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <Link
        to={`/groups/${groupId}`}
        className="mb-4 inline-block text-sm text-ink-muted hover:text-oxblood"
      >
        ← Volver al grupo
      </Link>
      <ChapterHeading
        action={
          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => setShowNewPage((v) => !v)}>
              Nueva página
            </Button>
            {isMaster && (
              <Button variant="ghost" onClick={() => setShowImport((v) => !v)}>
                {showImport ? "Cerrar" : "Reimportar .zip"}
              </Button>
            )}
          </div>
        }
      >
        Diario de grupo
      </ChapterHeading>

      {showImport && isMaster && (
        <ImportJournalZipForm groupId={groupId!} onDone={() => setShowImport(false)} />
      )}
      {showNewPage && (
        <NewJournalPageForm
          isPending={createPage.isPending}
          onCreate={(input) =>
            createPage.mutate(input, {
              onSuccess: () => toast.success("Página creada."),
              onError: (err) => toast.error(toErrorMessage(err, "No se pudo crear la página.")),
            })
          }
          onDone={() => setShowNewPage(false)}
        />
      )}

      <div className="flex flex-col gap-4 sm:flex-row">
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
            onSave={(input) =>
              updatePage.mutate(
                { pageId: page.id, input },
                {
                  onSuccess: () => toast.success("Página guardada."),
                  onError: (err) =>
                    toast.error(toErrorMessage(err, "No se pudo guardar la página.")),
                },
              )
            }
            onDelete={() => {
              deletePage.mutate(page.id, {
                onSuccess: () => toast.success("Página borrada."),
                onError: (err) => toast.error(toErrorMessage(err, "No se pudo borrar la página.")),
              });
              navigate(`/groups/${groupId}/journal`);
            }}
          />
        ) : (
          <div className="flex-1 rounded-sm border border-rule bg-parchment-panel p-6 text-ink-muted">
            Elige una página del árbol para leerla.
          </div>
        )}
      </div>
      <p className="mt-3 text-xs text-ink-muted">Conectado como {user?.username}</p>
    </div>
  );
}
