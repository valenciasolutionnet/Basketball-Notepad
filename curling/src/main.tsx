import { lazy, StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { AccessGate } from "./components/AccessGate";
import { useNotepad } from "./store";
import { seedDemoIfEmpty } from "./lib/demo";
import "./index.css";

// Demo deployments open with a sample team; real ones start empty.
seedDemoIfEmpty(useNotepad, location.hostname);

const AdminPage = lazy(() => import("./components/AdminPage"));
const isAdmin = new URLSearchParams(location.search).has("admin");

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {isAdmin ? (
      <Suspense fallback={null}>
        <AdminPage />
      </Suspense>
    ) : (
      <AccessGate>
        <App />
      </AccessGate>
    )}
  </StrictMode>,
);

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* offline support is best-effort */
    });
  });
}
