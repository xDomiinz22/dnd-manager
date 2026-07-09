import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useCharacter } from "../features/characters/hooks";
import {
  useCharacterJournal,
  useCreateCharacterPage,
  useDeleteCharacterPage,
  useJournalPage,
  useUpdateCharacterPage,
} from "../features/journal/hooks";
import { buildTitleIndex } from "../features/journal/render";
import { JournalTreeSidebar } from "../components/journal/JournalTreeSidebar";
import { JournalPageView } from "../components/journal/JournalPageView";
import { NewJournalPageForm } from "../components/journal/NewJournalPageForm";
import { Button } from "../components/ui/Button";
import { SkeletonPage } from "../components/ui/Skeleton";
import { toErrorMessage, useToast } from "../components/ui/Toast";

export function CharacterJournalPage() {
  const { id: characterId, pageId } = useParams<{ id: string; pageId?: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const { data: characterView, isLoading: loadingCharacter } = useCharacter(characterId!);
  const { data: journal, isLoading, isError, error } = useCharacterJournal(characterId!);
  const { data: page } = useJournalPage(pageId ?? null);

  const createPage = useCreateCharacterPage(characterId!);
  const updatePage = useUpdateCharacterPage(characterId!);
  const deletePage = useDeleteCharacterPage(characterId!);

  const [showNewPage, setShowNewPage] = useState(false);
  const titleToId = buildTitleIndex(journal);

  function goToPage(id: string) {
    navigate(`/characters/${characterId}/journal/${id}`);
  }

  if (loadingCharacter || isLoading) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-10">
        <SkeletonPage />
      </div>
    );
  }

  if (characterView?.access !== "FULL") {
    return (
      <div className="mx-auto max-w-4xl px-6 py-10 text-slate-400">
        No tienes acceso al diario de este personaje.
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-10 text-slate-400">{(error as Error).message}</div>
    );
  }
  if (!journal) return null;

  const characterName = characterView.character.name;

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-amber-400">Diario de {characterName}</h1>
        <Button variant="ghost" onClick={() => setShowNewPage((v) => !v)}>
          Nueva página
        </Button>
      </div>

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
              navigate(`/characters/${characterId}/journal`);
            }}
          />
        ) : (
          <div className="flex-1 rounded-lg border border-slate-800 bg-slate-900 p-6 text-slate-500">
            Elige una página del árbol para leerla.
          </div>
        )}
      </div>
    </div>
  );
}
