import { useEffect, useRef, useState } from "react";
import type { ChatMessageDto, CharacterRosterEntry } from "@dnd-manager/shared";
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
import { useMountTransition } from "../../lib/useMountTransition";
import { CharacterRollMenu, CATEGORY_LABELS, type Category } from "./CharacterRollMenu";
import { CombatPanel } from "../combat/CombatPanel";
import { PortraitCircle } from "../../components/character/PortraitCircle";
import { Button } from "../../components/ui/Button";
import { TextField } from "../../components/ui/TextField";
import { ConfirmPanel } from "../../components/ui/ConfirmPanel";
import { toErrorMessage, useToast } from "../../components/ui/Toast";

const COLLAPSED_STORAGE_KEY = "chatDock.collapsed";
const SHEET_TRANSITION_MS = 200;
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

function peekPreview(message: ChatMessageDto): { top: string; bottom: string } {
  if (message.kind === "ROLL" && message.roll) {
    return {
      top: `${message.roll.characterName ?? message.username} — ${message.roll.label}`,
      bottom: `${message.roll.formula} = ${message.roll.total}`,
    };
  }
  return { top: message.username, bottom: message.text ?? "" };
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

/**
 * Chat acoplado a modo del reproductor de música: en escritorio, panel fijo
 * a la derecha, abierto por defecto (se puede plegar y lo recuerda en
 * localStorage).
 *
 * En móvil, tres estados en vez de la hoja al 80% de antes: una barra
 * "recogida" con el último mensaje (por defecto), una hoja a media pantalla
 * al tocarla, y un menú fijo estilo Pokémon (Ataques/Objetos/Salvación/
 * Habilidad) que abre una bandeja de tiradas APILADA sobre el chat (que se
 * ve atenuado detrás, no desaparece) — al lanzar una tirada la bandeja se
 * cierra sola y vuelve al chat.
 *
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
 * ambos coinciden. En móvil, la barra/FAB de chat ocupa la esquina inferior
 * derecha "base"; el de la cola (si aparece) se apila encima del suyo, y
 * abrir una de las dos hojas cierra la otra (estado controlado desde
 * AppLayout) para que nunca queden ambas "abiertas" tapándose entre sí.
 */
interface ChatDockPanelProps {
  mobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
  /** Ancho real del panel (0 si colapsado/no aplica) — lo consume AppLayout
   * para reservarle hueco. Viene por prop (estado de React), no por una
   * variable CSS mutada a mano, porque un `transition` sobre una propiedad
   * cuyo valor depende de una custom property tocada vía `style.setProperty`
   * no anima en este entorno (se queda pillada en el valor inicial). */
  onDockWidthChange: (width: number) => void;
}

export function ChatDockPanel({
  mobileOpen,
  onMobileOpenChange,
  onDockWidthChange,
}: ChatDockPanelProps) {
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
  // Compartido entre escritorio (cambia el contenido del panel) y móvil
  // (abre la bandeja apilada) — no distinto de "cuál tirada estoy viendo",
  // sino "qué categoría del menú fijo estoy usando ahora mismo".
  const [rollCategory, setRollCategory] = useState<Category | null>(null);

  // Marca como "vista" la última tirada/mensaje justo al abrir la hoja móvil
  // — ese id se queda fijo mientras está cerrada y sirve para saber si hay
  // algo nuevo que mostrar en la barra recogida. Ajuste de estado durante el
  // render (no en un efecto) siguiendo el patrón de React para "adaptar
  // estado a un cambio de prop" — aquí no hace falta seguir sincronizando
  // mientras la hoja sigue abierta, solo en el instante en que se abre.
  const [lastSeenId, setLastSeenId] = useState<string | null>(null);
  const [prevMobileOpen, setPrevMobileOpen] = useState(mobileOpen);
  if (mobileOpen !== prevMobileOpen) {
    setPrevMobileOpen(mobileOpen);
    if (mobileOpen) {
      setLastSeenId(messages?.[messages.length - 1]?.id ?? null);
    }
  }

  useEffect(() => {
    window.localStorage.setItem(COLLAPSED_STORAGE_KEY, collapsed ? "1" : "0");
  }, [collapsed]);

  // Avisa a AppLayout del ancho real del panel para que le reserve hueco: el
  // panel es `fixed right-0` y por su cuenta no reservaba nada en ninguna
  // página, así que se montaba encima de lo que hubiera ahí (más visible en
  // el mapa, cuyo lienzo y controles de zoom llegan hasta el borde derecho).
  // En móvil (o colapsado, o sin grupo activo) el ancho avisado es 0 — el
  // panel ahora se queda SIEMPRE montado (para poder animar la entrada/
  // salida, ver más abajo), así que `collapsed` hay que comprobarlo
  // explícitamente: `panelRef.current` ya no es null cuando está colapsado,
  // solo desplazado fuera de la pantalla.
  const panelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = panelRef.current;
    if (!el || collapsed) {
      onDockWidthChange(0);
      return;
    }
    onDockWidthChange(el.offsetWidth);
    const observer = new ResizeObserver(([entry]) =>
      onDockWidthChange(entry?.contentRect.width ?? el.offsetWidth),
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      onDockWidthChange(0);
    };
  }, [collapsed, groupId, group, onDockWidthChange]);

  // Hoja móvil y bandeja de tiradas: montadas siempre que estén "de camino"
  // a abrirse o cerrarse (no solo mientras open === true), para que la
  // transición de salida (deslizar hacia abajo + atenuar el scrim) llegue a
  // verse en vez de que React desmonte el nodo en el acto al cerrar. Antes
  // del `return null` de abajo a propósito — los hooks no pueden ser
  // condicionales.
  const mobileSheet = useMountTransition(mobileOpen, SHEET_TRANSITION_MS);
  const rollTray = useMountTransition(!!(rollCategory && session), SHEET_TRANSITION_MS);

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
        setRollCategory(null);
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

  function closeMobile() {
    onMobileOpenChange(false);
    setRollCategory(null);
  }

  const desktopContent =
    rollCategory && session ? (
      <CharacterRollMenu
        characters={group.characters}
        currentUserId={user?.id ?? ""}
        isMaster={isMaster}
        diceThemeColor={group.diceThemeColor}
        initialCategory={rollCategory}
        onRolled={() => setRollCategory(null)}
        onClose={() => setRollCategory(null)}
      />
    ) : (
      <ChatPanelContent
        isMaster={isMaster}
        session={session ?? null}
        messages={messages}
        characters={group.characters}
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
        onDownload={handleDownload}
        combatPanel={
          !confirmingEnd && (
            <CombatPanel
              groupId={gid}
              isMaster={isMaster}
              currentUserId={user?.id ?? ""}
              diceThemeColor={group.diceThemeColor}
              sessionActive={!!session}
              characters={group.characters}
            />
          )
        }
        bottomMenu={session && !confirmingEnd && <BattleMenu onSelect={setRollCategory} />}
      />
    );

  const lastMessage = messages && messages.length > 0 ? messages[messages.length - 1]! : null;
  const hasUnread = !mobileOpen && !!lastMessage && lastMessage.id !== lastSeenId;

  return (
    <>
      {/* Escritorio: panel fijo a la derecha, abierto por defecto. La
          pestaña colapsada y el panel están SIEMPRE montados (nunca se
          desmontan entre sí) para poder cruzar opacidad/transform en vez de
          que uno aparezca de golpe en cuanto el otro desaparece. */}
      <div className="hidden sm:block">
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          aria-label="Abrir chat"
          aria-hidden={!collapsed}
          tabIndex={collapsed ? 0 : -1}
          className={`fixed right-0 top-[35%] z-20 flex -translate-y-1/2 flex-col items-center gap-1 rounded-l-sm border border-r-0 border-rule bg-parchment-panel px-2 py-3 text-ink-muted shadow-[0_2px_10px_-2px_rgba(0,0,0,0.2)] transition-opacity duration-200 hover:bg-parchment-deep hover:text-ink ${
            collapsed ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
        >
          <ChatIcon />
          {session && (
            <span className="h-1.5 w-1.5 rounded-full bg-oxblood" aria-label="Sesión activa" />
          )}
        </button>
        <div
          ref={panelRef}
          aria-hidden={collapsed}
          className={`fixed right-0 top-0 z-[25] flex h-full w-[clamp(380px,28vw,560px)] max-w-[90vw] flex-col border-l border-rule bg-parchment-panel shadow-[-4px_0_16px_-4px_rgba(0,0,0,0.25)] transition-transform duration-200 ${
            collapsed ? "[transform:translateX(100%)]" : "[transform:translateX(0)]"
          }`}
        >
          <div className="flex items-center justify-between border-b border-rule px-5 py-4">
            <h2 className="truncate font-display text-base tracking-wide text-oxblood">
              Chat — {group.name}
            </h2>
            <button
              type="button"
              onClick={() => setCollapsed(true)}
              aria-label="Plegar chat"
              className="text-ink-muted hover:text-ink"
            >
              ×
            </button>
          </div>
          <div
            className="flex min-h-0 flex-1 flex-col px-4 py-3"
            style={{ paddingBottom: "calc(var(--player-bar-height, 0px) + 1rem)" }}
          >
            {desktopContent}
          </div>
        </div>
      </div>

      {/* Móvil: barra recogida por defecto + hoja a media pantalla + bandeja de tiradas apilada */}
      <div className="sm:hidden">
        {!mobileOpen &&
          (session && lastMessage ? (
            <button
              type="button"
              onClick={() => onMobileOpenChange(true)}
              aria-label="Abrir chat"
              style={{ bottom: "calc(var(--player-bar-height, 0px) + 1rem)" }}
              className="fixed inset-x-3 z-20 flex items-center gap-2 rounded-xl border border-rule-strong bg-parchment-panel px-2.5 py-2 text-left shadow-[0_4px_14px_-4px_rgba(0,0,0,0.3)]"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-oxblood text-ivory">
                <ChatIcon className="h-3.5 w-3.5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-semibold text-oxblood">
                  {peekPreview(lastMessage).top}
                </span>
                <span className="block truncate text-[0.7rem] text-ink-muted">
                  {peekPreview(lastMessage).bottom}
                </span>
              </span>
              {hasUnread && (
                <span
                  className="h-2 w-2 shrink-0 rounded-full bg-gold-bright"
                  aria-label="Mensajes sin leer"
                />
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onMobileOpenChange(true)}
              aria-label="Abrir chat"
              style={{ bottom: "calc(var(--player-bar-height, 0px) + 1rem)" }}
              className="fixed right-4 z-20 flex h-12 w-12 items-center justify-center rounded-full bg-oxblood text-ivory shadow-[0_4px_16px_-2px_rgba(0,0,0,0.4)]"
            >
              <ChatIcon className="h-5 w-5" />
            </button>
          ))}

        {mobileSheet.shouldRender && (
          <>
            <div
              role="presentation"
              onClick={closeMobile}
              className={`fixed inset-0 z-40 bg-abyss/40 transition-opacity duration-200 ${
                mobileSheet.visible ? "opacity-100" : "opacity-0"
              }`}
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-label={`Chat — ${group.name}`}
              className={`fixed inset-x-0 bottom-0 z-40 flex max-h-[50vh] flex-col overflow-hidden rounded-t-lg border-t border-rule bg-parchment-panel transition-transform duration-200 ${
                mobileSheet.visible ? "[transform:translateY(0)]" : "[transform:translateY(100%)]"
              }`}
            >
              <div className="flex items-center justify-between border-b border-rule px-4 py-3">
                <h2 className="truncate font-display text-sm tracking-wide text-oxblood">
                  Chat — {group.name}
                </h2>
                <button
                  type="button"
                  onClick={closeMobile}
                  aria-label="Cerrar"
                  className="text-ink-muted hover:text-ink"
                >
                  ×
                </button>
              </div>
              <div className="flex min-h-0 flex-1 flex-col px-4 py-3">
                <ChatPanelContent
                  isMaster={isMaster}
                  session={session ?? null}
                  messages={messages}
                  characters={group.characters}
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
                  onDownload={handleDownload}
                  combatPanel={
                    !confirmingEnd && (
                      <CombatPanel
                        groupId={gid}
                        isMaster={isMaster}
                        currentUserId={user?.id ?? ""}
                        diceThemeColor={group.diceThemeColor}
                        sessionActive={!!session}
                        characters={group.characters}
                      />
                    )
                  }
                  bottomMenu={
                    session && !confirmingEnd && <BattleMenu onSelect={setRollCategory} />
                  }
                />
              </div>
            </div>

            {rollTray.shouldRender && (
              <>
                <div
                  role="presentation"
                  onClick={() => setRollCategory(null)}
                  className={`fixed inset-0 z-40 bg-abyss/40 transition-opacity duration-200 ${
                    rollTray.visible ? "opacity-100" : "opacity-0"
                  }`}
                />
                <div
                  className={`fixed inset-x-0 bottom-0 top-[30%] z-40 flex flex-col overflow-hidden rounded-t-lg border-t border-rule bg-parchment-panel shadow-[0_-8px_22px_-6px_rgba(0,0,0,0.35)] transition-transform duration-200 ${
                    rollTray.visible ? "[transform:translateY(0)]" : "[transform:translateY(100%)]"
                  }`}
                >
                  <div className="flex min-h-0 flex-1 flex-col px-4 py-3">
                    <CharacterRollMenu
                      characters={group.characters}
                      currentUserId={user?.id ?? ""}
                      isMaster={isMaster}
                      diceThemeColor={group.diceThemeColor}
                      initialCategory={rollCategory ?? undefined}
                      onRolled={() => setRollCategory(null)}
                      onClose={() => setRollCategory(null)}
                    />
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </>
  );
}

/** Menú fijo estilo Pokémon (Ataques/Objetos/Salvación/Habilidad) — reemplaza al botón único "🎲 Tirar" en móvil. */
function BattleMenu({ onSelect }: { onSelect: (category: Category) => void }) {
  return (
    <div className="mb-2 grid grid-cols-2 gap-1.5 sm:gap-2.5">
      {(Object.keys(CATEGORY_LABELS) as Category[]).map((cat) => (
        <button
          key={cat}
          type="button"
          onClick={() => onSelect(cat)}
          className="rounded-sm bg-oxblood px-2.5 py-2 text-left font-display text-xs tracking-wide text-ivory hover:bg-oxblood-light sm:px-4 sm:py-4 sm:text-sm"
        >
          {CATEGORY_LABELS[cat]}
        </button>
      ))}
    </div>
  );
}

interface ChatPanelContentProps {
  isMaster: boolean;
  session: { id: string; startedAt: string } | null;
  messages: ChatMessageDto[] | undefined;
  characters: CharacterRosterEntry[];
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
  onDownload: () => void;
  /** Rastreador de combate (ver features/combat/CombatPanel) — entre el aviso de sesión y la lista de mensajes. */
  combatPanel?: React.ReactNode;
  /** Se renderiza entre la lista de mensajes y el formulario — el menú fijo de tiradas (ver BattleMenu). */
  bottomMenu?: React.ReactNode;
}

function ChatPanelContent({
  isMaster,
  session,
  messages,
  characters,
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
  onDownload,
  combatPanel,
  bottomMenu,
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
      <div className="mb-2 flex items-start justify-between gap-2 sm:mb-3 sm:gap-3">
        <p className="text-xs text-ink-muted sm:text-sm">
          Sesión iniciada a las {formatTime(session.startedAt)}. Los mensajes se borrarán al
          finalizar.
        </p>
        <div className="flex shrink-0 flex-wrap justify-end gap-1.5 sm:gap-2">
          <Button
            variant="ghost"
            onClick={onDownload}
            className="!px-2 !py-1 !text-xs !normal-case !tracking-normal sm:!px-4 sm:!py-2.5 sm:!text-sm"
          >
            Descargar
          </Button>
          {isMaster && (
            <Button
              variant="danger"
              onClick={onToggleConfirmEnd}
              className="!px-2 !py-1 !text-xs !normal-case !tracking-normal sm:!px-4 sm:!py-2.5 sm:!text-sm"
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

      {combatPanel}

      <ChatMessages messages={messages} characters={characters} />

      {bottomMenu}

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

function ChatMessages({
  messages,
  characters,
}: {
  messages: ChatMessageDto[] | undefined;
  characters: CharacterRosterEntry[];
}) {
  return (
    <ul className="mb-3 flex-1 space-y-2 overflow-y-auto">
      {(!messages || messages.length === 0) && (
        <li className="rounded-sm border border-dashed border-rule-strong px-4 py-6 text-center text-sm text-ink-muted">
          Todavía no hay mensajes en esta sesión.
        </li>
      )}
      {messages?.map((message) => (
        <MessageRow key={message.id} message={message} characters={characters} />
      ))}
    </ul>
  );
}

function MessageRow({
  message,
  characters,
}: {
  message: ChatMessageDto;
  characters: CharacterRosterEntry[];
}) {
  if (message.kind === "COMBAT") {
    return (
      <li className="px-2 py-1 text-center text-xs italic text-ink-muted">⚔ {message.text}</li>
    );
  }

  if (message.kind === "ROLL" && message.roll) {
    const roll = message.roll;
    const character = characters.find((c) => c.id === roll.characterId);
    const portraitName = roll.characterName ?? message.username;
    return (
      <li className="flex overflow-hidden rounded-sm border border-oxblood/45">
        <div className="w-1 shrink-0 bg-oxblood" aria-hidden="true" />
        <div className="flex flex-1 items-center gap-2 bg-oxblood/[0.06] p-2 sm:gap-3 sm:p-3">
          <div className="shrink-0">
            <PortraitCircle
              url={character?.portraitUrl ?? null}
              name={portraitName}
              sizeClassName="h-[26px] w-[26px] sm:h-9 sm:w-9"
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <span className="truncate text-xs text-ink sm:text-sm">
                <span className="font-semibold text-oxblood">
                  {roll.characterName ?? message.username}
                </span>
                {" — "}
                {roll.label}
              </span>
              <span className="whitespace-nowrap text-[0.65rem] text-ink-muted sm:text-xs">
                {formatTime(message.createdAt)}
              </span>
            </div>
            <div className="truncate text-[0.65rem] text-ink-muted sm:text-xs">{roll.formula}</div>
          </div>
          <span className="shrink-0 font-display text-lg font-semibold text-oxblood sm:text-2xl">
            {roll.total}
          </span>
        </div>
      </li>
    );
  }

  return (
    <li className="rounded-sm border border-rule bg-parchment-panel p-2.5 sm:p-3">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-xs font-semibold text-ink sm:text-sm">{message.username}</span>
        <span className="whitespace-nowrap text-[0.65rem] text-ink-muted sm:text-xs">
          {formatTime(message.createdAt)}
        </span>
      </div>
      <p className="mt-1 whitespace-pre-line text-sm text-ink">{message.text}</p>
    </li>
  );
}
