import { useMemo, useState, type MouseEvent } from "react";
import type { JournalPageView as JournalPageViewData } from "@dnd-manager/shared";
import { JOURNAL_PAGE_LINK_PREFIX, renderJournalHtml } from "../../features/journal/render";

interface JournalPageViewProps {
  page: JournalPageViewData;
  titleToId: Map<string, string>;
  onNavigate: (pageId: string) => void;
  canEdit: boolean;
  onSave?: (input: { title: string; bodyMarkdown: string }) => void;
  onDelete?: () => void;
  isSaving?: boolean;
}

export function JournalPageView({
  page,
  titleToId,
  onNavigate,
  canEdit,
  onSave,
  onDelete,
  isSaving,
}: JournalPageViewProps) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(page.title);
  const [bodyMarkdown, setBodyMarkdown] = useState(page.bodyMarkdown);

  const html = useMemo(
    () => renderJournalHtml(page.bodyMarkdown, page.assets, titleToId),
    [page.bodyMarkdown, page.assets, titleToId],
  );

  function handleContentClick(e: MouseEvent<HTMLDivElement>) {
    const anchor = (e.target as HTMLElement).closest("a");
    if (!anchor) return;
    const href = anchor.getAttribute("href") ?? "";
    const marker = `#${JOURNAL_PAGE_LINK_PREFIX}`;
    if (href.startsWith(marker)) {
      e.preventDefault();
      onNavigate(href.slice(marker.length));
    }
  }

  function startEditing() {
    setTitle(page.title);
    setBodyMarkdown(page.bodyMarkdown);
    setEditing(true);
  }

  function handleSave() {
    onSave?.({ title, bodyMarkdown });
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="flex-1 rounded-lg border border-slate-800 bg-slate-900 p-4">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mb-3 w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 font-semibold text-amber-400"
        />
        <textarea
          value={bodyMarkdown}
          onChange={(e) => setBodyMarkdown(e.target.value)}
          rows={16}
          className="mb-3 w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 font-mono text-sm text-slate-100"
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="rounded bg-amber-400 px-3 py-2 text-sm font-medium text-slate-950 disabled:opacity-50"
          >
            {isSaving ? "Guardando..." : "Guardar"}
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="rounded border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800"
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 rounded-lg border border-slate-800 bg-slate-900 p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <h1 className="text-xl font-semibold text-amber-400">{page.title}</h1>
        {canEdit && (
          <div className="flex shrink-0 gap-2 text-sm">
            <button
              type="button"
              onClick={startEditing}
              className="text-slate-300 hover:text-amber-400"
            >
              Editar
            </button>
            {onDelete && (
              <button type="button" onClick={onDelete} className="text-red-400 hover:underline">
                Borrar
              </button>
            )}
          </div>
        )}
      </div>

      <div
        className="journal-prose text-sm leading-relaxed text-slate-200"
        onClick={handleContentClick}
        // El HTML ya pasó por DOMPurify en renderJournalHtml.
        dangerouslySetInnerHTML={{ __html: html }}
      />

      {page.backlinks.length > 0 && (
        <div className="mt-6 border-t border-slate-800 pt-3">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Backlinks
          </h2>
          <ul className="space-y-1">
            {page.backlinks.map((b) => (
              <li key={b.pageId}>
                <button
                  type="button"
                  onClick={() => onNavigate(b.pageId)}
                  className="text-sm text-amber-400 hover:underline"
                >
                  {b.title}
                </button>
                {b.label && b.label !== b.title && (
                  <span className="ml-1 text-xs text-slate-500">({b.label})</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
