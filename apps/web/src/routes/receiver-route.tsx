import { useEffect, useMemo, useRef, useState } from "react";

import type { CelebrityPayload, LocationPayload, RevealPayload, WsEnvelope } from "@openreveal/shared";

import { getReceiverStatus } from "../lib/api.js";
import { createBrowserId } from "../lib/id.js";
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
    // Supports both the QR/legacy form "/r/<code>" and the bare typed form
    // "/<code>" the performer enters on the spectator phone.
    const parts = window.location.pathname.split("/").filter(Boolean);
    return (parts[0] === "r" ? parts[1] : parts[0]) ?? "";
  }, []);

  return <SpectatorReceiver sessionCode={sessionCode} />;
}

export function SpectatorReceiver({ embedded = false, sessionCode }: SpectatorReceiverProps) {
  const [status, setStatus] = useState<ReceiverStatus>("checking");
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
          if (data.status !== "live") {
            setCachedReveal(null);
            setActiveReveal(null);
          }
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
              const handoffUrl = externalHandoffUrl(current.payload);
              if (!embedded && handoffUrl) {
                window.location.replace(handoffUrl);
              }
            }
            return current;
          });
        }
        if (envelope.type === "session_reset") {
          setCachedReveal(null);
          setActiveReveal(null);
        }
        if (envelope.type === "session_expired") {
          terminalState = "expired";
          setStatus("expired");
          setCachedReveal(null);
          setActiveReveal(null);
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
  const receiverMode = activeReveal?.kind === "custom_text" ? "text" : "search";

  return (
    <main
      className={[
        "receiver-shell",
        embedded ? "receiver-shell--embedded" : "",
        `receiver-shell--${receiverMode}`
      ].filter(Boolean).join(" ")}
    >
      <section className="receiver-surface" aria-live="polite">
        {receiverMode === "search" ? (
          <>
            <div className="search-line">
              <svg
                className="search-line__icon"
                viewBox="0 0 24 24"
                width="20"
                height="20"
                aria-hidden="true"
              >
                <path
                  fill="currentColor"
                  d="M15.5 14h-.79l-.28-.27a6.5 6.5 0 1 0-.7.7l.27.28v.79l5 4.99L20.49 19l-4.99-5Zm-6 0A4.5 4.5 0 1 1 14 9.5 4.49 4.49 0 0 1 9.5 14Z"
                />
              </svg>
              {statusText(status) ? (
                <p>{statusText(status)}</p>
              ) : (
                <p className="search-line__placeholder">Search</p>
              )}
            </div>
            <ReceiverSignals
              activeReveal={Boolean(activeReveal)}
              cachedReveal={Boolean(cachedReveal)}
              status={status}
            />
          </>
        ) : null}
        <div className="result-space">
          {ActiveReveal && activeReveal ? <ActiveReveal payload={activeReveal as never} /> : null}
          {status === "expired" ? <p>This page is no longer active</p> : null}
          {status === "in_use" ? <p>This session is already open elsewhere</p> : null}
        </div>
      </section>
    </main>
  );
}

function ReceiverSignals({
  activeReveal,
  cachedReveal,
  status
}: {
  activeReveal: boolean;
  cachedReveal: boolean;
  status: ReceiverStatus;
}) {
  return (
    <div
      className="receiver-signals"
      data-active={activeReveal ? "true" : "false"}
      data-prepared={cachedReveal ? "true" : "false"}
      data-state={status}
      title={`state:${status} prepared:${cachedReveal ? "yes" : "no"} active:${activeReveal ? "yes" : "no"}`}
      aria-hidden="true"
    >
      <span className={status === "live" ? "is-on" : ""} />
      <span className={cachedReveal ? "is-on" : ""} />
      <span className={activeReveal ? "is-on" : ""} />
    </div>
  );
}

function externalHandoffUrl(payload: RevealPayload) {
  if (payload.kind === "location" && payload.autoOpenMaps === true) {
    return (payload as LocationPayload).mapsUrl;
  }
  if (payload.kind === "celebrity" && payload.autoOpenSearch !== false) {
    return (payload as CelebrityPayload).searchUrl;
  }
  return undefined;
}

function sendMessage(socket: WebSocket, message: unknown) {
  if (socket.readyState !== WebSocket.OPEN) return;
  socket.send(JSON.stringify(message));
}

function statusText(status: ReceiverStatus) {
  switch (status) {
    case "checking":
      return "";
    case "live":
      return "";
    case "reconnecting":
      return "";
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
  const next = createBrowserId();
  window.localStorage.setItem(key, next);
  return next;
}
