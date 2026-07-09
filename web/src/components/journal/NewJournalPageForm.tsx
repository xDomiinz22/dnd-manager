import { useState, type FormEvent } from "react";

export function NewJournalPageForm({
  onCreate,
  isPending,
  onDone,
}: {
  onCreate: (input: { title: string; bodyMarkdown: string }) => void;
  isPending: boolean;
  onDone: () => void;
}) {
  const [title, setTitle] = useState("");
  const [bodyMarkdown, setBodyMarkdown] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onCreate({ title, bodyMarkdown });
    onDone();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-4 rounded-lg border border-slate-800 bg-slate-900 p-4"
    >
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Título de la página"
        required
        className="mb-2 w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100"
      />
      <textarea
        value={bodyMarkdown}
        onChange={(e) => setBodyMarkdown(e.target.value)}
        placeholder="Contenido (markdown, [[Wiki-links]] permitidos)"
        rows={4}
        className="mb-2 w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 font-mono text-sm text-slate-100"
      />
      <button
        type="submit"
        disabled={isPending}
        className="rounded bg-amber-400 px-3 py-2 text-sm font-medium text-slate-950 disabled:opacity-50"
      >
        {isPending ? "Creando..." : "Crear página"}
      </button>
    </form>
  );
}
