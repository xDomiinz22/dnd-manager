import { useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createMapPinSchema,
  type CreateMapPinInput,
  type JournalTreeNode,
  type MapPin,
  type UpdateMapPinInput,
} from "@dnd-manager/shared";
import { useGroupDetail } from "../features/groups/hooks";
import { useGroupJournal } from "../features/journal/hooks";
import {
  useCreateMapPin,
  useDeleteMapPin,
  useGroupMap,
  useUpdateMapPin,
  useUploadGroupMap,
} from "../features/map/hooks";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { TextField } from "../components/ui/TextField";
import { SelectField } from "../components/ui/SelectField";
import { EmptyState } from "../components/ui/EmptyState";
import { ChapterHeading } from "../components/ui/ChapterHeading";
import { ConfirmPanel } from "../components/ui/ConfirmPanel";
import { SkeletonPage } from "../components/ui/Skeleton";
import { toErrorMessage, useToast } from "../components/ui/Toast";

function flattenJournalPages(nodes: JournalTreeNode[], depth = 0): { id: string; label: string }[] {
  return nodes.flatMap((node) => [
    { id: node.id, label: `${"— ".repeat(depth)}${node.title}` },
    ...flattenJournalPages(node.children, depth + 1),
  ]);
}

export function GroupMapPage() {
  const { id: groupId } = useParams<{ id: string }>();
  const toast = useToast();
  const { data: group, isLoading: isLoadingGroup } = useGroupDetail(groupId!);
  const { data: map, isLoading: isLoadingMap } = useGroupMap(groupId!);
  const { data: journal } = useGroupJournal(groupId!);
  const uploadMap = useUploadGroupMap(groupId!);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isAddPinMode, setIsAddPinMode] = useState(false);
  const [addingPinAt, setAddingPinAt] = useState<{ x: number; y: number } | null>(null);
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
  const [editingPinId, setEditingPinId] = useState<string | null>(null);
  const [deletingPinId, setDeletingPinId] = useState<string | null>(null);

  if (isLoadingGroup || isLoadingMap || !group) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-10">
        <SkeletonPage rows={4} />
      </div>
    );
  }

  const isMaster = group.role === "MASTER";
  const journalPages = flattenJournalPages(journal?.pages ?? []);
  const selectedPin = map?.pins.find((p) => p.id === selectedPinId) ?? null;

  function handleUploadFile(file: File) {
    uploadMap.mutate(file, {
      onSuccess: () => toast.success(map ? "Mapa actualizado." : "Mapa subido."),
      onError: (err) => toast.error(toErrorMessage(err, "No se pudo subir el mapa.")),
    });
  }

  function handleMapClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!isMaster || !isAddPinMode) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setAddingPinAt({ x, y });
    setSelectedPinId(null);
  }

  function handleToggleAddPinMode() {
    setIsAddPinMode((v) => !v);
    setAddingPinAt(null);
    setSelectedPinId(null);
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <ChapterHeading
        action={
          <Link
            to={`/groups/${groupId}`}
            className="rounded-sm border border-rule px-3 py-1.5 text-ink transition-colors hover:border-oxblood hover:bg-oxblood hover:text-parchment"
          >
            Volver al grupo
          </Link>
        }
      >
        Mapa — {group.name}
      </ChapterHeading>

      {isMaster && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleUploadFile(file);
              e.target.value = "";
            }}
          />
          <Button
            variant="secondary"
            isLoading={uploadMap.isPending}
            loadingText="Subiendo..."
            onClick={() => fileInputRef.current?.click()}
          >
            {map ? "Reemplazar mapa" : "Subir mapa"}
          </Button>
          {map && (
            <Button variant={isAddPinMode ? "danger" : "ghost"} onClick={handleToggleAddPinMode}>
              {isAddPinMode ? "Cancelar pin" : "Añadir pin"}
            </Button>
          )}
        </div>
      )}

      {!map ? (
        <EmptyState
          title="Este grupo todavía no tiene un mapa."
          description={
            isMaster
              ? "Sube la imagen del mapa (se convierte a webp automáticamente)."
              : "El Master aún no ha subido el mapa del grupo."
          }
        />
      ) : (
        <>
          {isAddPinMode && (
            <p className="mb-2 text-sm text-ink-muted">
              Haz click en el mapa para situar el pin, luego rellena los datos.
            </p>
          )}
          <div
            role="presentation"
            onClick={handleMapClick}
            className={`relative w-full select-none overflow-hidden rounded-sm border border-rule-strong ${
              isAddPinMode ? "cursor-crosshair" : ""
            }`}
          >
            <img
              src={map.imageUrl}
              alt="Mapa del grupo"
              className="block w-full"
              draggable={false}
            />
            {map.pins.map((pin) => (
              <button
                key={pin.id}
                type="button"
                aria-label={pin.title}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsAddPinMode(false);
                  setAddingPinAt(null);
                  setSelectedPinId(selectedPinId === pin.id ? null : pin.id);
                }}
                style={{ left: `${pin.x * 100}%`, top: `${pin.y * 100}%` }}
                className="absolute z-10 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-parchment bg-oxblood shadow-md transition-transform hover:scale-125 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-oxblood"
              />
            ))}
            {addingPinAt && !selectedPin && (
              <div
                style={{ left: `${addingPinAt.x * 100}%`, top: `${addingPinAt.y * 100}%` }}
                className="pointer-events-none absolute z-10 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-oxblood bg-parchment"
              />
            )}
            {selectedPin && editingPinId !== selectedPin.id && (
              <div
                role="presentation"
                onClick={(e) => e.stopPropagation()}
                style={{ left: `${selectedPin.x * 100}%`, top: `${selectedPin.y * 100}%` }}
                className="absolute z-20 -translate-x-1/2 -translate-y-[calc(100%+14px)]"
              >
                <PinPopup
                  pin={selectedPin}
                  groupId={groupId!}
                  isMaster={isMaster}
                  onClose={() => setSelectedPinId(null)}
                  onEdit={() => setEditingPinId(selectedPin.id)}
                  onDelete={() => setDeletingPinId(selectedPin.id)}
                  deleteConfirming={deletingPinId === selectedPin.id}
                  onCancelDelete={() => setDeletingPinId(null)}
                  onDeleted={() => {
                    setDeletingPinId(null);
                    setSelectedPinId(null);
                  }}
                />
              </div>
            )}
          </div>

          {selectedPin && editingPinId === selectedPin.id && (
            <PinForm
              groupId={groupId!}
              journalPages={journalPages}
              initial={selectedPin}
              onDone={() => {
                setEditingPinId(null);
              }}
              onCancel={() => setEditingPinId(null)}
            />
          )}

          {addingPinAt && isMaster && !selectedPin && (
            <PinForm
              key={`${addingPinAt.x}-${addingPinAt.y}`}
              groupId={groupId!}
              journalPages={journalPages}
              position={addingPinAt}
              onDone={() => {
                setIsAddPinMode(false);
                setAddingPinAt(null);
              }}
              onCancel={() => {
                setIsAddPinMode(false);
                setAddingPinAt(null);
              }}
            />
          )}
        </>
      )}
    </div>
  );
}

