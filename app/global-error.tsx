"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

// Catches errors thrown in app/layout.tsx itself (e.g. provider crashes).
// Must include its own <html> and <body> because the root layout is unavailable.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>TWU Local 106 Connect — Error</title>
      </head>
      <body
        style={{
          margin: 0,
          background: "#1A1F4D",
          fontFamily: "system-ui, sans-serif",
          display: "flex",
          minHeight: "100vh",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px 20px",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            maxWidth: 360,
            width: "100%",
            textAlign: "center",
            color: "#fff",
          }}
        >
          <div style={{ fontSize: 48, marginBottom: 16 }}>👷</div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 12px" }}>
            TWU Local 106 Connect is having trouble
          </h1>
          <p
            style={{
              fontSize: 14,
              color: "rgba(255,255,255,.6)",
              margin: "0 0 28px",
              lineHeight: 1.6,
            }}
          >
            A critical error occurred. Please refresh the page or come back in
            a moment.
          </p>
          <button
            onClick={reset}
            style={{
              padding: "14px 28px",
              borderRadius: 14,
              border: "none",
              cursor: "pointer",
              background: "#AD1B27",
              fontSize: 15,
              fontWeight: 700,
              color: "#FFFFFF",
            }}
          >
            Refresh
          </button>
        </div>
      </body>
    </html>
  );
}
