import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { App } from "./App";
import { LanguageProvider } from "./i18n";
import { NotificationProvider } from "./components/ui/NotificationSystem";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <LanguageProvider>
      <NotificationProvider>
        <App />
      </NotificationProvider>
    </LanguageProvider>
  </StrictMode>
);