function PinPopup({
  pin,
  groupId,
  isMaster,
  onClose,
  onEdit,
  onDelete,
  deleteConfirming,
  onCancelDelete,
  onDeleted,
}: {
  pin: MapPin;
  groupId: string;
  isMaster: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  deleteConfirming: boolean;
  onCancelDelete: () => void;
  onDeleted: () => void;
}) {
  const toast = useToast();
  const deletePin = useDeleteMapPin(groupId);

  function handleConfirmDelete() {
    deletePin.mutate(pin.id, {
      onSuccess: () => {
        toast.success("Pin borrado.");
        onDeleted();
      },
      onError: (err) => toast.error(toErrorMessage(err, "No se pudo borrar el pin.")),
    });
  }

  return (
    <Card className="w-56 !p-3 text-left shadow-xl">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-display text-sm tracking-wide text-oxblood">{pin.title}</h3>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="shrink-0 text-ink-muted hover:text-oxblood"
        >
          ×
        </button>
      </div>
      {pin.journalPageId && (
        <Link
          to={`/groups/${groupId}/journal/${pin.journalPageId}`}
          className="mt-1 block text-sm text-oxblood underline underline-offset-2 hover:text-oxblood-dark"
        >
          Leer más en el diario →
        </Link>
      )}
      {isMaster && (
        <div className="mt-2 flex gap-2 border-t border-rule pt-2">
          <Button variant="ghost" onClick={onEdit}>
            Editar
          </Button>
          <Button variant="danger" onClick={onDelete}>
            Borrar
          </Button>
        </div>
      )}
      {deleteConfirming && (
        <ConfirmPanel
          message={`Vas a borrar el pin "${pin.title}" del mapa. No se puede deshacer.`}
          confirmLabel="Confirmar borrado"
          loadingText="Borrando..."
          isLoading={deletePin.isPending}
          onConfirm={handleConfirmDelete}
          onCancel={onCancelDelete}
        />
      )}
    </Card>
  );
}

function PinForm({
  groupId,
  journalPages,
  position,
  initial,
  onDone,
  onCancel,
}: {
  groupId: string;
  journalPages: { id: string; label: string }[];
  position?: { x: number; y: number };
  initial?: MapPin;
  onDone: () => void;
  onCancel: () => void;
}) {
  const toast = useToast();
  const createPin = useCreateMapPin(groupId);
  const updatePin = useUpdateMapPin(groupId);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateMapPinInput>({
    resolver: zodResolver(createMapPinSchema),
    defaultValues: {
      x: initial?.x ?? position?.x ?? 0.5,
      y: initial?.y ?? position?.y ?? 0.5,
      title: initial?.title ?? "",
      journalPageId: initial?.journalPageId ?? "",
    },
  });

  function onSubmit(values: CreateMapPinInput) {
    const input = { ...values, journalPageId: values.journalPageId || null };
    if (initial) {
      const update: UpdateMapPinInput = input;
      updatePin.mutate(
        { pinId: initial.id, input: update },
        {
          onSuccess: () => {
            toast.success("Pin actualizado.");
            onDone();
          },
          onError: (err) => toast.error(toErrorMessage(err, "No se pudo actualizar el pin.")),
        },
      );
      return;
    }
    createPin.mutate(input, {
      onSuccess: () => {
        toast.success("Pin creado.");
        onDone();
      },
      onError: (err) => toast.error(toErrorMessage(err, "No se pudo crear el pin.")),
    });
  }

  const isPending = createPin.isPending || updatePin.isPending;

  return (
    <Card as="form" onSubmit={handleSubmit(onSubmit)} noValidate className="mt-4">
      <TextField label="Título" error={errors.title?.message} {...register("title")} />
      <SelectField label="Enlazar a página del diario (opcional)" {...register("journalPageId")}>
        <option value="">Ninguna</option>
        {journalPages.map((p) => (
          <option key={p.id} value={p.id}>
            {p.label}
          </option>
        ))}
      </SelectField>
      <div className="flex gap-2">
        <Button type="submit" isLoading={isPending} loadingText="Guardando...">
          {initial ? "Guardar cambios" : "Crear pin"}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel} disabled={isPending}>
          Cancelar
        </Button>
      </div>
    </Card>
  );
}
