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
  // Bare session code typed directly on the spectator phone, e.g. domain/ABCD2345.
  if (sessionCodeFromPath(path)) return <ReceiverRoute />;

  return <JoinPage />;
}

function AboutPage() {
  return (
    <main className="brand-page">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="brand-nav">
        <a className="brand-lockup" href="/about" aria-label={`${APP_NAME} home`}>
          <BrandMark />
          <span>{APP_NAME}</span>
        </a>
        <nav aria-label="About OpenReveal">
          <a href="#flow">The routine</a>
          <a href="#under-the-hood">Under the hood</a>
          <a href="#principles">Principles</a>
          <a href="https://github.com/boonyongyang/openreveal" rel="noreferrer" target="_blank">
            Source
          </a>
        </nav>
        <a className="brand-nav__action" href="/console">
          Open console
        </a>
      </header>

      <div id="main-content">
        <section className="brand-hero">
          <div className="brand-hero__copy">
            <p className="brand-kicker">
              <span aria-hidden="true" />
              Live spectator reveals, on the open web
            </p>
            <h1>
              One shared moment.
              <span>Nothing to install.</span>
            </h1>
            <p className="brand-hero__lede">
              {APP_NAME} gives performers a private control surface and gives spectators one
              simple thing to do: open the site, enter a code, and wait for the reveal.
            </p>
            <div className="brand-hero__actions">
              <a className="brand-button brand-button--primary" href="/console">
                Run a session
              </a>
              <a className="brand-button brand-button--quiet" href="#flow">
                See the routine
              </a>
            </div>
            <ul className="brand-proof" aria-label="OpenReveal highlights">
              <li>One short code</li>
              <li>One live connection</li>
              <li>No app or account</li>
            </ul>
          </div>

          <div className="brand-hero__scene" aria-hidden="true">
            <div className="hero-aura hero-aura--one" />
            <div className="hero-aura hero-aura--two" />
            <div className="hero-orbit hero-orbit--wide" />
            <div className="hero-orbit hero-orbit--tight" />
            <div className="hero-console-card">
              <div className="hero-console-card__bar">
                <span>Live session</span>
                <span className="hero-live-indicator">Receiver ready</span>
              </div>
              <p className="hero-console-card__code">ARCA 7423</p>
              <p>Ask the spectator to enter the code.</p>
              <div className="hero-console-card__cue">
                <span>Location</span>
                <strong>Ready to send</strong>
              </div>
            </div>
            <div className="hero-phone">
              <div className="hero-phone__speaker" />
              <div className="hero-phone__screen">
                <div className="hero-phone__orb hero-phone__orb--large" />
                <div className="hero-phone__orb hero-phone__orb--small" />
                <div className="hero-phone__line">
                  <span />
                  <i />
                </div>
                <p>Waiting</p>
              </div>
            </div>
            <div className="hero-signal hero-signal--one" />
            <div className="hero-signal hero-signal--two" />
          </div>
        </section>

        <section className="brand-statement" aria-labelledby="statement-title">
          <p className="brand-section-label">A cleaner routine</p>
          <h2 id="statement-title">The technology stays backstage.</h2>
          <p>
            No app install. No account. No link hunting. The performer creates a session,
            says the code, and keeps the moment moving.
          </p>
        </section>

        <section className="brand-flow" id="flow" aria-labelledby="flow-title">
          <div className="brand-flow__intro">
            <p className="brand-section-label">The live flow</p>
            <h2 id="flow-title">Three moves, one reveal.</h2>
            <p>
              The system is intentionally small. Every screen has one responsibility, so a
              performer can work at a glance and a spectator never has to decipher the setup.
            </p>
          </div>
          <ol className="story-steps">
            <li>
              <span className="story-steps__number">01</span>
              <div>
                <h3>Create a live session</h3>
                <p>The private console produces a large grouped code and QR backup.</p>
              </div>
              <span className="story-steps__mark">/console</span>
            </li>
            <li>
              <span className="story-steps__number">02</span>
              <div>
                <h3>Let the phone settle</h3>
                <p>The spectator opens the short site, enters the code, and sees a neutral waiting page.</p>
              </div>
              <span className="story-steps__mark">/</span>
            </li>
            <li>
              <span className="story-steps__number">03</span>
              <div>
                <h3>Arm, then send</h3>
                <p>The reveal appears only when the performer triggers it over the live connection.</p>
              </div>
              <span className="story-steps__mark">live</span>
            </li>
          </ol>
        </section>

        <section
          className="brand-under-the-hood"
          id="under-the-hood"
          aria-labelledby="under-the-hood-title"
        >
          <div className="brand-under-the-hood__intro">
            <div>
              <p className="brand-section-label">Under the hood</p>
              <h2 id="under-the-hood-title">One small system. A visible handoff.</h2>
            </div>
            <div className="brand-under-the-hood__copy">
              <p>
                A session begins in the private console. The spectator page joins with the
                code, receives state over one WebSocket, and acknowledges when the prepared
                reveal is ready and when delivery completes.
              </p>
              <p>
                This leaves the performer with a simple, inspectable sequence instead of a
                fragile handoff between separate apps or services.
              </p>
            </div>
          </div>

          <div className="brand-wire" aria-label="The live OpenReveal delivery path">
            <article className="brand-wire__node">
              <span>01</span>
              <h3>Private console</h3>
              <p>Creates the session and prepares the reveal.</p>
              <small>Same-origin performer access</small>
            </article>
            <p className="brand-wire__link">Session and WebSocket</p>
            <article className="brand-wire__node">
              <span>02</span>
              <h3>Session service</h3>
              <p>Keeps one short-lived session and its delivery state.</p>
              <small>Single-instance SQLite store</small>
            </article>
            <p className="brand-wire__link">State and reveal event</p>
            <article className="brand-wire__node">
              <span>03</span>
              <h3>Spectator browser</h3>
              <p>Waits on the neutral page until the performer sends.</p>
              <small>Prepared and delivered acknowledgements</small>
            </article>
          </div>

          <div className="brand-evidence" data-testid="live-flow-screens">
            <div className="brand-evidence__heading">
              <p className="brand-section-label">Captured from the live flow</p>
              <h3>Four moments, one shared connection.</h3>
              <p>
                These are real app captures, generated from the same session flow used in
                automated end-to-end testing.
              </p>
            </div>

            <figure className="brand-evidence__wide">
              <div className="brand-evidence__frame">
                <img
                  alt="OpenReveal Quick session console showing a grouped session code, QR code, and phone setup instructions"
                  height="900"
                  loading="lazy"
                  src="/showcase/console-session.png"
                  width="1440"
                />
              </div>
              <figcaption>
                <span>01</span>
                <strong>Create a session.</strong> The performer gets a code, a QR backup,
                and a single phone instruction.
              </figcaption>
            </figure>

            <figure className="brand-evidence__phone">
              <div className="brand-evidence__frame">
                <img
                  alt="OpenReveal spectator phone waiting on a neutral screen after joining a session"
                  height="744"
                  loading="lazy"
                  src="/showcase/receiver-standby.png"
                  width="394"
                />
              </div>
              <figcaption>
                <span>02</span>
                <strong>The phone settles.</strong> There is no navigation to manage while it
                waits for the reveal.
              </figcaption>
            </figure>

            <figure className="brand-evidence__wide brand-evidence__wide--armed">
              <div className="brand-evidence__frame">
                <img
                  alt="OpenReveal performer console with a prepared Kuala Lumpur location reveal and enabled send control"
                  height="900"
                  loading="lazy"
                  src="/showcase/console-armed.png"
                  width="1440"
                />
              </div>
              <figcaption>
                <span>03</span>
                <strong>Arm before send.</strong> The console shows when the receiver has
                prepared the reveal and when sending is available.
              </figcaption>
            </figure>

            <figure className="brand-evidence__phone brand-evidence__phone--result">
              <div className="brand-evidence__frame">
                <img
                  alt="OpenReveal spectator phone displaying a delivered Kuala Lumpur location reveal"
                  height="744"
                  loading="lazy"
                  src="/showcase/reveal-location.png"
                  width="394"
                />
              </div>
              <figcaption>
                <span>04</span>
                <strong>Deliver one reveal.</strong> The event appears on the page the
                spectator chose to open.
              </figcaption>
            </figure>
          </div>
        </section>

        <section className="brand-principles" id="principles" aria-labelledby="principles-title">
          <div>
            <p className="brand-section-label">The boundary matters</p>
            <h2 id="principles-title">A reveal should feel surprising, not invasive.</h2>
          </div>
          <div className="brand-principles__list">
            <article>
              <span>01</span>
              <h3>Intentional entry</h3>
              <p>Spectators choose to open the page and join with a short session code.</p>
            </article>
            <article>
              <span>02</span>
              <h3>Visible control</h3>
              <p>The performer controls only pages served by this project, never the phone itself.</p>
            </article>
            <article>
              <span>03</span>
              <h3>Inspectable by design</h3>
              <p>The project is open source, with privacy, safety, and deployment notes in the repository.</p>
            </article>
          </div>
        </section>

        <section className="brand-cta" aria-labelledby="cta-title">
          <div>
            <p className="brand-section-label">Ready to rehearse</p>
            <h2 id="cta-title">Set the stage in under a minute.</h2>
          </div>
          <div className="brand-cta__actions">
            <a className="brand-button brand-button--primary" href="/console">
              Open console
            </a>
            <a className="brand-button brand-button--quiet" href="/privacy">
              Read the safety boundary
            </a>
          </div>
        </section>
      </div>

      <footer className="brand-footer">
        <a className="brand-lockup" href="/about">
          <BrandMark />
          <span>{APP_NAME}</span>
        </a>
        <div>
          <a href="/privacy">Privacy and use</a>
          <a href="/report">Report a concern</a>
          <a href="https://github.com/boonyongyang/openreveal" rel="noreferrer" target="_blank">
            GitHub
          </a>
        </div>
      </footer>
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
      <div className="join-shell__aura" aria-hidden="true" />
      <section className="join-card">
        <div className="join-card__mark" aria-hidden="true">
          <span />
          <span />
        </div>
        <h1>Enter code</h1>
        <form className="join-form" onSubmit={submitJoinCode}>
          <label htmlFor="receiver-session-code">Session code</label>
          <div className="join-form__row">
            <input
              autoComplete="off"
              autoFocus
              id="receiver-session-code"
              autoCapitalize="characters"
              inputMode="text"
              maxLength={SESSION_CODE_LENGTH + 1}
              onChange={(event) => {
                setJoinCode(normalizeSessionCode(event.target.value));
                setJoinError("");
              }}
              placeholder="ABCD 2345"
              spellCheck={false}
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

function BrandMark() {
  return (
    <svg aria-hidden="true" className="brand-mark" viewBox="0 0 32 32">
      <path d="M7 16c0-5.4 4-9 9-9 4.7 0 8 3 9.2 7.1" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="3.5" />
      <path d="M25 16c0 5.4-4 9-9 9-4.7 0-8-3-9.2-7.1" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="3.5" />
      <circle cx="16" cy="16" fill="currentColor" r="2.6" />
    </svg>
  );
}
