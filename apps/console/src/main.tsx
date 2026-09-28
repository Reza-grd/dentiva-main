import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import * as Sentry from "@sentry/react";
import { ToastProvider } from "@dentiva/ui";
import { App } from "./App";
import { AuthProvider } from "./lib/auth";
import { queryClient } from "./lib/query";
import { APP_ENV } from "./lib/supabase";
import "@dentiva/ui/tokens.css";
import "./styles.css";

const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
if (import.meta.env.PROD && dsn) {
  Sentry.init({
    dsn,
    environment: APP_ENV,
    // Console tidak memuat data pasien, tetapi tetap jangan kirim body/headers.
    sendDefaultPii: false,
    beforeSend(event) {
      if (event.request) {
        delete event.request.headers;
        delete event.request.data;
        delete event.request.cookies;
      }
      return event;
    },
  });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ToastProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </ToastProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
