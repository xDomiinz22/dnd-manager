import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createJournalPageSchema, type CreateJournalPageInput } from "@dnd-manager/shared";
import { Card } from "../ui/Card";
import { TextField } from "../ui/TextField";
import { TextAreaField } from "../ui/TextAreaField";
import { Button } from "../ui/Button";

export function NewJournalPageForm({
  onCreate,
  isPending,
  onDone,
}: {
  onCreate: (input: { title: string; bodyMarkdown: string }) => void;
  isPending: boolean;
  onDone: () => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    // `bodyMarkdown` tiene `.default("")` en el schema: el tipo de ENTRADA
    // del formulario (antes de que zod aplique el default) lo deja
    // opcional, mientras que el tipo de SALIDA (tras `handleSubmit`, ya
    // resuelto) lo garantiza como string — de ahí los dos genéricos
    // distintos en vez de `CreateJournalPageInput` (el de salida) para los
    // dos casos.
  } = useForm<z.input<typeof createJournalPageSchema>, unknown, CreateJournalPageInput>({
    resolver: zodResolver(createJournalPageSchema),
    defaultValues: { title: "", bodyMarkdown: "" },
  });

  function onSubmit(values: CreateJournalPageInput) {
    onCreate(values);
    onDone();
  }

  return (
    <Card as="form" onSubmit={handleSubmit(onSubmit)} noValidate className="mb-4">
      <TextField
        label="Título de la página"
        hideLabel
        placeholder="Título de la página"
        error={errors.title?.message}
        {...register("title")}
      />
      <TextAreaField
        label="Contenido"
        hideLabel
        rows={4}
        className="font-mono text-sm"
        placeholder="Contenido (markdown, [[Wiki-links]] permitidos)"
        error={errors.bodyMarkdown?.message}
        {...register("bodyMarkdown")}
      />
      <Button type="submit" isLoading={isPending} loadingText="Creando...">
        Crear página
      </Button>
    </Card>
  );
}
