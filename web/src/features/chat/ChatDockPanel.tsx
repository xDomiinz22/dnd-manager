import { useEffect, useRef, useState } from "react";
import type { ChatMessageDto } from "@dnd-manager/shared";
import { useAuth } from "../../context/AuthContext";
import { useGroupDetail } from "../groups/hooks";
import {
  useChatMessages,
  useChatSession,
  useEndSession,
  useSendChatMessage,
  useStartSession,
} from "./hooks";
import { useCurrentGroupId } from "./useCurrentGroupId";
import { CharacterRollMenu } from "./CharacterRollMenu";
import { AnimatedRollValue } from "../dice/AnimatedRollValue";
import { Button } from "../../components/ui/Button";
import { TextField } from "../../components/ui/TextField";
import { ConfirmPanel } from "../../components/ui/ConfirmPanel";
import { toErrorMessage, useToast } from "../../components/ui/Toast";

const COLLAPSED_STORAGE_KEY = "chatDock.collapsed";
// Marcas diacríticas combinantes (acentos sueltos tras normalize("NFD")).
const DIACRITICS_REGEX = /[̀-ͯ]/g;

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .normalize("NFD")
      .replace(DIACRITICS_REGEX, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "grupo"
  );
}

function buildChatDownloadText(
  groupName: string,
  session: { startedAt: string },
  messages: ChatMessageDto[],
): string {
  const lines = [
    `Chat — ${groupName}`,
    `Sesión iniciada: ${new Date(session.startedAt).toLocaleString()}`,
    `Exportado: ${new Date().toLocaleString()}`,
    "",
  ];
  if (messages.length === 0) {
    lines.push("(Sin mensajes)");
  }
  for (const m of messages) {
    const time = formatTime(m.createdAt);
    if (m.kind === "ROLL" && m.roll) {
      lines.push(
        `[${time}] ${m.roll.characterName ?? m.username} — ${m.roll.label}: ${m.roll.formula} = ${m.roll.total}`,
      );
    } else {
      lines.push(`[${time}] ${m.username}: ${m.text ?? ""}`);
    }
  }
  return lines.join("\n");
}

