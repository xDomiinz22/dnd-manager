import { useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  TransformComponent,
  TransformWrapper,
  useControls,
  useTransformComponent,
} from "react-zoom-pan-pinch";
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
import { resizeImageForUpload } from "../lib/imageResize";
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
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  // Tamaño real del mapa, para que el hueco se ajuste a su proporción en vez
  // de ser una caja genérica a ancho completo — se conoce solo tras cargar
  // la imagen, así que hasta entonces se usa una altura fija de reserva.
  const [imgNatural, setImgNatural] = useState<{ w: number; h: number } | null>(null);

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

  async function handleUploadFile(file: File) {
    let toUpload = file;
    try {
      // Vercel rechaza peticiones a funciones serverless por encima de
      // ~4.5MB (límite de plataforma, no configurable) antes de que nuestro
      // código las vea — se reescala/comprime aquí para no toparse con eso.
      toUpload = await resizeImageForUpload(file);
    } catch {
      // Si el redimensionado falla por lo que sea, se intenta con el original.
    }
    uploadMap.mutate(toUpload, {
      onSuccess: () => toast.success(map ? "Mapa actualizado." : "Mapa subido."),
      onError: (err) => toast.error(toErrorMessage(err, "No se pudo subir el mapa.")),
    });
  }

  // El mapa ahora se puede arrastrar/ampliar (ver TransformWrapper más abajo),
  // así que un click ya no reemplaza la imagen — para eso está el botón
  // "Actualizar mapa" (o soltar un archivo encima). Solo sirve para situar
  // un pin nuevo, o para cerrar el popup de un pin abierto.
  function handleMapClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!isMaster) return;
    if (isAddPinMode) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      setAddingPinAt({ x, y });
      setSelectedPinId(null);
      return;
    }
    if (selectedPinId) {
      setSelectedPinId(null);
    }
  }

  function handleToggleAddPinMode() {
    setIsAddPinMode((v) => !v);
    setAddingPinAt(null);
    setSelectedPinId(null);
  }

  function handleDragOver(e: React.DragEvent) {
    if (!isMaster) return;
    e.preventDefault();
    setIsDraggingFile(true);
  }

  function handleDragLeave() {
    setIsDraggingFile(false);
  }

  function handleDrop(e: React.DragEvent) {
    if (!isMaster) return;
    e.preventDefault();
    setIsDraggingFile(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleUploadFile(file);
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <ChapterHeading
        action={
          <Link
            to={`/groups/${groupId}`}
            className="rounded-sm border border-rule px-3 py-1.5 text-ink transition-colors hover:border-rule-strong hover:bg-parchment-deep hover:text-ink"
          >
            Volver al grupo
          </Link>
        }
      >
        Mapa — {group.name}
      </ChapterHeading>

      {isMaster && (
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
      )}

      {isMaster && map && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            isLoading={uploadMap.isPending}
            loadingText="Subiendo..."
            onClick={() => fileInputRef.current?.click()}
          >
            Actualizar mapa
          </Button>
          <Button variant={isAddPinMode ? "danger" : "ghost"} onClick={handleToggleAddPinMode}>
            {isAddPinMode ? "Cancelar pin" : "Añadir pin"}
          </Button>
        </div>
      )}

      {!map ? (
        isMaster ? (
          <div
            role="button"
            tabIndex={0}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click();
            }}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`cursor-pointer rounded-sm border border-dashed px-6 py-10 text-center transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-oxblood ${
              isDraggingFile
                ? "border-oxblood bg-parchment-deep/40"
                : "border-rule-strong hover:bg-parchment-deep/40"
            }`}
          >
            <p className="text-ink">Este grupo todavía no tiene un mapa.</p>
            <p className="mt-1 text-sm text-ink-muted">
              {uploadMap.isPending
                ? "Subiendo..."
                : "Haz click aquí o arrastra una imagen para subirla (se convierte a webp automáticamente)."}
            </p>
          </div>
        ) : (
          <EmptyState
            title="Este grupo todavía no tiene un mapa."
            description="El Master aún no ha subido el mapa del grupo."
          />
        )
      ) : (
        <>
          {isMaster && (
            <p className="mb-2 text-sm text-ink-muted">
              {isAddPinMode
                ? "Haz click en el mapa para situar el pin, luego rellena los datos."
                : "Arrastra para mover el mapa, usa la rueda o pellizca para ampliar. Suelta una imagen encima para reemplazarlo."}
            </p>
          )}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            style={
              imgNatural
                ? { aspectRatio: `${imgNatural.w} / ${imgNatural.h}`, maxHeight: "70vh" }
                : undefined
            }
            className={`relative mx-auto max-w-full select-none overflow-hidden rounded-sm border transition-colors ${
              imgNatural ? "w-fit" : "h-[60vh] w-full sm:h-[70vh]"
            } ${isDraggingFile ? "border-oxblood" : "border-rule-strong"}`}
          >
            <TransformWrapper
              initialScale={1}
              minScale={1}
              maxScale={6}
              centerOnInit
              limitToBounds
              doubleClick={{ mode: "toggle" }}
              disabled={isAddPinMode}
            >
              <MapZoomControls />
              <TransformComponent
                wrapperClass="!h-full !w-full"
                contentClass={isAddPinMode ? "!cursor-crosshair" : ""}
              >
                <div
                  role="presentation"
                  onClick={handleMapClick}
                  className="relative h-full w-full"
                >
                  <img
                    src={map.imageUrl}
                    alt="Mapa del grupo"
                    className="block h-full w-full"
                    draggable={false}
                    onLoad={(e) =>
                      setImgNatural({
                        w: e.currentTarget.naturalWidth,
                        h: e.currentTarget.naturalHeight,
                      })
                    }
                  />
                  {map.pins.map((pin) => (
                    <div
                      key={pin.id}
                      style={{ left: `${pin.x * 100}%`, top: `${pin.y * 100}%` }}
                      className="absolute z-10"
                    >
                      <FixedScale>
                        <button
                          type="button"
                          aria-label={pin.title}
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsAddPinMode(false);
                            setAddingPinAt(null);
                            setSelectedPinId(selectedPinId === pin.id ? null : pin.id);
                          }}
                          className="h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-parchment bg-oxblood shadow-md transition-transform hover:scale-125 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-oxblood"
                        />
                      </FixedScale>
                    </div>
                  ))}
                  {addingPinAt && !selectedPin && (
                    <div
                      style={{ left: `${addingPinAt.x * 100}%`, top: `${addingPinAt.y * 100}%` }}
                      className="pointer-events-none absolute z-10"
                    >
                      <FixedScale>
                        <div className="h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-oxblood bg-parchment" />
                      </FixedScale>
                    </div>
                  )}
                  {selectedPin && editingPinId !== selectedPin.id && (
                    <div
                      style={{ left: `${selectedPin.x * 100}%`, top: `${selectedPin.y * 100}%` }}
                      className="absolute z-20"
                    >
                      <FixedScale>
                        <div
                          className="-translate-x-1/2 -translate-y-[calc(100%+14px)]"
                          onClick={(e) => e.stopPropagation()}
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
                      </FixedScale>
                    </div>
                  )}
                </div>
              </TransformComponent>
            </TransformWrapper>
            {(isDraggingFile || uploadMap.isPending) && (
              <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center bg-ink/50 text-center font-display text-lg tracking-wide text-parchment">
                {uploadMap.isPending ? "Subiendo..." : "Suelta la imagen para reemplazar el mapa"}
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

const ZOOM_BUTTON_CLASSES =
  "flex h-8 w-8 items-center justify-center rounded-sm border border-rule-strong bg-parchment-panel leading-none text-ink shadow-[0_2px_8px_-2px_rgba(0,0,0,0.3)] hover:bg-parchment-deep focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-oxblood";

/**
 * Sustituye a `KeepScale` de la librería: esta contra-escala un hijo para
 * que mantenga un tamaño de pantalla constante pese al zoom del mapa, pero
 * solo actualiza su transform dentro de `instance.onChange(...)` — nunca al
 * montarse. Un pin o el popup de un pin que se monta mientras el mapa ya
 * está ampliado sale enorme (sin contra-escalar) hasta el siguiente
 * pellizco/scroll que dispare ese evento. `useTransformComponent` sí calcula
 * el valor inicial de forma síncrona en el primer render, así que no tiene
 * ese hueco.
 */
function FixedScale({ children }: { children: React.ReactNode }) {
  const scale = useTransformComponent(({ state }) => state.scale);
  // transformOrigin: "0 0" es la clave — sin esto, el contra-escalado pivota
  // sobre el CENTRO de esta caja, que a su vez está Z veces más lejos del
  // punto de anclaje real (el propio div, antes de contra-escalar, ya viene
  // Z veces más grande/lejos por el zoom del mapa) — con zoom alto, el
  // resultado se desplazaba cientos de píxeles del pin. Con el origen en la
  // esquina superior izquierda (que sí coincide con el punto de anclaje real,
  // fijado por left/top% en el div padre), el contra-escalado se queda fijo
  // ahí y cualquier translate posterior (centrado, "flotar encima"...) opera
  // ya en píxeles reales correctos.
  return <div style={{ transform: `scale(${1 / scale})`, transformOrigin: "0 0" }}>{children}</div>;
}

/**
 * Controles de zoom (+/−/restablecer) superpuestos al mapa. Van en su propio
 * componente porque necesitan `useControls()`, que lee del contexto de
 * TransformWrapper — usado así (hook en un hijo) en vez de la función
 * render-prop de `children`, cuyos zoomIn/zoomOut/resetTransform resultaron
 * no estar realmente conectados a la instancia activa en esta versión de la
 * librería (verificado: la rueda del ratón sí funciona, esos closures no).
 */
function MapZoomControls() {
  const { zoomIn, zoomOut, resetTransform } = useControls();
  return (
    <div className="absolute right-2 top-2 z-30 flex flex-col gap-1">
      <button
        type="button"
        onClick={() => zoomIn()}
        aria-label="Ampliar"
        className={`${ZOOM_BUTTON_CLASSES} text-lg`}
      >
        +
      </button>
      <button
        type="button"
        onClick={() => zoomOut()}
        aria-label="Reducir"
        className={`${ZOOM_BUTTON_CLASSES} text-lg`}
      >
        −
      </button>
      <button
        type="button"
        onClick={() => resetTransform()}
        aria-label="Restablecer vista"
        title="Restablecer vista"
        className={`${ZOOM_BUTTON_CLASSES} text-xs`}
      >
        ⤾
      </button>
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
          className="shrink-0 text-ink-muted hover:text-ink"
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
