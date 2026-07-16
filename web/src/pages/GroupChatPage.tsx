import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { ChatMessageDto } from "@dnd-manager/shared";
import { useGroupDetail } from "../features/groups/hooks";
import {
  useChatMessages,
  useChatSession,
  useEndSession,
  useSendChatMessage,
  useStartSession,
} from "../features/chat/hooks";
import { AnimatedRollValue } from "../features/dice/AnimatedRollValue";
import { Button } from "../components/ui/Button";
import { TextField } from "../components/ui/TextField";
import { EmptyState } from "../components/ui/EmptyState";
import { ChapterHeading } from "../components/ui/ChapterHeading";
import { ConfirmPanel } from "../components/ui/ConfirmPanel";
import { SkeletonPage } from "../components/ui/Skeleton";
import { toErrorMessage, useToast } from "../components/ui/Toast";

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function GroupChatPage() {
  const { id: groupId } = useParams<{ id: string }>();
  const toast = useToast();
  const { data: group, isLoading: isLoadingGroup } = useGroupDetail(groupId!);
  const { data: session, isLoading: isLoadingSession } = useChatSession(groupId!);
  const { data: messages } = useChatMessages(groupId!, { enabled: !!session });
  const startSession = useStartSession(groupId!);
  const endSession = useEndSession(groupId!);
  const sendMessage = useSendChatMessage(groupId!);
  const [text, setText] = useState("");
  const [confirmingEnd, setConfirmingEnd] = useState(false);

  if (isLoadingGroup || isLoadingSession || !group) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-10">
        <SkeletonPage rows={4} />
      </div>
    );
  }

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

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <ChapterHeading
        action={
          <div className="flex flex-wrap gap-2">
            <Link
              to={`/groups/${groupId}`}
              className="rounded-sm border border-rule px-3 py-1.5 text-ink transition-colors hover:border-oxblood hover:bg-oxblood hover:text-parchment"
            >
              Volver al grupo
            </Link>
            {isMaster && session && (
              <Button variant="danger" onClick={() => setConfirmingEnd((v) => !v)}>
                Finalizar sesión
              </Button>
            )}
          </div>
        }
      >
        Chat — {group.name}
      </ChapterHeading>

      {confirmingEnd && (
        <ConfirmPanel
          message="Vas a finalizar la sesión de chat: todos los mensajes se borrarán y no se pueden recuperar. El registro de 'Tiradas' no se ve afectado."
          confirmLabel="Confirmar fin de sesión"
          loadingText="Finalizando..."
          isLoading={endSession.isPending}
          onConfirm={handleConfirmEnd}
          onCancel={() => setConfirmingEnd(false)}
          className="mb-4 border-t-0 pt-0"
        />
      )}

      {!session ? (
        <EmptyState
          title="No hay ninguna sesión de chat activa."
          description={
            isMaster
              ? "Inicia una sesión para chatear en directo con el grupo mientras jugáis. Al finalizarla, los mensajes se borran."
              : "Espera a que el Master inicie una sesión de juego."
          }
          action={
            isMaster && (
              <Button
                onClick={handleStart}
                isLoading={startSession.isPending}
                loadingText="Iniciando..."
              >
                Iniciar sesión
              </Button>
            )
          }
        />
      ) : (
        <>
          <p className="mb-3 text-sm text-ink-muted">
            Sesión iniciada a las {formatTime(session.startedAt)}. Los mensajes se borrarán al
            finalizar.
          </p>

          {/* key={session.id}: al cambiar de sesión, remonta desde cero en vez
              de arrastrar qué mensajes ya se habían "visto" en la anterior. */}
          <ChatMessages key={session.id} messages={messages} />

          <form onSubmit={handleSend} className="flex items-end gap-2">
            <TextField
              label="Mensaje"
              hideLabel
              wrapperClassName="mb-0 flex-1"
              placeholder="Escribe un mensaje..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={500}
            />
            <Button type="submit" isLoading={sendMessage.isPending} loadingText="...">
              Enviar
            </Button>
          </form>
        </>
      )}
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
    <ul className="mb-4 space-y-2">
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
      <li className="rounded-sm border border-oxblood/40 bg-parchment-panel p-3">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-sm text-ink">
            <span className="font-semibold text-oxblood">
              {roll.characterName ?? message.username}
            </span>
            {" — "}
            {roll.label}
          </span>
          <span className="whitespace-nowrap text-xs text-ink-muted">
            {formatTime(message.createdAt)}
          </span>
        </div>
        <div className="mt-1 flex items-baseline justify-between gap-3">
          <span className="text-xs text-ink-muted">{roll.formula}</span>
          <AnimatedRollValue
            value={roll.total}
            animate={animate}
            className="font-display text-lg font-semibold text-oxblood"
          />
        </div>
      </li>
    );
  }

  return (
    <li className="rounded-sm border border-rule bg-parchment-panel p-3">
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-semibold text-ink">{message.username}</span>
        <span className="whitespace-nowrap text-xs text-ink-muted">
          {formatTime(message.createdAt)}
        </span>
      </div>
      <p className="mt-1 whitespace-pre-line text-sm text-ink">{message.text}</p>
    </li>
  );
}
