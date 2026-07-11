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
          <a href="#flow">How it works</a>
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
              <li>Short-code entry</li>
              <li>Live WebSocket delivery</li>
              <li>Open source</li>
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
              <p className="hero-console-card__code">ARCA 7412</p>
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

        <section className="brand-gallery" aria-label="OpenReveal product screens">
          <figure className="brand-gallery__console">
            <div className="brand-gallery__frame">
              <img
                alt="OpenReveal performer access screen with a passphrase field and a Continue button"
                height="900"
                loading="lazy"
                src="/showcase/console-session.png"
                width="1440"
              />
            </div>
            <figcaption>Private performer access before a session starts.</figcaption>
          </figure>
          <figure className="brand-gallery__phone">
            <div className="brand-gallery__frame">
              <img
                alt="OpenReveal spectator phone with a session-code input and Join button"
                height="1200"
                loading="lazy"
                src="/showcase/receiver-standby.png"
                width="720"
              />
            </div>
            <figcaption>One spectator action: enter the code and join.</figcaption>
          </figure>
          <p className="brand-gallery__note">
            Built around a single-host realtime system, so the same codebase works locally,
            in a rehearsal, or on a small public Cloud Run deployment.
          </p>
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

function BrandMark() {
  return (
    <svg aria-hidden="true" className="brand-mark" viewBox="0 0 32 32">
      <path d="M7 16c0-5.4 4-9 9-9 4.7 0 8 3 9.2 7.1" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="3.5" />
      <path d="M25 16c0 5.4-4 9-9 9-4.7 0-8-3-9.2-7.1" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="3.5" />
      <circle cx="16" cy="16" fill="currentColor" r="2.6" />
    </svg>
  );
}
