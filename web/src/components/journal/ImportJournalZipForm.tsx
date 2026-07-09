import { useState } from "react";
import {
  buildJournalImportPayload,
  parseJournalZip,
  type ZipImportProgress,
} from "../../features/journal/zipImport";
import { useImportGroupJournal } from "../../features/journal/hooks";

export function ImportJournalZipForm({ groupId, onDone }: { groupId: string; onDone: () => void }) {
  const importJournal = useImportGroupJournal(groupId);
  const [progress, setProgress] = useState<ZipImportProgress | null>(null);
  const [step, setStep] = useState<"idle" | "parsing" | "uploading" | "importing">("idle");
  const [error, setError] = useState<string | null>(null);
  const [confirmDestroy, setConfirmDestroy] = useState(false);

  async function handleFile(file: File) {
    setError(null);
    setProgress(null);
    try {
      setStep("parsing");
      const parsed = await parseJournalZip(file);

      setStep("uploading");
      const payload = await buildJournalImportPayload(parsed, setProgress);

      setStep("importing");
      await importJournal.mutateAsync(payload);
      onDone();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setStep("idle");
    }
  }

  const busy = step !== "idle";

  return (
    <div className="mb-4 rounded-lg border border-slate-800 bg-slate-900 p-4">
      <p className="mb-3 text-sm text-amber-400">
        ⚠ Importar reemplaza por completo el diario de grupo actual (no se puede deshacer).
      </p>

      {!confirmDestroy ? (
        <button
          type="button"
          onClick={() => setConfirmDestroy(true)}
          className="rounded border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800"
        >
          Importar .zip de Obsidian
        </button>
      ) : (
        <div>
          <input
            type="file"
            accept=".zip"
            disabled={busy}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
            }}
            className="mb-2 block text-sm text-slate-300"
          />
          {step === "parsing" && (
            <p className="text-sm text-slate-400">Descomprimiendo y leyendo páginas...</p>
          )}
          {step === "uploading" && (
            <p className="text-sm text-slate-400">
              Subiendo assets
              {progress ? ` (${progress.uploadedAssets}/${progress.totalAssets})` : "..."}
            </p>
          )}
          {step === "importing" && <p className="text-sm text-slate-400">Guardando el diario...</p>}
          {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
          <button
            type="button"
            onClick={() => setConfirmDestroy(false)}
            disabled={busy}
            className="mt-2 text-sm text-slate-400 hover:text-slate-200 disabled:opacity-50"
          >
            Cancelar
          </button>
        </div>
      )}
    </div>
  );
}
