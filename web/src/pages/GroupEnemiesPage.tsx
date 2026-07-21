import { useState } from "react";
import { useParams } from "react-router-dom";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createEnemySchema,
  importEnemyMdSchema,
  importEnemySchema,
  type CreateEnemyInput,
  type EnemyFull,
  type ImportEnemyInput,
  type ImportEnemyMdInput,
} from "@dnd-manager/shared";
import { useGroupDetail } from "../features/groups/hooks";
import {
  useCreateEnemy,
  useDeleteEnemy,
  useEnemies,
  useEnemyImages,
  useImportEnemy,
  useImportEnemyMd,
  useUpdateEnemy,
  useUploadEnemyImage,
  useDeleteEnemyImage,
} from "../features/enemies/hooks";
import { PortraitCircle } from "../components/character/PortraitCircle";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { TextField } from "../components/ui/TextField";
import { FileDropTextArea } from "../components/ui/FileDropTextArea";
import { EmptyState } from "../components/ui/EmptyState";
import { ChapterHeading } from "../components/ui/ChapterHeading";
import { ConfirmPanel } from "../components/ui/ConfirmPanel";
import { SkeletonPage } from "../components/ui/Skeleton";
import { toErrorMessage, useToast } from "../components/ui/Toast";

const EMPTY_ENEMY: CreateEnemyInput = {
  name: "",
  maxHp: 1,
  armorClass: undefined,
  initiativeBonus: 0,
  quickAttacks: [],
};

