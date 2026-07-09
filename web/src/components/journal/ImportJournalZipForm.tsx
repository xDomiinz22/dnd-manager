import { useState } from "react";
import {
  buildJournalImportPayload,
  parseJournalZip,
  type ZipImportProgress,
} from "../../features/journal/zipImport";
import { useImportGroupJournal } from "../../features/journal/hooks";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { toErrorMessage, useToast } from "../ui/Toast";

export function ImportJournalZipForm({ groupId, onDone }: { groupId: string; onDone: () => void }) {
  const importJournal = useImportGroupJournal(groupId);
  const toast = useToast();
  const [progress, setProgress] = useState<ZipImportProgress | null>(null);
  const [step, setStep] = useState<"idle" | "parsing" | "uploading" | "importing">("idle");
  const [confirmDestroy, setConfirmDestroy] = useState(false);

  async function handleFile(file: File) {
    setProgress(null);
    try {
      setStep("parsing");
      const parsed = await parseJournalZip(file);

      setStep("uploading");
      const payload = await buildJournalImportPayload(parsed, setProgress);

      setStep("importing");
      await importJournal.mutateAsync(payload);
      toast.success("Diario importado.");
      onDone();
    } catch (err) {
      toast.error(toErrorMessage(err, "No se pudo importar el diario."));
    } finally {
      setStep("idle");
    }
  }

  const busy = step !== "idle";

  return (
    <Card className="mb-4">
      <p className="mb-3 text-sm text-amber-400">
        ⚠ Importar reemplaza por completo el diario de grupo actual (no se puede deshacer).
      </p>

      {!confirmDestroy ? (
        <Button variant="secondary" onClick={() => setConfirmDestroy(true)}>
          Importar .zip de Obsidian
        </Button>
      ) : (
        <div>
          <label className="sr-only" htmlFor="journal-zip-file">
            Archivo .zip de Obsidian
          </label>
          <input
            id="journal-zip-file"
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
          <Button
            variant="ghost"
            onClick={() => setConfirmDestroy(false)}
            disabled={busy}
            className="mt-2"
          >
            Cancelar
          </Button>
        </div>
      )}
    </Card>
  );
}
