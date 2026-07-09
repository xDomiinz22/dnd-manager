import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
  } = useForm<CreateJournalPageInput>({
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