/** Descarga el chat como .txt plano — nada de librerías, un Blob y un enlace efímero basta. */
function downloadChatAsText(
  groupName: string,
  session: { startedAt: string },
  messages: ChatMessageDto[],
) {
  const text = buildChatDownloadText(groupName, session, messages);
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const stamp = new Date().toISOString().slice(0, 16).replace(/[-:]/g, "").replace("T", "_");
  const a = document.createElement("a");
  a.href = url;
  a.download = `chat-${slugify(groupName)}-${stamp}.txt`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function ChatIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className={className}
    >
      <path
        d="M3 5.5A1.5 1.5 0 0 1 4.5 4h11A1.5 1.5 0 0 1 17 5.5v6A1.5 1.5 0 0 1 15.5 13H10l-3.5 3v-3H4.5A1.5 1.5 0 0 1 3 11.5v-6Z"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type PanelView = "chat" | "roll";

/**
 * Chat acoplado a modo del reproductor de música: en escritorio, panel fijo
 * a la derecha, abierto por defecto (se puede plegar y lo recuerda en
 * localStorage); en móvil, un botón flotante que abre una hoja inferior.
 * Solo se muestra dentro de las páginas de un grupo concreto (ver
 * useCurrentGroupId) — al no haber websockets, que esté montado en todas
 * esas páginas (no solo en una página de chat dedicada) es lo que hace que
 * una sesión iniciada por el Master "aparezca" para los demás: la sigue
 * habiendo con el mismo polling de 3s de useChatSession, dondequiera que
 * estén dentro del grupo.
 *
 * En escritorio, los z-index (20/25) se mantienen por debajo de los del
 * lanzador de cola de reproducción (30/40, ver TempQueueLauncher) para que
 * ese control siga siendo alcanzable por encima del panel de chat cuando
 * ambos coinciden. En móvil, el FAB de chat ocupa la esquina inferior
 * derecha "base"; el de la cola (si aparece) se apila encima del suyo, y
 * abrir una de las dos hojas cierra la otra (estado controlado desde
 * AppLayout) para que nunca queden ambas "abiertas" tapándose entre sí.
 */
interface ChatDockPanelProps {
  mobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
}

export function ChatDockPanel({ mobileOpen, onMobileOpenChange }: ChatDockPanelProps) {
  const groupId = useCurrentGroupId();
  const gid = groupId ?? "";
  const { user } = useAuth();

  const { data: group } = useGroupDetail(gid);
  const { data: session } = useChatSession(gid);
  const { data: messages } = useChatMessages(gid, { enabled: !!groupId && !!session });
  const startSession = useStartSession(gid);
  const endSession = useEndSession(gid);
  const sendMessage = useSendChatMessage(gid);
  const toast = useToast();

  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(COLLAPSED_STORAGE_KEY) === "1";
  });
  const [text, setText] = useState("");
  const [confirmingEnd, setConfirmingEnd] = useState(false);
  const [view, setView] = useState<PanelView>("chat");

  useEffect(() => {
    window.localStorage.setItem(COLLAPSED_STORAGE_KEY, collapsed ? "1" : "0");
  }, [collapsed]);

  if (!groupId || !group) return null;

  const isMaster = group.role === "MASTER";

  function handleStart() {
    startSession.mutate(undefined, {
      onError: (err) => toast.error(toErrorMessage(err, "No se pudo iniciar la sesión.")),
    });
  }

  function handleConfirmEnd() {
    endSession.mutate(undefined, {
      onSuccess: () => {
        toast.success("Sesión finalizada. El chat se ha borrado.");
        setConfirmingEnd(false);
        setView("chat");
      },
      onError: (err) => toast.error(toErrorMessage(err, "No se pudo finalizar la sesión.")),
    });
  }

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    sendMessage.mutate(
      { text: trimmed },
      {
        onSuccess: () => setText(""),
        onError: (err) => toast.error(toErrorMessage(err, "No se pudo enviar el mensaje.")),
      },
    );
  }

  function handleDownload() {
    if (!session) return;
    downloadChatAsText(group!.name, session, messages ?? []);
  }

  const content =
    view === "roll" && session ? (
      <CharacterRollMenu
        characters={group.characters}
        currentUserId={user?.id ?? ""}
        isMaster={isMaster}
        onClose={() => setView("chat")}
      />
    ) : (
      <ChatPanelContent
        isMaster={isMaster}
        session={session ?? null}
        messages={messages}
        text={text}
        onTextChange={setText}
        onSend={handleSend}
        isSending={sendMessage.isPending}
        onStart={handleStart}
        isStarting={startSession.isPending}
        confirmingEnd={confirmingEnd}
        onToggleConfirmEnd={() => setConfirmingEnd((v) => !v)}
        onConfirmEnd={handleConfirmEnd}
        onCancelConfirmEnd={() => setConfirmingEnd(false)}
        isEnding={endSession.isPending}
        onOpenRoller={() => setView("roll")}
        onDownload={handleDownload}
      />
    );

  return (
    <>
      {/* Escritorio: panel fijo a la derecha, abierto por defecto */}
      <div className="hidden sm:block">
        {collapsed ? (
          <button
            type="button"
            onClick={() => setCollapsed(false)}
            aria-label="Abrir chat"
            className="fixed right-0 top-[35%] z-20 flex -translate-y-1/2 flex-col items-center gap-1 rounded-l-sm border border-r-0 border-rule bg-parchment-panel px-2 py-3 text-ink-muted shadow-[0_2px_10px_-2px_rgba(0,0,0,0.2)] hover:text-oxblood"
          >
            <ChatIcon />
            {session && (
              <span className="h-1.5 w-1.5 rounded-full bg-oxblood" aria-label="Sesión activa" />
            )}
          </button>
        ) : (
          <div className="fixed right-0 top-0 z-[25] flex h-full w-80 max-w-[85vw] flex-col border-l border-rule bg-parchment-panel shadow-[-4px_0_16px_-4px_rgba(0,0,0,0.25)]">
            <div className="flex items-center justify-between border-b border-rule px-4 py-3">
              <h2 className="truncate font-display text-sm tracking-wide text-oxblood">
                Chat — {group.name}
              </h2>
              <button
                type="button"
                onClick={() => setCollapsed(true)}
                aria-label="Plegar chat"
                className="text-ink-muted hover:text-oxblood"
              >
                ×
              </button>
            </div>
            <div
              className="flex min-h-0 flex-1 flex-col px-4 py-3"
              style={{ paddingBottom: "calc(var(--player-bar-height, 0px) + 1rem)" }}
            >
              {content}
            </div>
          </div>
        )}
      </div>

      {/* Móvil: FAB a la derecha (esquina "base"; la cola se apila encima si aparece) + hoja inferior */}
      <div className="sm:hidden">
        <button
          type="button"
          onClick={() => onMobileOpenChange(true)}
          aria-label="Abrir chat"
          style={{ bottom: "calc(var(--player-bar-height, 0px) + 1rem)" }}
          className="fixed right-4 z-20 flex h-12 w-12 items-center justify-center rounded-full bg-oxblood text-parchment shadow-[0_4px_16px_-2px_rgba(0,0,0,0.4)]"
        >
          <ChatIcon className="h-5 w-5" />
          {session && (
            <span
              className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-parchment bg-oxblood-dark"
              aria-label="Sesión activa"
            />
          )}
        </button>
        {mobileOpen && (
          <div
            role="presentation"
            onClick={() => onMobileOpenChange(false)}
            className="fixed inset-0 z-40 bg-ink/40"
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label={`Chat — ${group.name}`}
              onClick={(e) => e.stopPropagation()}
              className="absolute inset-x-0 bottom-0 flex max-h-[80vh] flex-col overflow-hidden rounded-t-lg border-t border-rule bg-parchment-panel"
            >
              <div className="flex items-center justify-between border-b border-rule px-4 py-3">
                <h2 className="truncate font-display text-sm tracking-wide text-oxblood">
                  Chat — {group.name}
                </h2>
                <button
                  type="button"
                  onClick={() => onMobileOpenChange(false)}
                  aria-label="Cerrar"
                  className="text-ink-muted hover:text-oxblood"
                >
                  ×
                </button>
              </div>
              <div className="flex min-h-0 flex-1 flex-col px-4 py-3">{content}</div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

interface ChatPanelContentProps {
  isMaster: boolean;
  session: { id: string; startedAt: string } | null;
  messages: ChatMessageDto[] | undefined;
  text: string;
  onTextChange: (text: string) => void;
  onSend: (e: React.FormEvent) => void;
  isSending: boolean;
  onStart: () => void;
  isStarting: boolean;
  confirmingEnd: boolean;
  onToggleConfirmEnd: () => void;
  onConfirmEnd: () => void;
  onCancelConfirmEnd: () => void;
  isEnding: boolean;
  onOpenRoller: () => void;
  onDownload: () => void;
}

function ChatPanelContent({
  isMaster,
  session,
  messages,
  text,
  onTextChange,
  onSend,
  isSending,
  onStart,
  isStarting,
  confirmingEnd,
  onToggleConfirmEnd,
  onConfirmEnd,
  onCancelConfirmEnd,
  isEnding,
  onOpenRoller,
  onDownload,
}: ChatPanelContentProps) {
  if (!session) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
        <p className="text-sm text-ink-muted">
          {isMaster
            ? "No hay ninguna sesión de chat activa. Inícala para chatear y tirar dados en directo con el grupo."
            : "Espera a que el Master inicie una sesión de juego."}
        </p>
        {isMaster && (
          <Button onClick={onStart} isLoading={isStarting} loadingText="Iniciando...">
            Iniciar sesión
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mb-2 flex items-start justify-between gap-2">
        <p className="text-xs text-ink-muted">
          Sesión iniciada a las {formatTime(session.startedAt)}. Los mensajes se borrarán al
          finalizar.
        </p>
        <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
          <Button
            variant="ghost"
            onClick={onOpenRoller}
            className="!px-2 !py-1 !text-xs !normal-case !tracking-normal"
          >
            🎲 Tirar
          </Button>
          <Button
            variant="ghost"
            onClick={onDownload}
            className="!px-2 !py-1 !text-xs !normal-case !tracking-normal"
          >
            Descargar
          </Button>
          {isMaster && (
            <Button
              variant="danger"
              onClick={onToggleConfirmEnd}
              className="!px-2 !py-1 !text-xs !normal-case !tracking-normal"
            >
              Finalizar
            </Button>
          )}
        </div>
      </div>

      {confirmingEnd && (
        <ConfirmPanel
          message="Vas a finalizar la sesión: todos los mensajes se borrarán y no se pueden recuperar."
          confirmLabel="Confirmar fin de sesión"
          loadingText="Finalizando..."
          isLoading={isEnding}
          onConfirm={onConfirmEnd}
          onCancel={onCancelConfirmEnd}
          className="mb-3 border-t-0 pt-0"
        />
      )}

      {/* key={session.id}: al cambiar de sesión, remonta desde cero en vez
          de arrastrar qué mensajes ya se habían "visto" en la anterior. */}
      <ChatMessages key={session.id} messages={messages} />

      <form onSubmit={onSend} className="flex items-end gap-2">
        <TextField
          label="Mensaje"
          hideLabel
          wrapperClassName="mb-0 flex-1"
          placeholder="Escribe un mensaje..."
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
          maxLength={500}
        />
        <Button type="submit" isLoading={isSending} loadingText="...">
          Enviar
        </Button>
      </form>
    </div>
  );
}

/** Anima solo los mensajes que llegan DESPUÉS del montaje (nuevos por polling). */
function ChatMessages({ messages }: { messages: ChatMessageDto[] | undefined }) {
  const seenIds = useRef<Set<string> | null>(null);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!messages) return;
    if (seenIds.current === null) {
      seenIds.current = new Set(messages.map((m) => m.id));
      return;
    }
    const fresh = messages.filter((m) => !seenIds.current!.has(m.id));
    if (fresh.length === 0) return;
    fresh.forEach((m) => seenIds.current!.add(m.id));
    setNewIds((prev) => new Set([...prev, ...fresh.map((m) => m.id)]));
  }, [messages]);

  return (
    <ul className="mb-3 flex-1 space-y-2 overflow-y-auto">
      {(!messages || messages.length === 0) && (
        <li className="rounded-sm border border-dashed border-rule-strong px-4 py-6 text-center text-sm text-ink-muted">
          Todavía no hay mensajes en esta sesión.
        </li>
      )}
      {messages?.map((message) => (
        <MessageRow key={message.id} message={message} animate={newIds.has(message.id)} />
      ))}
    </ul>
  );
}

function MessageRow({ message, animate }: { message: ChatMessageDto; animate: boolean }) {
  if (message.kind === "ROLL" && message.roll) {
    const roll = message.roll;
    return (
      <li className="rounded-sm border border-oxblood/40 bg-parchment-panel p-2.5">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-xs text-ink">
            <span className="font-semibold text-oxblood">
              {roll.characterName ?? message.username}
            </span>
            {" — "}
            {roll.label}
          </span>
          <span className="whitespace-nowrap text-[0.65rem] text-ink-muted">
            {formatTime(message.createdAt)}
          </span>
        </div>
        <div className="mt-1 flex items-baseline justify-between gap-3">
          <span className="text-[0.65rem] text-ink-muted">{roll.formula}</span>
          <AnimatedRollValue
            value={roll.total}
            animate={animate}
            className="font-display text-base font-semibold text-oxblood"
          />
        </div>
      </li>
    );
  }

  return (
    <li className="rounded-sm border border-rule bg-parchment-panel p-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-xs font-semibold text-ink">{message.username}</span>
        <span className="whitespace-nowrap text-[0.65rem] text-ink-muted">
          {formatTime(message.createdAt)}
        </span>
      </div>
      <p className="mt-1 whitespace-pre-line text-sm text-ink">{message.text}</p>
    </li>
  );
}
