import { useEffect, useMemo, useState, type MouseEvent } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { JournalPageView as JournalPageViewData } from "@dnd-manager/shared";
import { updateJournalPageSchema, type UpdateJournalPageInput } from "@dnd-manager/shared";
import { JOURNAL_PAGE_LINK_PREFIX, renderJournalHtml } from "../../features/journal/render";
import { TextField } from "../ui/TextField";
import { TextAreaField } from "../ui/TextAreaField";
import { Button } from "../ui/Button";
import { ConfirmPanel } from "../ui/ConfirmPanel";

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
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UpdateJournalPageInput>({
    resolver: zodResolver(updateJournalPageSchema),
    defaultValues: { title: page.title, bodyMarkdown: page.bodyMarkdown },
  });

  useEffect(() => {
    reset({ title: page.title, bodyMarkdown: page.bodyMarkdown });
  }, [page.id, page.title, page.bodyMarkdown, reset]);

  // Resetear `confirmingDelete` al cambiar de página se ajusta durante el
  // propio render (comparando contra el id del render anterior) en vez de
  // en un `useEffect` — mismo patrón que en GroupMusicPage, recomendado por
  // React para "resetear estado cuando cambia una prop".
  const [prevPageId, setPrevPageId] = useState(page.id);
  if (page.id !== prevPageId) {
    setPrevPageId(page.id);
    setConfirmingDelete(false);
  }

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

  function onSubmit(values: UpdateJournalPageInput) {
    onSave?.({ title: values.title ?? page.title, bodyMarkdown: values.bodyMarkdown ?? "" });
    setEditing(false);
  }

  if (editing) {
    return (
      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="flex-1 rounded-sm border border-rule bg-parchment-panel p-4"
      >
        <TextField
          label="Título"
          hideLabel
          className="font-display text-oxblood"
          error={errors.title?.message}
          {...register("title")}
        />
        <TextAreaField
          label="Contenido"
          hideLabel
          rows={16}
          className="font-mono text-sm"
          error={errors.bodyMarkdown?.message}
          {...register("bodyMarkdown")}
        />
        <div className="flex gap-2">
          <Button type="submit" isLoading={isSaving} loadingText="Guardando...">
            Guardar
          </Button>
          <Button variant="secondary" type="button" onClick={() => setEditing(false)}>
            Cancelar
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex-1 rounded-sm border border-rule bg-parchment-panel p-4">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <h1 className="min-w-0 flex-1 font-display text-xl tracking-wide text-oxblood">
          {page.title}
        </h1>
        {canEdit && (
          <div className="flex w-full shrink-0 gap-2 sm:w-auto">
            <Button
              variant="ghost"
              onClick={() => {
                reset({ title: page.title, bodyMarkdown: page.bodyMarkdown });
                setEditing(true);
              }}
            >
              Editar
            </Button>
            {onDelete && (
              <Button variant="danger" onClick={() => setConfirmingDelete((v) => !v)}>
                Borrar
              </Button>
            )}
          </div>
        )}
      </div>

      {confirmingDelete && onDelete && (
        <ConfirmPanel
          message={`Esto borra la página "${page.title}" por completo. No se puede deshacer.`}
          confirmLabel="Confirmar borrado"
          onConfirm={onDelete}
          onCancel={() => setConfirmingDelete(false)}
          className="mb-3"
        />
      )}

      <div
        className="journal-prose text-[0.95rem] leading-relaxed text-ink"
        onClick={handleContentClick}
        // El HTML ya pasó por DOMPurify en renderJournalHtml.
        dangerouslySetInnerHTML={{ __html: html }}
      />

      {page.backlinks.length > 0 && (
        <div className="mt-6 border-t border-rule pt-3">
          <h2 className="mb-2 font-display text-xs tracking-wide text-ink-muted">Backlinks</h2>
          <ul className="space-y-1">
            {page.backlinks.map((b) => (
              <li key={b.pageId}>
                <button
                  type="button"
                  onClick={() => onNavigate(b.pageId)}
                  className="text-sm text-oxblood hover:underline"
                >
                  {b.title}
                </button>
                {b.label && b.label !== b.title && (
                  <span className="ml-1 text-xs text-ink-muted">({b.label})</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
