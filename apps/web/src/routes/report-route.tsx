const reportUrl = import.meta.env.VITE_ABUSE_REPORT_URL as string | undefined;

export function ReportRoute() {
  return (
    <main className="policy-shell">
      <section className="policy-panel">
        <p className="eyebrow">OpenReveal reports</p>
        <h1>Report a safety concern</h1>
        <p>
          Use this page when a hosted OpenReveal instance appears to be used for
          impersonation, credential capture, hidden tracking, or any routine that
          violates the consent-based project boundary.
        </p>

        <div className="policy-grid">
          <article>
            <h2>Include if available</h2>
            <ul>
              <li>The hosted instance URL.</li>
              <li>The receiver URL or session code.</li>
              <li>Approximate date and time.</li>
              <li>A short description of the concern.</li>
              <li>Screenshots only if they do not expose private data.</li>
            </ul>
          </article>

          <article>
            <h2>Operator action</h2>
            <ul>
              <li>Review the report against the safety boundary.</li>
              <li>Disable abusive public sessions where possible.</li>
              <li>Preserve only sanitized logs needed for investigation.</li>
              <li>Rotate secrets if instance compromise is suspected.</li>
            </ul>
          </article>
        </div>

        <div className="policy-callout">
          <h2>Self-hosted instance</h2>
          <p>
            Operators should configure `VITE_ABUSE_REPORT_URL` to point at their
            public report form, issue tracker, or monitored contact page. Without
            that value, this page remains a visible placeholder and checklist.
          </p>
        </div>

        <div className="button-row">
          {reportUrl ? (
            <a className="button button--primary" href={reportUrl} rel="noreferrer" target="_blank">
              Open report destination
            </a>
          ) : null}
          <a className={reportUrl ? "button" : "button button--primary"} href="/privacy">
            Privacy and safety notes
          </a>
          <a className="button button--quiet" href="/console">
            Open console
          </a>
        </div>
      </section>
    </main>
  );
}
