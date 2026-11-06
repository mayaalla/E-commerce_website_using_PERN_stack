import * as React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";

import useAuthStore from "../store/auth.store";

/**
 * AuthGuard — protects routes that require authentication.
 *
 * Behaviour by auth status:
 *  "checking"        → shows a full-screen spinner (session is being restored)
 *  "unauthenticated" → redirects to /auth (preserves the intended location)
 *  "authenticated"   → renders children
 *
 * Usage:
 *   <AuthGuard>
 *     <Dashboard />
 *   </AuthGuard>
 */
function AuthGuard({ children }) {
  const status   = useAuthStore((s) => s.status);
  const location = useLocation();

  if (status === "checking") {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center gap-3 text-muted-foreground"
        aria-label="Loading session…"
        aria-live="polite"
      >
        <Loader2 className="size-8 animate-spin text-primary" />
        <span className="text-sm">Loading…</span>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <Navigate
        to="/auth"
        state={{ from: location }}
        replace
      />
    );
  }

  return children;
}

export default AuthGuard;
