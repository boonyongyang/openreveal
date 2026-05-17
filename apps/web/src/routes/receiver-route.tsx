import { useEffect, useMemo, useRef, useState } from "react";

import type { RevealPayload, WsEnvelope } from "@openreveal/shared";

import { getReceiverStatus } from "../lib/api.js";
import { websocketUrl } from "../lib/status.js";
import { registerBuiltInWebEffects, webEffects } from "../effects/index.js";

type ReceiverStatus = "checking" | "live" | "expired" | "in_use" | "reconnecting";
const RECEIVER_RETRY_BASE_MS = 1200;
const RECEIVER_RETRY_MAX_MS = 15_000;

interface SpectatorReceiverProps {
  embedded?: boolean;
  sessionCode: string;
}

registerBuiltInWebEffects();

export function ReceiverRoute() {
  const sessionCode = useMemo(() => {
    const [, , code] = window.location.pathname.split("/");
    return code ?? "";
  }, []);

  return <SpectatorReceiver sessionCode={sessionCode} />;
}

export function SpectatorReceiver({ embedded = false, sessionCode }: SpectatorReceiverProps) {
  const [status, setStatus] = useState<ReceiverStatus>("checking");
  const [lastSignal, setLastSignal] = useState("Standing by");
  const [cachedReveal, setCachedReveal] = useState<{
    revealId: string;
    payload: RevealPayload;
  } | null>(null);
  const [activeReveal, setActiveReveal] = useState<RevealPayload | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const deviceId = useMemo(() => getReceiverDeviceId(sessionCode), [sessionCode]);

  useEffect(() => {
    let heartbeat: number | undefined;
    let reconnectTimer: number | undefined;
    let cancelled = false;
    let retryAttempt = 0;
    let terminalState: Extract<ReceiverStatus, "expired" | "in_use"> | undefined;

    async function connect() {
      try {
        const receiverStatus = await getReceiverStatus(sessionCode, deviceId);
        if (cancelled) return;
        if (receiverStatus.status !== "live") {
          terminalState = receiverStatus.status;
          setStatus(receiverStatus.status);
          clearReconnect();
          return;
        }
      } catch {
        scheduleReconnect();
        return;
      }

      setStatus("live");
      terminalState = undefined;
      retryAttempt = 0;
      const socket = new WebSocket(websocketUrl(sessionCode, "receiver", { deviceId }));
      socketRef.current = socket;

      socket.addEventListener("open", () => {
        setStatus("live");
        setLastSignal("Receiver connected");
        retryAttempt = 0;
        clearHeartbeat();
        sendHeartbeat(socket);
        heartbeat = window.setInterval(() => sendHeartbeat(socket), 15_000);
      });

      socket.addEventListener("message", (event) => {
        const envelope = JSON.parse(String(event.data)) as WsEnvelope;
        if (envelope.type === "session_state") {
          const data = envelope.data as { status: "live" | "expired" | "in_use" };
          terminalState = data.status === "live" ? undefined : data.status;
          setStatus(data.status);
        }
        if (envelope.type === "reveal_prepared") {
          const data = envelope.data as {
            revealId: string;
            payload?: RevealPayload;
          };
          if (data.payload) {
            setCachedReveal({ revealId: data.revealId, payload: data.payload });
            sendMessage(socket, {
              type: "receiver.prepared_ack",
              data: { revealId: data.revealId }
            });
          }
        }
        if (envelope.type === "reveal_sent") {
          const data = envelope.data as { revealId: string };
          setCachedReveal((current) => {
            if (current?.revealId === data.revealId) {
              setActiveReveal(current.payload);
              sendMessage(socket, {
                type: "receiver.reveal_ack",
                data: {
                  revealId: data.revealId,
                  renderedAtMs: Date.now(),
                  latencyMs: Math.max(0, Date.now() - envelope.ts)
                }
              });
            }
            return current;
          });
        }
        if (envelope.type === "session_reset") {
          setCachedReveal(null);
          setActiveReveal(null);
          setLastSignal("Standing by");
        }
        if (envelope.type === "session_expired") {
          terminalState = "expired";
          setStatus("expired");
        }
      });

      socket.addEventListener("close", () => {
        if (cancelled) return;
        clearHeartbeat();
        if (terminalState) return;
        scheduleReconnect();
      });
    }

    void connect();

    function onVisibilityChange() {
      const socket = socketRef.current;
      if (socket?.readyState === WebSocket.OPEN) sendHeartbeat(socket);
    }

    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      cancelled = true;
      clearHeartbeat();
      clearReconnect();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      socketRef.current?.close();
    };

    function clearHeartbeat() {
      if (heartbeat) window.clearInterval(heartbeat);
      heartbeat = undefined;
    }

    function clearReconnect() {
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      reconnectTimer = undefined;
    }

    function scheduleReconnect() {
      if (cancelled || reconnectTimer) return;
      setStatus("reconnecting");
      setLastSignal("Reconnecting");
      const delayMs = receiverRetryDelayMs(retryAttempt);
      retryAttempt += 1;
      reconnectTimer = window.setTimeout(() => {
        reconnectTimer = undefined;
        void connect();
      }, delayMs);
    }
  }, [deviceId, sessionCode]);

  function sendHeartbeat(socket: WebSocket) {
    sendMessage(socket, {
      type: "receiver.heartbeat",
      data: {
        visibility: document.visibilityState === "hidden" ? "hidden" : "visible"
      }
    });
  }

  const ActiveReveal = activeReveal ? webEffects.get(activeReveal.kind)?.SpectatorReveal : undefined;

  return (
    <main className={embedded ? "receiver-shell receiver-shell--embedded" : "receiver-shell"}>
      <section className="receiver-surface" aria-live="polite">
        <div className="receiver-brand">OpenReveal</div>
        <div className="search-line">
          <span />
          <p>{statusText(status)}</p>
        </div>
        <div className="result-space">
          {ActiveReveal && activeReveal ? <ActiveReveal payload={activeReveal as never} /> : null}
          {!activeReveal && status === "checking" ? <p>Loading page</p> : null}
          {!activeReveal && status === "live" ? <p>{lastSignal}</p> : null}
          {status === "reconnecting" ? <p>Restoring connection</p> : null}
          {status === "expired" ? <p>This page is no longer active</p> : null}
          {status === "in_use" ? <p>This session is already open elsewhere</p> : null}
        </div>
      </section>
    </main>
  );
}

function sendMessage(socket: WebSocket, message: unknown) {
  if (socket.readyState !== WebSocket.OPEN) return;
  socket.send(JSON.stringify(message));
}

function statusText(status: ReceiverStatus) {
  switch (status) {
    case "checking":
      return "Preparing";
    case "live":
      return "Search anything";
    case "reconnecting":
      return "Search anything";
    case "expired":
      return "Page inactive";
    case "in_use":
      return "Session unavailable";
  }
}

export function receiverRetryDelayMs(attempt: number) {
  const boundedAttempt = Math.max(0, Math.min(attempt, 4));
  return Math.min(RECEIVER_RETRY_MAX_MS, RECEIVER_RETRY_BASE_MS * 2 ** boundedAttempt);
}

function getReceiverDeviceId(sessionCode: string) {
  const key = `openreveal:receiver:${sessionCode}`;
  const existing = window.localStorage.getItem(key);
  if (existing) return existing;
  const next = crypto.randomUUID();
  window.localStorage.setItem(key, next);
  return next;
}
