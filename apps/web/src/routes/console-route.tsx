import type { ChangeEvent, FormEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

import type { ConnectionState, ConsoleSessionState, EffectKind, WsEnvelope } from "@openreveal/shared";

import {
  createSession,
  endSession,
  getAuthSession,
  getSession,
  login,
  logout,
  prepareReveal,
  resetSession,
  sendReveal
} from "../lib/api.js";
import { registerBuiltInWebEffects, webEffects } from "../effects/index.js";
import { createBrowserId } from "../lib/id.js";
import { formatConnectionState, websocketUrl } from "../lib/status.js";
import { SpectatorReceiver } from "./receiver-route.js";

type AuthState = "checking" | "anonymous" | "authenticated";
type ConsoleMode = "quick" | "advanced";
type RevealState = "idle" | "preparing" | "prepared" | "sent" | "delivered";
type EffectDraft = Record<string, unknown>;
const PRESET_SCHEMA = "openreveal.effect-preset.v1";
const REVEAL_STATE_ORDER: Record<RevealState, number> = {
  idle: 0,
  preparing: 1,
  prepared: 2,
  sent: 3,
  delivered: 4
};

interface ActivityItem {
  id: string;
  label: string;
}

interface ReceiverHistoryItem {
  id: string;
  at: string;
  state: ConnectionState;
}

interface PreparedReveal {
  revealId: string;
  kind: EffectKind;
  state: RevealState;
  summary: string;
}

registerBuiltInWebEffects();

export function ConsoleRoute() {
  const [auth, setAuth] = useState<AuthState>("checking");
  const [passphrase, setPassphrase] = useState("");
  const [session, setSession] = useState<ConsoleSessionState | null>(null);
  const [qrSvg, setQrSvg] = useState("");
  const [error, setError] = useState("");
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [receiverHistory, setReceiverHistory] = useState<ReceiverHistoryItem[]>([]);
  const [demoOpen, setDemoOpen] = useState(false);
  const [consoleMode, setConsoleMode] = useState<ConsoleMode>("quick");
  const [copyStatus, setCopyStatus] = useState("");
  const [lastRevealLatencyMs, setLastRevealLatencyMs] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [selectedEffect, setSelectedEffect] = useState<EffectKind>("location");
  const [drafts, setDrafts] = useState<Record<EffectKind, EffectDraft>>({
    location: { kind: "location", name: "Kuala Lumpur", country: "Malaysia" },
    celebrity: { kind: "celebrity", name: "Michelle Yeoh", subtitle: "Actor" },
    custom_text: {
      kind: "custom_text",
      body: ""
    }
  });
  const [prepared, setPrepared] = useState<PreparedReveal | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const presetImportRef = useRef<HTMLInputElement | null>(null);
  const preparedRef = useRef<PreparedReveal | null>(null);

  useEffect(() => {
    void getAuthSession()
      .then((result) => setAuth(result.authenticated ? "authenticated" : "anonymous"))
      .catch(() => setAuth("anonymous"));
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    preparedRef.current = prepared;
  }, [prepared]);

  useEffect(() => {
    socketRef.current?.close();
    if (!session || auth !== "authenticated") return;

    const socket = new WebSocket(websocketUrl(session.sessionCode, "performer"));
    socketRef.current = socket;
    socket.addEventListener("message", (event) => {
      const envelope = JSON.parse(String(event.data)) as WsEnvelope;
      handleSocketEvent(envelope);
    });
    socket.addEventListener("close", () => {
      setSession((current) =>
        current ? { ...current, connectionState: "disconnected" } : current
      );
    });

    return () => socket.close();
  }, [auth, session?.sessionCode]);

  const expiry = useMemo(() => {
    if (!session) return "";
    return new Intl.DateTimeFormat(undefined, {
      hour: "2-digit",
      minute: "2-digit"
    }).format(new Date(session.expiresAt));
  }, [session]);

  const expiryCountdown = useMemo(() => {
    if (!session) return "";
    return formatCountdown(new Date(session.expiresAt).getTime() - now);
  }, [now, session]);

  const effectList = useMemo(() => Array.from(webEffects.values()), []);
  const activeEffect = webEffects.get(selectedEffect);
  const sessionEnded = session?.status === "expired";
  const joinPageUrl = useMemo(() => {
    if (!session) return "";
    return new URL("/", session.receiverUrl).toString();
  }, [session]);
  const displaySessionCode = session ? formatSessionCode(session.sessionCode) : "";
  // The receiver address shown only in Advanced mode, e.g. "openreveal.web.app/ABCD1234".
  const typedUrl = useMemo(
    () => (session ? session.receiverUrl.replace(/^https?:\/\//, "") : ""),
    [session]
  );

  function pushActivity(label: string) {
    setActivity((items) => [
      { id: createBrowserId(), label },
      ...items.slice(0, 7)
    ]);
  }

  function pushReceiverHistory(state: ConnectionState) {
    setReceiverHistory((items) => [
      { id: createBrowserId(), at: new Date().toISOString(), state },
      ...items.slice(0, 5)
    ]);
  }

  function replacePrepared(next: PreparedReveal | null) {
    preparedRef.current = next;
    setPrepared(next);
  }

  function transitionPrepared(revealId: string, state: RevealState) {
    setPrepared((current) => {
      if (!current || current.revealId !== revealId) return current;
      if (REVEAL_STATE_ORDER[state] < REVEAL_STATE_ORDER[current.state]) return current;
      const next = { ...current, state };
      preparedRef.current = next;
      return next;
    });
  }

  function handleSocketEvent(envelope: WsEnvelope) {
    if (envelope.type === "session_state") {
      const data = envelope.data as {
        connectionState: ConnectionState;
        status: "live" | "expired" | "in_use";
      };
      setSession((current) =>
        current
          ? {
              ...current,
              status: current.status === "expired" || data.status === "in_use"
                ? current.status
                : data.status,
              connectionState: data.connectionState
            }
          : current
      );
      return;
    }

    if (envelope.type === "connection_state_changed") {
      const data = envelope.data as { state: ConnectionState };
      setSession((current) =>
        current ? { ...current, connectionState: data.state } : current
      );
      pushReceiverHistory(data.state);
      pushActivity(`Receiver ${formatConnectionState(data.state).toLowerCase()}`);
      return;
    }

    if (envelope.type === "receiver.prepared_ack") {
      const data = envelope.data as { revealId: string };
      transitionPrepared(data.revealId, "prepared");
      pushActivity("Receiver prepared reveal");
      return;
    }

    if (envelope.type === "reveal_sent") {
      const data = envelope.data as { revealId: string };
      transitionPrepared(data.revealId, "sent");
      return;
    }

    if (envelope.type === "receiver.reveal_ack") {
      const data = envelope.data as { revealId: string; latencyMs?: number };
      if (preparedRef.current?.revealId !== data.revealId) return;
      transitionPrepared(data.revealId, "delivered");
      if (typeof data.latencyMs === "number") {
        setLastRevealLatencyMs(data.latencyMs);
        pushActivity(`Reveal delivered in ${formatLatency(data.latencyMs)}`);
      } else {
        pushActivity("Reveal delivered");
      }
      return;
    }

    if (envelope.type === "session_reset") {
      replacePrepared(null);
      setLastRevealLatencyMs(null);
      return;
    }

    if (envelope.type === "session_expired") {
      setSession((current) =>
        current ? { ...current, status: "expired", connectionState: "disconnected" } : current
      );
      replacePrepared(null);
      setLastRevealLatencyMs(null);
      pushActivity("Session ended");
      return;
    }

    if (envelope.type === "receiver.joined") {
      pushActivity("Receiver joined");
      if (session) {
        void getSession(session.sessionCode).then(setSession).catch(() => undefined);
      }
      return;
    }

    if (envelope.type === "receiver.left") {
      pushActivity("Receiver left");
    }
  }

  async function submitLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    try {
      await login(passphrase);
      setAuth("authenticated");
      setPassphrase("");
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Login failed");
    }
  }

  async function createLiveSession() {
    setError("");
    try {
      const created = await createSession();
      const next = await getSession(created.sessionCode);
      setSession(next);
      setQrSvg(created.qrSvg);
      setDemoOpen(false);
      replacePrepared(null);
      setLastRevealLatencyMs(null);
      setReceiverHistory([]);
      setCopyStatus("");
      setActivity([{ id: createBrowserId(), label: "Session created" }]);
    } catch (sessionError) {
      setError(sessionError instanceof Error ? sessionError.message : "Session failed");
    }
  }

  async function copyText(text: string, label: string) {
    const copied = await copyTextToClipboard(text);
    const message = copied
      ? `${label} copied`
      : `Copy blocked. Select the ${label.toLowerCase()} manually.`;
    setCopyStatus(message);
    pushActivity(message);
  }

  async function copyJoinPageUrl() {
    if (!joinPageUrl) return;
    await copyText(joinPageUrl, "Join page");
  }

  async function copyReceiverUrl() {
    if (!session) return;
    await copyText(session.receiverUrl, "Receiver URL");
  }

  async function copySessionCode() {
    if (!session) return;
    await copyText(session.sessionCode, "Session code");
  }

  async function resetLiveSession() {
    if (!session || sessionEnded) return;
    replacePrepared(null);
    await resetSession(session.sessionCode);
    setLastRevealLatencyMs(null);
    pushActivity("Session reset");
  }

  async function armReveal() {
    if (!session || !activeEffect || sessionEnded) return;
    setError("");
    replacePrepared(null);
    try {
      const summary = summarizeRevealDraft(selectedEffect, drafts[selectedEffect]);
      replacePrepared({ revealId: "pending", kind: selectedEffect, state: "preparing", summary });
      const response = await prepareReveal(session.sessionCode, selectedEffect, drafts[selectedEffect]);
      replacePrepared({
        revealId: response.revealId,
        kind: response.kind,
        state: "prepared",
        summary
      });
      pushActivity(`${activeEffect.label} reveal armed`);
    } catch (armError) {
      replacePrepared(null);
      setError(armError instanceof Error ? armError.message : "Could not arm reveal");
    }
  }

  function exportSelectedPreset() {
    const draft = drafts[selectedEffect];
    const summary = summarizeRevealDraft(selectedEffect, draft);
    const preset = {
      schema: PRESET_SCHEMA,
      kind: selectedEffect,
      label: summary,
      input: draft
    };
    const blob = new Blob([`${JSON.stringify(preset, null, 2)}\n`], {
      type: "application/json"
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${slugify(summary || selectedEffect)}.openreveal-preset.json`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
    pushActivity(`${activeEffect?.label ?? "Effect"} preset exported`);
  }

  async function importPreset(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setError("");
    try {
      const preset = parsePreset(await file.text());
      if (!webEffects.has(preset.kind)) {
        throw new Error("preset_effect_unknown");
      }
      setSelectedEffect(preset.kind);
      setDrafts((current) => ({
        ...current,
        [preset.kind]: {
          ...current[preset.kind],
          kind: preset.kind,
          ...preset.input
        }
      }));
      replacePrepared(null);
      pushActivity(`${webEffects.get(preset.kind)?.label ?? "Effect"} preset imported`);
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : "preset_invalid");
    }
  }

  async function sendPreparedReveal() {
    if (!session || !prepared || prepared.revealId === "pending" || sessionEnded) return;
    setError("");
    try {
      const response = await sendReveal(session.sessionCode);
      const current = preparedRef.current;
      if (current?.revealId !== response.revealId || current.state !== "delivered") {
        replacePrepared({
          revealId: response.revealId,
          kind: response.kind,
          state: "sent",
          summary: current?.summary ?? response.kind
        });
      }
      pushActivity("Reveal sent");
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Could not send reveal");
    }
  }

  async function endLiveSession() {
    if (!session || sessionEnded) return;
    await endSession(session.sessionCode);
    setSession((current) => (current ? { ...current, status: "expired" } : current));
    replacePrepared(null);
    setLastRevealLatencyMs(null);
    pushActivity("Session ended");
  }

  async function signOut() {
    socketRef.current?.close();
    await logout();
    setSession(null);
    setQrSvg("");
    setAuth("anonymous");
  }

  if (auth === "checking") {
    return <main className="console-shell console-shell--center">Checking console access</main>;
  }

  if (auth === "anonymous") {
    return (
      <main className="console-shell console-shell--center">
        <form className="login-panel" onSubmit={submitLogin}>
          <p className="eyebrow">OpenReveal console</p>
          <h1>Performer access</h1>
          <label>
            Passphrase
            <input
              autoFocus
              value={passphrase}
              onChange={(event) => setPassphrase(event.target.value)}
              type="password"
              placeholder="Enter local passphrase"
            />
          </label>
          {error ? <p className="form-error">{error}</p> : null}
          <button className="button button--primary" type="submit">
            Continue
          </button>
          <a className="text-link" href="/privacy">
            Privacy and safety notes
          </a>
        </form>
      </main>
    );
  }

  const ActiveForm = activeEffect?.PerformerForm;
  const armDisabledReason = !session
    ? "Create a session first"
    : sessionEnded
      ? "Session ended"
      : session.connectionState === "disconnected"
      ? "Spectator not connected"
      : "";
  const sendDisabledReason = !prepared
    ? "Arm a reveal first"
    : sessionEnded
      ? "Session ended"
    : prepared.state === "preparing"
      ? "Waiting for receiver"
      : prepared.state === "delivered"
        ? "Reveal already delivered"
        : "";
  const resetDisabledReason = !session
    ? "Create a session first"
    : sessionEnded
      ? "Session ended"
      : "";
  const endDisabledReason = !session
    ? "Create a session first"
    : sessionEnded
      ? "Session already ended"
      : "";
  const preparedLabel = prepared ? revealStateLabel(prepared.state) : "No reveal armed";
  const receiverStateLabel = formatConnectionState(session?.connectionState ?? "disconnected");
  const effectTabs = (
    <div className="effect-tabs" role="tablist" aria-label="Reveal effects">
      {effectList.map((effect) => (
        <button
          aria-selected={effect.kind === selectedEffect}
          className="effect-tab"
          key={effect.kind}
          onClick={() => {
            setSelectedEffect(effect.kind);
            replacePrepared(null);
          }}
          role="tab"
          type="button"
        >
          {effect.label}
        </button>
      ))}
    </div>
  );
  const effectForm = ActiveForm ? (
    <ActiveForm
      value={drafts[selectedEffect] as never}
      onChange={(next) =>
        setDrafts((current) => ({
          ...current,
          [selectedEffect]: {
            ...current[selectedEffect],
            ...(next as EffectDraft)
          }
        }))
      }
    />
  ) : null;
  const armedSummary = (
    <div className="armed-summary" data-testid="armed-summary">
      <span>Armed reveal</span>
      <strong>
        {prepared
          ? `${webEffects.get(prepared.kind)?.label ?? prepared.kind}: ${prepared.summary}`
          : "None"}
      </strong>
    </div>
  );
  const controlReasons = (
    <div className="control-reasons">
      <p data-testid="arm-disabled-reason">
        Arm: {armDisabledReason || "Ready to stage this reveal"}
      </p>
      <p data-testid="send-disabled-reason">
        Send: {sendDisabledReason || "Ready to trigger"}
      </p>
    </div>
  );
  const revealControls = (
    <div className="button-row reveal-actions">
      <button
        className="button"
        disabled={Boolean(armDisabledReason) || prepared?.state === "preparing"}
        onClick={armReveal}
        title={armDisabledReason || "Validate and stage this reveal"}
        type="button"
      >
        Arm
      </button>
      <button
        className="button button--primary"
        disabled={Boolean(sendDisabledReason) || prepared?.state !== "prepared"}
        onClick={sendPreparedReveal}
        title={sendDisabledReason || "Trigger the spectator reveal"}
        type="button"
      >
        Send
      </button>
      <button
        className="button"
        disabled={Boolean(resetDisabledReason)}
        onClick={resetLiveSession}
        title={resetDisabledReason || "Reset the spectator page"}
        type="button"
      >
        Reset
      </button>
      <button
        className="button button--danger"
        disabled={Boolean(endDisabledReason)}
        onClick={endLiveSession}
        title={endDisabledReason || "End this session"}
        type="button"
      >
        End
      </button>
    </div>
  );

  return (
    <main className="console-shell">
      <header className="console-topbar">
        <div>
          <p className="eyebrow">OpenReveal</p>
          <h1>Performer console</h1>
        </div>
        <div className="topbar-actions">
          <div className="mode-switch" aria-label="Console mode">
            <button
              aria-pressed={consoleMode === "quick"}
              className="button"
              onClick={() => setConsoleMode("quick")}
              type="button"
            >
              Quick session
            </button>
            <button
              aria-pressed={consoleMode === "advanced"}
              className="button"
              onClick={() => setConsoleMode("advanced")}
              type="button"
            >
              Advanced
            </button>
          </div>
          <button className="button" onClick={createLiveSession} type="button">
            {session ? "Start new session" : "New session"}
          </button>
          <button className="button button--quiet" onClick={signOut} type="button">
            Log out
          </button>
          {session ? (
            <p className="topbar-note">Starting a new session abandons the current receiver link.</p>
          ) : null}
        </div>
      </header>

      {error ? <p className="form-error">{error}</p> : null}

      {consoleMode === "quick" ? (
        <section className="quick-session">
          <section className="quick-session__stage workspace-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Quick session</p>
                <h2 className={session ? "session-code-display" : ""}>
                  {session ? displaySessionCode : "Ready when you are"}
                </h2>
              </div>
              <span className={`status-pill status-pill--${session?.status ?? "idle"}`}>
                {session?.status ?? "idle"}
              </span>
            </div>

            {session ? (
              <div className="quick-session__share">
                <div className="qr-box" dangerouslySetInnerHTML={{ __html: qrSvg }} />
                <div className="quick-session__copy">
                  <p className="quick-session__instruction">
                    Open <strong>{typedUrl}</strong> in the phone browser (or share this code):
                  </p>
                  <div className="quick-session__code" aria-label="Session code">
                    {displaySessionCode}
                  </div>
                  <div className="button-row button-row--compact">
                    <button className="button" onClick={copyJoinPageUrl} type="button">
                      Copy site
                    </button>
                    <button className="button" onClick={copySessionCode} type="button">
                      Copy code
                    </button>
                  </div>
                  <p className="session-meta">
                    {sessionEnded ? "Session ended" : `Expires in ${expiryCountdown}`}
                    {expiry ? ` · ${expiry}` : ""}
                  </p>
                  {copyStatus ? <p className="copy-feedback">{copyStatus}</p> : null}
                </div>
              </div>
            ) : (
              <div className="quick-session__empty">
                <p>
                  Start a session, share the QR or code, choose one reveal, then use
                  Arm and Send.
                </p>
                <button className="button button--primary" onClick={createLiveSession} type="button">
                  Create session
                </button>
              </div>
            )}
          </section>

          <section className="quick-session__status workspace-panel">
            <div>
              <p className="eyebrow">Receiver</p>
              <h2>{receiverStateLabel}</h2>
            </div>
            <span className={`connection-dot connection-dot--${session?.connectionState ?? "disconnected"}`} />
            <p className="muted">
              {session?.receiver?.lastSeenAt
                ? `Last seen ${new Date(session.receiver.lastSeenAt).toLocaleTimeString()}`
                : "Waiting for the spectator phone."}
            </p>
          </section>

          <section className="quick-session__controls workspace-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Reveal</p>
                <h2>{activeEffect?.label ?? "Effect"}</h2>
              </div>
              <span className={`status-pill status-pill--${prepared?.state ?? "idle"}`}>
                {preparedLabel}
              </span>
            </div>
            {effectTabs}
            {effectForm}
            {armedSummary}
            {controlReasons}
            {revealControls}
          </section>
        </section>
      ) : null}

      {consoleMode === "advanced" ? (
      <section className="console-grid">
        <section className="workspace-panel workspace-panel--primary">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Live session</p>
              <h2>{session ? session.sessionCode : "No session"}</h2>
            </div>
            <span className={`status-pill status-pill--${session?.status ?? "idle"}`}>
              {session?.status ?? "idle"}
            </span>
          </div>

          {session ? (
            <div className="session-layout">
              <div className="qr-box" dangerouslySetInnerHTML={{ __html: qrSvg }} />
              <div className="session-details">
                <label>
                  Phone setup
                  <input readOnly value={`Open ${typedUrl} in the phone browser`} />
                </label>
                <label>
                  Direct receiver URL
                  <input readOnly value={session.receiverUrl} />
                </label>
                <div className="button-row">
                  <button className="button" onClick={copyJoinPageUrl} type="button">
                    Copy site
                  </button>
                  <button className="button" onClick={copyReceiverUrl} type="button">
                    Copy URL
                  </button>
                  <button className="button" onClick={copySessionCode} type="button">
                    Copy code
                  </button>
                  <button
                    className="button"
                    onClick={() => setDemoOpen((open) => !open)}
                    type="button"
                  >
                    {demoOpen ? "Hide demo" : "Demo mode"}
                  </button>
                </div>
                <p className="session-meta">
                  {sessionEnded ? "Session ended" : `Expires in ${expiryCountdown}`}
                  {expiry ? ` · ${expiry}` : ""}
                </p>
                {copyStatus ? <p className="copy-feedback">{copyStatus}</p> : null}
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <p>Create a session to generate the spectator receiver link and QR code.</p>
              <button className="button button--primary" onClick={createLiveSession} type="button">
                Create session
              </button>
            </div>
          )}
        </section>

        <section className="workspace-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Receiver</p>
              <h2>{formatConnectionState(session?.connectionState ?? "disconnected")}</h2>
            </div>
            <span className={`connection-dot connection-dot--${session?.connectionState ?? "disconnected"}`} />
          </div>
          <dl className="metrics">
            <div>
              <dt>Device</dt>
              <dd>{session?.receiver?.ua ?? "Waiting"}</dd>
            </div>
            <div>
              <dt>Last seen</dt>
              <dd>{session?.receiver?.lastSeenAt ? new Date(session.receiver.lastSeenAt).toLocaleTimeString() : "Not seen"}</dd>
            </div>
            <div>
              <dt>Last reveal latency</dt>
              <dd data-testid="last-reveal-latency">
                {lastRevealLatencyMs === null ? "Not measured" : formatLatency(lastRevealLatencyMs)}
              </dd>
            </div>
          </dl>
          <div className="receiver-history">
            <p className="receiver-history__title">State history</p>
            <ol>
              {receiverHistory.length ? (
                receiverHistory.map((item) => (
                  <li key={item.id}>
                    <span>{formatConnectionState(item.state)}</span>
                    <time>{new Date(item.at).toLocaleTimeString()}</time>
                  </li>
                ))
              ) : (
                <li>
                  <span>No receiver state changes yet</span>
                </li>
              )}
            </ol>
          </div>
        </section>

        <section className="workspace-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Effects</p>
              <h2>{activeEffect?.label ?? "Effect"}</h2>
            </div>
            <span className={`status-pill status-pill--${prepared?.state ?? "idle"}`}>
              {preparedLabel}
            </span>
          </div>
          <div className="effect-tabs" role="tablist" aria-label="Reveal effects">
            {effectList.map((effect) => (
              <button
                aria-selected={effect.kind === selectedEffect}
                className="effect-tab"
                key={effect.kind}
                onClick={() => {
                  setSelectedEffect(effect.kind);
                  replacePrepared(null);
                }}
                role="tab"
                type="button"
              >
                {effect.label}
              </button>
            ))}
          </div>
          {ActiveForm ? (
            <ActiveForm
              value={drafts[selectedEffect] as never}
              onChange={(next) =>
                setDrafts((current) => ({
                  ...current,
                  [selectedEffect]: {
                    ...current[selectedEffect],
                    ...(next as EffectDraft)
                  }
                }))
              }
            />
          ) : null}
          <div className="preset-actions">
            <button className="button" onClick={exportSelectedPreset} type="button">
              Export preset
            </button>
            <button
              className="button"
              onClick={() => presetImportRef.current?.click()}
              type="button"
            >
              Import preset
            </button>
            <input
              ref={presetImportRef}
              aria-label="Import preset file"
              className="visually-hidden"
              type="file"
              accept="application/json,.json"
              onChange={importPreset}
            />
          </div>
          <div className="armed-summary" data-testid="armed-summary">
            <span>Armed reveal</span>
            <strong>{prepared ? `${webEffects.get(prepared.kind)?.label ?? prepared.kind}: ${prepared.summary}` : "None"}</strong>
          </div>
          <div className="control-reasons">
            <p data-testid="arm-disabled-reason">
              Arm: {armDisabledReason || "Ready to stage this reveal"}
            </p>
            <p data-testid="send-disabled-reason">
              Send: {sendDisabledReason || "Ready to trigger"}
            </p>
          </div>
          <div className="button-row">
            <button
              className="button"
              disabled={Boolean(armDisabledReason) || prepared?.state === "preparing"}
              onClick={armReveal}
              title={armDisabledReason || "Validate and stage this reveal"}
              type="button"
            >
              Arm
            </button>
            <button
              className="button button--primary"
              disabled={Boolean(sendDisabledReason) || prepared?.state !== "prepared"}
              onClick={sendPreparedReveal}
              title={sendDisabledReason || "Trigger the spectator reveal"}
              type="button"
            >
              Send
            </button>
            <button
              className="button"
              disabled={Boolean(resetDisabledReason)}
              onClick={resetLiveSession}
              title={resetDisabledReason || "Reset the spectator page"}
              type="button"
            >
              Reset
            </button>
            <button
              className="button button--danger"
              disabled={Boolean(endDisabledReason)}
              onClick={endLiveSession}
              title={endDisabledReason || "End this session"}
              type="button"
            >
              End
            </button>
          </div>
        </section>

        <section className="workspace-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Activity</p>
              <h2>Session log</h2>
            </div>
          </div>
          <ol className="activity-list">
            {activity.length ? (
              activity.map((item) => <li key={item.id}>{item.label}</li>)
            ) : (
              <li>No activity yet</li>
            )}
          </ol>
        </section>
      </section>
      ) : null}

      {demoOpen && session ? (
        <aside className="demo-pane">
          <div className="demo-pane__label">DEMO</div>
          <SpectatorReceiver embedded sessionCode={session.sessionCode} />
        </aside>
      ) : null}
    </main>
  );
}

function revealStateLabel(state: RevealState) {
  switch (state) {
    case "idle":
      return "Idle";
    case "preparing":
      return "Preparing";
    case "prepared":
      return "Ready";
    case "sent":
      return "Sent";
    case "delivered":
      return "Delivered";
  }
}

function formatLatency(latencyMs: number) {
  return `${Math.max(0, Math.round(latencyMs))} ms`;
}

function formatSessionCode(code: string) {
  return code.replace(/(.{4})/g, "$1 ").trim();
}

async function copyTextToClipboard(text: string) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Non-HTTPS LAN origins often block navigator.clipboard. Try the legacy path.
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  textarea.style.top = "0";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();

  try {
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    textarea.remove();
  }
}

function formatCountdown(msUntilExpiry: number) {
  if (msUntilExpiry <= 0) return "ended";
  const totalSeconds = Math.ceil(msUntilExpiry / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  }
  return `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
}

function summarizeRevealDraft(kind: EffectKind, draft: EffectDraft) {
  if (kind === "location") {
    const parts = [draft.name, draft.region, draft.country]
      .map((value) => (typeof value === "string" ? value.trim() : ""))
      .filter(Boolean);
    return parts.join(", ") || "Untitled location";
  }
  if (kind === "celebrity") {
    const name = typeof draft.name === "string" ? draft.name.trim() : "";
    const subtitle = typeof draft.subtitle === "string" ? draft.subtitle.trim() : "";
    return [name || "Untitled celebrity", subtitle].filter(Boolean).join(" · ");
  }
  if (kind === "custom_text") {
    const body = typeof draft.body === "string" ? draft.body.trim() : "";
    return body.slice(0, 80) || "Untitled text";
  }
  return kind;
}

function parsePreset(raw: string): {
  kind: EffectKind;
  input: EffectDraft;
  label?: string;
  schema: string;
} {
  const parsed = JSON.parse(raw) as unknown;
  if (!isRecord(parsed)) throw new Error("preset_invalid");
  if (parsed.schema !== PRESET_SCHEMA) throw new Error("preset_schema_invalid");
  if (typeof parsed.kind !== "string" || !webEffects.has(parsed.kind as EffectKind)) {
    throw new Error("preset_effect_unknown");
  }
  if (!isRecord(parsed.input)) throw new Error("preset_input_invalid");

  return {
    schema: parsed.schema,
    kind: parsed.kind as EffectKind,
    label: typeof parsed.label === "string" ? parsed.label : undefined,
    input: parsed.input
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function slugify(value: string) {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "openreveal-preset";
}
