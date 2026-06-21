import { useEffect, useMemo, useRef, useState } from "react";

import type { CelebrityPayload, LocationPayload, RevealPayload, WsEnvelope } from "@openreveal/shared";

import { getReceiverStatus } from "../lib/api.js";
import { createBrowserId } from "../lib/id.js";
import { sessionCodeFromPath } from "../lib/session-path.js";
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
  const sessionCode = useMemo(() => sessionCodeFromPath(window.location.pathname) ?? "", []);

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
  const handoffUrlRef = useRef<string | null>(null);
  const deviceId = useMemo(() => getReceiverDeviceId(sessionCode), [sessionCode]);

  // Back-trap: once a reveal has handed off to an external page (Maps/Search),
  // pressing Back on the spectator phone restores this page from bfcache and
  // would briefly expose the app. If that happens, bounce straight back to the
  // reveal target so the controlled page/URL is never seen.
  useEffect(() => {
    if (embedded) return;
    function bounce() {
      const url = handoffUrlRef.current ?? safeSessionGet(handoffStorageKey(sessionCode));
      if (url) window.location.replace(url);
    }
    window.addEventListener("pageshow", bounce);
    return () => window.removeEventListener("pageshow", bounce);
  }, [embedded, sessionCode]);

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
                handoffUrlRef.current = handoffUrl;
                safeSessionSet(handoffStorageKey(sessionCode), handoffUrl);
                window.location.replace(handoffUrl);
              }
            }
            return current;
          });
        }
        if (envelope.type === "session_reset") {
          clearHandoff(sessionCode, handoffUrlRef);
          setCachedReveal(null);
          setActiveReveal(null);
        }
        if (envelope.type === "session_expired") {
          clearHandoff(sessionCode, handoffUrlRef);
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
          <div className="search-home">
            <div className="search-home__logo" aria-hidden="true">
              <span className="search-dot search-dot--b" />
              <span className="search-dot search-dot--r" />
              <span className="search-dot search-dot--y" />
              <span className="search-dot search-dot--g" />
            </div>
            <form className="search-line" onSubmit={(event) => event.preventDefault()}>
              <svg className="search-line__icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M15.5 14h-.79l-.28-.27a6.5 6.5 0 1 0-.7.7l.27.28v.79l5 4.99L20.49 19l-4.99-5Zm-6 0A4.5 4.5 0 1 1 14 9.5 4.49 4.49 0 0 1 9.5 14Z"
                />
              </svg>
              <input
                className="search-line__input"
                type="text"
                inputMode="search"
                enterKeyHint="search"
                autoComplete="off"
                aria-label="Search"
                placeholder="Search"
              />
              <svg className="search-line__mic" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
                <path fill="#4285f4" d="M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3Z" />
                <path fill="#34a853" d="M11 18.92A7 7 0 0 1 5 12H3a9 9 0 0 0 8 8.94V24h2v-3.06A9 9 0 0 0 21 12h-2a7 7 0 0 1-8 6.92Z" />
              </svg>
              <svg className="search-line__lens" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
                <circle cx="12" cy="12" r="3.2" fill="#4285f4" />
                <path fill="#ea4335" d="M5 5h4l1.2-1.6h3.6L15 5h-2.5l-1-1.2h-1L9.5 5Z" />
                <path fill="#fbbc04" d="M3 7h5l-1.6 2.2A5.8 5.8 0 0 0 6 12H3Z" />
                <path fill="#34a853" d="M12 18a6 6 0 0 0 5.6-3.9l1.9.7A8 8 0 0 1 12 20Z" />
              </svg>
            </form>
            <div className="search-chips" aria-hidden="true">
              <span className="search-chip">
                <svg className="search-chip__icon" viewBox="0 0 24 24" width="15" height="15">
                  <circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" strokeWidth="2" />
                  <path d="M12 7v5l3.2 2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                <span className="search-chip__label">Recent</span>
              </span>
              <span className="search-chip">
                <svg className="search-chip__icon" viewBox="0 0 24 24" width="15" height="15">
                  <path
                    fill="currentColor"
                    d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5Z"
                  />
                </svg>
                <span className="search-chip__label">Nearby</span>
              </span>
              <span className="search-chip">
                <svg className="search-chip__icon" viewBox="0 0 24 24" width="15" height="15">
                  <path
                    d="M3 17l6-6 4 4 7-7"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M14 8h6v6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span className="search-chip__label">Trending</span>
              </span>
            </div>
            <ReceiverSignals
              activeReveal={Boolean(activeReveal)}
              cachedReveal={Boolean(cachedReveal)}
              status={status}
            />
          </div>
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
  if (payload.kind === "location" && payload.autoOpenMaps !== false) {
    return (payload as LocationPayload).mapsUrl;
  }
  if (payload.kind === "celebrity" && payload.autoOpenSearch !== false) {
    return (payload as CelebrityPayload).searchUrl;
  }
  return undefined;
}

function handoffStorageKey(sessionCode: string) {
  return `openreveal:handoff:${sessionCode}`;
}

function safeSessionGet(key: string): string | null {
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSessionSet(key: string, value: string) {
  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    // sessionStorage may be unavailable (private mode / quota); the in-memory
    // ref still covers the common back-button case.
  }
}

function clearHandoff(sessionCode: string, ref: { current: string | null }) {
  ref.current = null;
  try {
    window.sessionStorage.removeItem(handoffStorageKey(sessionCode));
  } catch {
    // ignore
  }
}

function sendMessage(socket: WebSocket, message: unknown) {
  if (socket.readyState !== WebSocket.OPEN) return;
  socket.send(JSON.stringify(message));
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
