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

export function CharacterJournalPage() {
  const { id: characterId, pageId } = useParams<{ id: string; pageId?: string }>();
  const navigate = useNavigate();
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
    return <div className="mx-auto max-w-4xl px-6 py-10 text-slate-400">Cargando diario...</div>;
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
        <button
          type="button"
          onClick={() => setShowNewPage((v) => !v)}
          className="text-sm text-slate-300 hover:text-amber-400"
        >
          Nueva página
        </button>
      </div>

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