export function GroupEnemiesPage() {
  const { id } = useParams<{ id: string }>();
  const groupId = id!;
  const { data: group, isLoading: loadingGroup } = useGroupDetail(groupId);
  const { data: enemies, isLoading: loadingEnemies } = useEnemies(groupId);
  const [creating, setCreating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  if (loadingGroup || loadingEnemies || !group || !enemies) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-10">
        <SkeletonPage rows={4} />
      </div>
    );
  }

  const isMaster = group.role === "MASTER";

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <ChapterHeading
        action={
          isMaster ? (
            <div className="flex flex-wrap gap-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setImporting(false);
                  setCreating((v) => !v);
                }}
              >
                {creating ? "Cancelar" : "Crear enemigo"}
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setCreating(false);
                  setImporting((v) => !v);
                }}
              >
                {importing ? "Cancelar" : "Importar .md"}
              </Button>
            </div>
          ) : undefined
        }
      >
        Enemigos de {group.name}
      </ChapterHeading>

      {creating && <QuickCreateForm groupId={groupId} onDone={() => setCreating(false)} />}
      {importing && <ImportEnemyForm groupId={groupId} onDone={() => setImporting(false)} />}

      {enemies.length === 0 ? (
        <EmptyState
          title="Aún no hay enemigos en este grupo."
          description={isMaster ? "Crea uno rápido o importa un .md de Foundry." : undefined}
        />
      ) : (
        <ul className="space-y-2">
          {enemies.map((item) => {
            const { id: enemyId, name, portraitUrl } = item.enemy;
            return (
              <li key={enemyId} className="rounded-sm border border-rule bg-parchment-panel p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <PortraitCircle url={portraitUrl} name={name} size={48} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-ink">{name}</p>
                    {item.access === "FULL" && (
                      <p className="truncate text-sm text-ink-muted">
                        PG {item.enemy.maxHp} · CA {item.enemy.armorClass ?? "—"} · Iniciativa{" "}
                        {item.enemy.initiativeBonus >= 0 ? "+" : ""}
                        {item.enemy.initiativeBonus}
                      </p>
                    )}
                  </div>
                  {isMaster && item.access === "FULL" && (
                    <div className="flex w-full flex-wrap gap-2 sm:w-auto">
                      <Button
                        variant="ghost"
                        onClick={() => setEditingId(editingId === enemyId ? null : enemyId)}
                      >
                        {editingId === enemyId ? "Cerrar" : "Editar"}
                      </Button>
                      <Button
                        variant="danger"
                        onClick={() => setDeletingId(deletingId === enemyId ? null : enemyId)}
                      >
                        Borrar
                      </Button>
                    </div>
                  )}
                </div>
                {editingId === enemyId && item.access === "FULL" && (
                  <EditEnemyPanel
                    groupId={groupId}
                    enemy={item.enemy}
                    onDone={() => setEditingId(null)}
                  />
                )}
                {deletingId === enemyId && (
                  <DeleteEnemyConfirm
                    groupId={groupId}
                    enemyId={enemyId}
                    enemyName={name}
                    onDone={() => setDeletingId(null)}
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function QuickAttackFields({
  register,
  fields,
  append,
  remove,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  register: any;
  fields: { id: string }[];
  append: (v: { name: string; attackFormula: string; damageFormula: string | null }) => void;
  remove: (index: number) => void;
}) {
  return (
    <div className="mb-4">
      <p className="mb-1 text-sm text-ink-muted">Ataques</p>
      <div className="space-y-2">
        {fields.map((field, index) => (
          <div key={field.id} className="flex flex-wrap items-end gap-2">
            <TextField
              label="Nombre"
              hideLabel
              placeholder="Nombre"
              wrapperClassName="mb-0 flex-1 min-w-[8rem]"
              {...register(`quickAttacks.${index}.name` as const)}
            />
            <TextField
              label="Ataque"
              hideLabel
              placeholder="1d20+4"
              wrapperClassName="mb-0 w-24"
              {...register(`quickAttacks.${index}.attackFormula` as const)}
            />
            <TextField
              label="Daño"
              hideLabel
              placeholder="1d8+2"
              wrapperClassName="mb-0 w-24"
              {...register(`quickAttacks.${index}.damageFormula` as const)}
            />
            <Button variant="danger" onClick={() => remove(index)}>
              ×
            </Button>
          </div>
        ))}
      </div>
      <Button
        variant="ghost"
        className="mt-2"
        onClick={() => append({ name: "", attackFormula: "1d20", damageFormula: "" })}
      >
        + Añadir ataque
      </Button>
    </div>
  );
}

function QuickCreateForm({ groupId, onDone }: { groupId: string; onDone: () => void }) {
  const createEnemy = useCreateEnemy(groupId);
  const toast = useToast();
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<CreateEnemyInput>({
    resolver: zodResolver(createEnemySchema),
    defaultValues: EMPTY_ENEMY,
  });
  const { fields, append, remove } = useFieldArray({ control, name: "quickAttacks" });

  function onSubmit(values: CreateEnemyInput) {
    createEnemy.mutate(
      {
        ...values,
        armorClass: values.armorClass || undefined,
        quickAttacks: values.quickAttacks.map((a) => ({
          ...a,
          damageFormula: a.damageFormula || null,
        })),
      },
      {
        onSuccess: () => {
          toast.success("Enemigo creado.");
          onDone();
        },
        onError: (err) => toast.error(toErrorMessage(err, "No se pudo crear el enemigo.")),
      },
    );
  }

  return (
    <Card as="form" onSubmit={handleSubmit(onSubmit)} noValidate className="mb-4">
      <TextField label="Nombre" error={errors.name?.message} {...register("name")} />
      <div className="grid grid-cols-3 gap-3">
        <TextField
          label="PG máximos"
          type="number"
          error={errors.maxHp?.message}
          {...register("maxHp", { valueAsNumber: true })}
        />
        <TextField
          label="CA"
          type="number"
          error={errors.armorClass?.message}
          {...register("armorClass", { valueAsNumber: true })}
        />
        <TextField
          label="Bono iniciativa"
          type="number"
          error={errors.initiativeBonus?.message}
          {...register("initiativeBonus", { valueAsNumber: true })}
        />
      </div>
      <QuickAttackFields register={register} fields={fields} append={append} remove={remove} />
      <Button type="submit" isLoading={createEnemy.isPending} loadingText="Creando...">
        Crear
      </Button>
    </Card>
  );
}

function ImportEnemyForm({ groupId, onDone }: { groupId: string; onDone: () => void }) {
  const importEnemy = useImportEnemy(groupId);
  const toast = useToast();
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ImportEnemyInput>({
    resolver: zodResolver(importEnemySchema),
    defaultValues: { md: "" },
  });

  function onSubmit(values: ImportEnemyInput) {
    importEnemy.mutate(values, {
      onSuccess: () => {
        toast.success("Enemigo importado.");
        onDone();
      },
      onError: (err) => toast.error(toErrorMessage(err, "No se pudo importar el enemigo.")),
    });
  }

  return (
    <Card as="form" onSubmit={handleSubmit(onSubmit)} noValidate className="mb-4">
      <FileDropTextArea
        label="Contenido del .md (export Foundry)"
        rows={6}
        className="font-mono text-xs"
        placeholder={"---\ntitle: ...\n```Actor\n...\n```"}
        error={errors.md?.message}
        onFileDrop={(text) => setValue("md", text, { shouldValidate: true })}
        {...register("md")}
      />
      <Button type="submit" isLoading={importEnemy.isPending} loadingText="Importando...">
        Importar
      </Button>
    </Card>
  );
}

function EditEnemyPanel({
  groupId,
  enemy,
  onDone,
}: {
  groupId: string;
  enemy: EnemyFull;
  onDone: () => void;
}) {
  const updateEnemy = useUpdateEnemy(groupId, enemy.id);
  const importMd = useImportEnemyMd(groupId, enemy.id);
  const { data: images } = useEnemyImages(groupId, enemy.id);
  const uploadImage = useUploadEnemyImage(groupId, enemy.id);
  const deleteImage = useDeleteEnemyImage(groupId, enemy.id);
  const toast = useToast();
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<CreateEnemyInput>({
    resolver: zodResolver(createEnemySchema),
    defaultValues: {
      name: enemy.name,
      maxHp: enemy.maxHp,
      armorClass: enemy.armorClass ?? undefined,
      initiativeBonus: enemy.initiativeBonus,
      quickAttacks: enemy.quickAttacks ?? [],
    },
  });
  const { fields, append, remove } = useFieldArray({ control, name: "quickAttacks" });
  const {
    register: registerMd,
    handleSubmit: handleSubmitMd,
    setValue: setMdValue,
    formState: { errors: mdErrors },
  } = useForm<ImportEnemyMdInput>({
    resolver: zodResolver(importEnemyMdSchema),
    defaultValues: { md: "" },
  });

  function onSubmit(values: CreateEnemyInput) {
    updateEnemy.mutate(
      {
        ...values,
        armorClass: values.armorClass || undefined,
        quickAttacks: values.quickAttacks.map((a) => ({
          ...a,
          damageFormula: a.damageFormula || null,
        })),
      },
      {
        onSuccess: () => toast.success("Enemigo actualizado."),
        onError: (err) => toast.error(toErrorMessage(err, "No se pudo actualizar el enemigo.")),
      },
    );
  }

  function onSubmitMd(values: ImportEnemyMdInput) {
    importMd.mutate(values, {
      onSuccess: () => toast.success("Enemigo actualizado desde el .md."),
      onError: (err) => toast.error(toErrorMessage(err, "No se pudo actualizar el enemigo.")),
    });
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadImage.mutate(file, {
      onError: (err) => toast.error(toErrorMessage(err, "No se pudo subir la imagen.")),
    });
    e.target.value = "";
  }

  return (
    <div className="mt-3 space-y-4 border-t border-rule pt-3">
      <div>
        <p className="mb-1 text-sm text-ink-muted">Imágenes</p>
        <div className="flex flex-wrap items-center gap-2">
          {images?.map((img) => (
            <div key={img.id} className="relative">
              <img src={img.url} alt="" className="h-14 w-14 rounded-sm object-cover" />
              <button
                type="button"
                onClick={() => deleteImage.mutate(img.id)}
                aria-label="Borrar imagen"
                className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-oxblood text-xs text-ivory"
              >
                ×
              </button>
            </div>
          ))}
          <label className="flex h-14 w-14 cursor-pointer items-center justify-center rounded-sm border border-dashed border-rule-strong text-xl text-ink-muted hover:bg-parchment-deep">
            +<input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          </label>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <TextField label="Nombre" error={errors.name?.message} {...register("name")} />
        <div className="grid grid-cols-3 gap-3">
          <TextField
            label="PG máximos"
            type="number"
            error={errors.maxHp?.message}
            {...register("maxHp", { valueAsNumber: true })}
          />
          <TextField
            label="CA"
            type="number"
            error={errors.armorClass?.message}
            {...register("armorClass", { valueAsNumber: true })}
          />
          <TextField
            label="Bono iniciativa"
            type="number"
            error={errors.initiativeBonus?.message}
            {...register("initiativeBonus", { valueAsNumber: true })}
          />
        </div>
        <QuickAttackFields register={register} fields={fields} append={append} remove={remove} />
        <Button type="submit" isLoading={updateEnemy.isPending} loadingText="Guardando...">
          Guardar cambios
        </Button>
      </form>

      <form onSubmit={handleSubmitMd(onSubmitMd)} noValidate className="border-t border-rule pt-3">
        <FileDropTextArea
          label="Actualizar desde .md"
          rows={4}
          className="font-mono text-xs"
          placeholder="Pega el nuevo contenido del .md"
          error={mdErrors.md?.message}
          onFileDrop={(text) => setMdValue("md", text, { shouldValidate: true })}
          {...registerMd("md")}
        />
        <Button type="submit" isLoading={importMd.isPending} loadingText="Actualizando...">
          Actualizar desde .md
        </Button>
      </form>

      <Button variant="ghost" onClick={onDone}>
        Cerrar
      </Button>
    </div>
  );
}

function DeleteEnemyConfirm({
  groupId,
  enemyId,
  enemyName,
  onDone,
}: {
  groupId: string;
  enemyId: string;
  enemyName: string;
  onDone: () => void;
}) {
  const deleteEnemy = useDeleteEnemy(groupId);
  const toast = useToast();

  function handleConfirm() {
    deleteEnemy.mutate(enemyId, {
      onSuccess: () => {
        toast.success(`${enemyName} borrado.`);
        onDone();
      },
      onError: (err) => toast.error(toErrorMessage(err, "No se pudo borrar el enemigo.")),
    });
  }

  return (
    <ConfirmPanel
      message={`Esto borra a ${enemyName} por completo, junto con sus imágenes. No se puede deshacer.`}
      confirmLabel="Confirmar borrado"
      loadingText="Borrando..."
      isLoading={deleteEnemy.isPending}
      onConfirm={handleConfirm}
      onCancel={onDone}
    />
  );
}
