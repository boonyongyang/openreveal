import { APP_NAME } from "@openreveal/shared";

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
