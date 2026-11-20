import * as React from "react";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

import { me } from "../api/me";
import useAuthStore from "../store/auth.store";
import { tokenStore } from "@/lib/auth-token";
import { setSessionExpiredHandler } from "@/lib/api-client";

/**
 * AuthInitializer — renders once at the top of the React tree.
 *
 * Responsibilities:
 *  1. On mount, call GET /auth/me to validate any existing session.
 *     The refreshToken HTTP-only cookie lets the api-client interceptor
 *     silently rotate the access token before this query runs.
 *  2. On success → store the new token and mark status "authenticated".
 *  3. On failure → mark status "unauthenticated".
 *  4. Register the global session-expired handler so the interceptor can
 *     transition auth state when a refresh-token rotation fails mid-session.
 *
 * This component renders nothing (null).
 */
function AuthInitializer() {
  const setAccessToken = useAuthStore((s) => s.setAccessToken);
  const setStatus      = useAuthStore((s) => s.setStatus);
  const logoutStore    = useAuthStore((s) => s.logout);

  // Register the interceptor callback once (runs when refresh token rotation fails)
  useEffect(() => {
    setSessionExpiredHandler(() => {
      tokenStore.set(null);
      logoutStore();
    });
  }, [logoutStore]);

  // Try to restore the session via the refresh-token cookie
  const { isSuccess, isError } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: me,
    retry: false,
    staleTime: Infinity, // don't re-fetch on window focus
    gcTime: Infinity,    // keep the cache entry alive; staleTime already prevents re-fetching
  });

  useEffect(() => {
    if (isSuccess) {
      const token = tokenStore.get();
      if (token) {
        setAccessToken(token);
        setStatus("authenticated");
      } else {
        // /auth/me succeeded but we have no access token in memory — treat as unauthenticated
        setStatus("unauthenticated");
      }
    }
  }, [isSuccess, setAccessToken, setStatus]);

  useEffect(() => {
    if (isError) {
      setStatus("unauthenticated");
    }
  }, [isError, setStatus]);

  return null;
}

export default AuthInitializer;
