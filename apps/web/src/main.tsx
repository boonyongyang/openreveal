import React from "react";
import { createRoot } from "react-dom/client";

import { App } from "./app.js";
import "./styles.css";
import "./revamp.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error("OpenReveal root element missing");
}

createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
