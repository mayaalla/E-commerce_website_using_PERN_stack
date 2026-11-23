"use client";

import { useEffect } from "react";
import "./globals.css";

export default function GlobalError({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  useEffect(() => {
    console.error("[global-error]", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-foreground antialiased">
        <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center px-6 py-16">
          <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
            MAISON
          </p>
          <h1 className="mt-4 text-3xl font-medium tracking-tight sm:text-4xl">
            Impossible d’ouvrir la boutique
          </h1>
          <p className="mt-4 max-w-xl leading-7 text-muted-foreground">
            Une erreur est survenue lors du chargement de la page. Veuillez réessayer.
          </p>
          <button
            className="mt-8 h-12 w-fit bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
            onClick={() => retry()}
            type="button"
          >
            Réessayer
          </button>
        </main>
      </body>
    </html>
  );
}
