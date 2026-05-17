export function PrivacyRoute() {
  return (
    <main className="policy-shell">
      <section className="policy-panel">
        <p className="eyebrow">OpenReveal safety</p>
        <h1>Privacy and use</h1>
        <p>
          OpenReveal is a consent-based performance tool. It only controls pages
          served by this project that a spectator intentionally opens.
        </p>

        <div className="policy-grid">
          <article>
            <h2>What v1 stores</h2>
            <ul>
              <li>Short-lived performance sessions.</li>
              <li>Receiver connection state and a short user-agent summary.</li>
              <li>Prepared reveal payloads for the active session.</li>
              <li>Sanitized session events for debugging.</li>
            </ul>
          </article>

          <article>
            <h2>What v1 avoids</h2>
            <ul>
              <li>No contacts, photos, microphone, camera, clipboard, or device location access.</li>
              <li>No cloned third-party pages or fake login flows.</li>
              <li>No control over pages outside OpenReveal.</li>
              <li>No native app install for spectators.</li>
            </ul>
          </article>
        </div>

        <div className="policy-callout">
          <h2>Maps and celebrity reveals</h2>
          <p>
            Location reveals use official Google Maps search links only after a
            result is shown. Celebrity reveals are text-only in v1 to avoid image
            licensing risk.
          </p>
        </div>

        <div className="button-row">
          <a className="button button--primary" href="/console">
            Open console
          </a>
          <a className="button" href="/report">
            Report a safety concern
          </a>
        </div>
      </section>
    </main>
  );
}
