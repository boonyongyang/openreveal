import { useState, type FormEvent } from "react";
import { APP_NAME, SESSION_CODE_LENGTH } from "@openreveal/shared";

import { isValidSessionCode, normalizeSessionCode, sessionCodeFromPath } from "./lib/session-path.js";
import { ConsoleRoute } from "./routes/console-route.js";
import { PrivacyRoute } from "./routes/privacy-route.js";
import { ReceiverRoute } from "./routes/receiver-route.js";
import { ReportRoute } from "./routes/report-route.js";

export function App() {
  const path = window.location.pathname;
  if (path.startsWith("/console")) return <ConsoleRoute />;
  if (path.startsWith("/privacy")) return <PrivacyRoute />;
  if (path.startsWith("/report")) return <ReportRoute />;
  if (path.startsWith("/r/")) return <ReceiverRoute />;
  if (path.startsWith("/j")) return <JoinPage />;
  if (path.startsWith("/about")) return <AboutPage />;
  // Bare short code typed straight onto the spectator phone, e.g. domain/482.
  if (sessionCodeFromPath(path)) return <ReceiverRoute />;

  return <JoinPage />;
}

function AboutPage() {
  return (
    <main className="landing">
      <section className="landing__copy">
        <p className="eyebrow">Consent-based performance tool</p>
        <h1>{APP_NAME}</h1>
        <p>
          A web-first spectator-phone reveal system for performers who want a
          transparent, inspectable, open-source foundation.
        </p>
        <a className="button button--primary" href="/console">
          Open console
        </a>
        <a className="text-link" href="/privacy">
          Privacy and safety notes
        </a>
        <a className="text-link" href="/report">
          Report a safety concern
        </a>
      </section>
      <section className="landing__plane" aria-label="OpenReveal session preview">
        <div className="signal-line" />
        <div className="signal-dot signal-dot--one" />
        <div className="signal-dot signal-dot--two" />
        <div className="signal-dot signal-dot--three" />
        <p>Session link armed. Receiver standing by.</p>
      </section>
    </main>
  );
}

function JoinPage() {
  const [joinCode, setJoinCode] = useState("");
  const [joinError, setJoinError] = useState("");

  function submitJoinCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = normalizeSessionCode(joinCode);

    if (!isValidSessionCode(code)) {
      setJoinError(`Enter the ${SESSION_CODE_LENGTH}-character session code.`);
      return;
    }

    window.location.replace(`/${code}`);
  }

  return (
    <main className="join-shell">
      <section className="join-card">
        <p className="eyebrow">Receiver</p>
        <h1>Enter code</h1>
        <form className="join-form" onSubmit={submitJoinCode}>
          <label htmlFor="receiver-session-code">Session code</label>
          <div className="join-form__row">
            <input
              autoComplete="off"
              autoFocus
              id="receiver-session-code"
              inputMode="numeric"
              maxLength={SESSION_CODE_LENGTH}
              onChange={(event) => {
                setJoinCode(normalizeSessionCode(event.target.value));
                setJoinError("");
              }}
              placeholder={"0".repeat(SESSION_CODE_LENGTH)}
              value={joinCode}
            />
            <button className="button button--primary" type="submit">
              Join
            </button>
          </div>
          {joinError ? <p className="join-form__error">{joinError}</p> : null}
        </form>
      </section>
    </main>
  );
}

